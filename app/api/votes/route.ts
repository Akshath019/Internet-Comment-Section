import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import { wilsonScore } from '@/lib/wilson-score'

const schema = z.object({
  commentId: z.string().min(1),
  value: z.union([z.literal(1), z.literal(-1)]),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { commentId, value } = parsed.data
    const userId = session.user!.id

    const existing = await db.vote.findUnique({
      where: { userId_commentId: { userId, commentId } },
    })

    let userVote: number | null = null

    await db.$transaction(async tx => {
      const comment = await tx.comment.findUnique({ where: { id: commentId } })
      if (!comment) throw new Error('Comment not found')

      let upDelta = 0
      let downDelta = 0

      if (existing) {
        if (existing.value === value) {
          // Toggle off — remove vote
          await tx.vote.delete({ where: { userId_commentId: { userId, commentId } } })
          upDelta = value === 1 ? -1 : 0
          downDelta = value === -1 ? -1 : 0
          userVote = null
        } else {
          // Switch vote direction
          await tx.vote.update({ where: { userId_commentId: { userId, commentId } }, data: { value } })
          upDelta = value === 1 ? 1 : -1
          downDelta = value === -1 ? 1 : -1
          userVote = value
        }
      } else {
        // New vote
        await tx.vote.create({ data: { userId, commentId, value } })
        upDelta = value === 1 ? 1 : 0
        downDelta = value === -1 ? 1 : 0
        userVote = value
      }

      const newUp = Math.max(0, comment.upvotes + upDelta)
      const newDown = Math.max(0, comment.downvotes + downDelta)

      await tx.comment.update({
        where: { id: commentId },
        data: {
          upvotes: newUp,
          downvotes: newDown,
          wilsonScore: wilsonScore(newUp, newDown),
        },
      })
    })

    const updated = await db.comment.findUnique({
      where: { id: commentId },
      select: { upvotes: true, downvotes: true, wilsonScore: true },
    })

    return NextResponse.json({ ...updated, userVote })
  } catch (err) {
    console.error('Vote error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { auth } from '@/auth'

const schema = z.object({
  threadId: z.string().min(1),
  parentId: z.string().nullish(),
  content: z.string().min(1, 'Comment cannot be empty').max(10000).trim(),
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
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { threadId, parentId, content } = parsed.data

    const thread = await db.thread.findUnique({ where: { id: threadId } })
    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    let depth = 0
    let parentPath = ''

    if (parentId) {
      const parent = await db.comment.findUnique({ where: { id: parentId } })
      if (!parent || parent.threadId !== threadId) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
      }
      depth = parent.depth + 1
      parentPath = parent.path
    }

    // Transaction: insert comment then update its own path (race-condition safe)
    const comment = await db.$transaction(async tx => {
      const c = await tx.comment.create({
        data: {
          threadId,
          userId: session.user!.id,
          parentId: parentId ?? null,
          content,
          path: '',
          depth,
        },
      })

      const path = parentId ? `${parentPath}.${c.id}` : c.id

      return tx.comment.update({
        where: { id: c.id },
        data: { path },
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
        },
      })
    })

    await db.thread.update({
      where: { id: threadId },
      data: { commentCount: { increment: 1 } },
    })

    return NextResponse.json(
      {
        comment: {
          ...comment,
          createdAt: comment.createdAt.toISOString(),
          updatedAt: comment.updatedAt.toISOString(),
          userVote: null,
        },
      },
      { status: 201 },
    )
  } catch (err) {
    console.error('Comment POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

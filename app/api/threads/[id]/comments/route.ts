import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import type { FlatComment } from '@/types'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: threadId } = await params
  const session = await auth()
  const currentUserId = session?.user?.id

  const thread = await db.thread.findUnique({ where: { id: threadId } })
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  const rawComments = await db.comment.findMany({
    where: { threadId },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  let voteMap = new Map<string, number>()
  if (currentUserId) {
    const votes = await db.vote.findMany({
      where: {
        userId: currentUserId,
        commentId: { in: rawComments.map(c => c.id) },
      },
      select: { commentId: true, value: true },
    })
    voteMap = new Map(votes.map(v => [v.commentId, v.value]))
  }

  const comments: FlatComment[] = rawComments.map(c => ({
    id: c.id,
    threadId: c.threadId,
    userId: c.userId,
    parentId: c.parentId,
    content: c.content,
    path: c.path,
    depth: c.depth,
    upvotes: c.upvotes,
    downvotes: c.downvotes,
    wilsonScore: c.wilsonScore,
    isDeleted: c.isDeleted,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    user: c.user
      ? { id: c.user.id, username: c.user.username ?? null, avatarUrl: c.user.avatarUrl ?? null }
      : null,
    userVote: voteMap.get(c.id) ?? null,
  }))

  return NextResponse.json({ comments })
}

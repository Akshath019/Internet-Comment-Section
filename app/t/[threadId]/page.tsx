import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import { buildTree, sortCommentTree } from '@/lib/build-tree'
import ThreadHeader from '@/components/thread/ThreadHeader'
import CommentTree from '@/components/comment/CommentTree'
import CommentForm from '@/components/comment/CommentForm'
import SortDropdown from '@/components/comment/SortDropdown'
import type { FlatComment, SortMode, ThreadData } from '@/types'

interface Props {
  params: Promise<{ threadId: string }>
  searchParams: Promise<{ sort?: string }>
}

const VALID_SORTS: SortMode[] = ['best', 'top', 'new', 'old', 'controversial']

export async function generateMetadata({ params }: Props) {
  const { threadId } = await params
  const thread = await db.thread.findUnique({ where: { id: threadId } })
  if (!thread) return {}
  return {
    title: thread.title
      ? `${thread.title} — Internet Comment Section`
      : `${thread.domain} — Internet Comment Section`,
  }
}

export default async function ThreadPage({ params, searchParams }: Props) {
  const { threadId } = await params
  const { sort = 'best' } = await searchParams

  const sortMode = (VALID_SORTS.includes(sort as SortMode) ? sort : 'best') as SortMode

  const session = await auth()
  const currentUserId = (session?.user as { id?: string })?.id ?? undefined

  const thread = await db.thread.findUnique({ where: { id: threadId } })
  if (!thread) notFound()

  const rawComments = await db.comment.findMany({
    where: { threadId },
    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  })

  let voteMap = new Map<string, number>()
  if (currentUserId) {
    const votes = await db.vote.findMany({
      where: { userId: currentUserId, commentId: { in: rawComments.map(c => c.id) } },
      select: { commentId: true, value: true },
    })
    voteMap = new Map(votes.map(v => [v.commentId, v.value]))
  }

  const flat: FlatComment[] = rawComments.map(c => ({
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
    user: c.user ? { id: c.user.id, username: c.user.username ?? null, avatarUrl: c.user.avatarUrl ?? null } : null,
    userVote: voteMap.get(c.id) ?? null,
  }))

  const tree = buildTree(flat)
  sortCommentTree(tree, sortMode)

  const threadData: ThreadData = {
    id: thread.id,
    normalizedUrl: thread.normalizedUrl,
    originalUrl: thread.originalUrl,
    domain: thread.domain,
    title: thread.title,
    ogImage: thread.ogImage,
    commentCount: thread.commentCount,
    createdAt: thread.createdAt.toISOString(),
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '16px' }}>
      {/* Back */}
      <div style={{ marginBottom: '12px', fontSize: '12px' }}>
        <Link href="/explore" style={{ color: '#888' }}>
          ← all threads
        </Link>
      </div>

      {/* Thread info */}
      <ThreadHeader thread={threadData} />

      {/* Sort + count bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 0',
          borderBottom: '1px solid #e8e8e8',
          marginBottom: '12px',
        }}
      >
        <span style={{ fontSize: '12px', color: '#888' }}>
          <strong style={{ color: '#222' }}>{thread.commentCount}</strong>{' '}
          comment{thread.commentCount !== 1 ? 's' : ''}
        </span>
        <SortDropdown currentSort={sortMode} />
      </div>

      {/* New comment form */}
      <CommentForm threadId={threadId} parentId={null} currentUserId={currentUserId ?? null} />

      {/* Comment tree */}
      <CommentTree comments={tree} threadId={threadId} currentUserId={currentUserId ?? null} />
    </div>
  )
}

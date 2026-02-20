import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  return { title: `${username} — Internet Comment Section` }
}

export default async function UserPage({ params }: Props) {
  const { username } = await params

  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      createdAt: true,
      comments: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { thread: { select: { id: true, domain: true, title: true, normalizedUrl: true } } },
      },
    },
  })

  if (!user) notFound()

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Profile header */}
      <div style={{ borderBottom: '2px solid #1a5276', paddingBottom: '12px', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#1a5276', margin: 0 }}>
          {user.username}
        </h1>
        <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>
          joined {formatDistanceToNow(user.createdAt, { addSuffix: true })} ·{' '}
          {user.comments.length} comment{user.comments.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Comment history */}
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.05em' }}>
        COMMENT HISTORY
      </div>

      {user.comments.length === 0 ? (
        <p style={{ color: '#888', fontSize: '13px' }}>No comments yet.</p>
      ) : (
        <div>
          {user.comments.map(comment => (
            <div
              key={comment.id}
              style={{
                borderBottom: '1px solid #e8e8e8',
                padding: '10px 0',
              }}
            >
              {/* Thread context */}
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                <span
                  style={{
                    background: '#e8e8e8',
                    padding: '1px 5px',
                    marginRight: '6px',
                    fontSize: '10px',
                  }}
                >
                  {comment.thread.domain}
                </span>
                <Link
                  href={`/t/${comment.thread.id}`}
                  style={{ color: '#1a5276', textDecoration: 'none' }}
                >
                  {(comment.thread.title ?? comment.thread.normalizedUrl).slice(0, 60)}
                  {(comment.thread.title ?? comment.thread.normalizedUrl).length > 60 ? '…' : ''}
                </Link>
              </div>

              {/* Comment content */}
              <p
                style={{
                  fontSize: '13px',
                  lineHeight: 1.5,
                  margin: '0 0 4px',
                  color: '#222',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {(comment.content ?? '').length > 300
                  ? (comment.content ?? '').slice(0, 300) + '…'
                  : comment.content}
              </p>

              {/* Meta */}
              <div style={{ fontSize: '11px', color: '#888' }}>
                <span style={{ color: '#27ae60' }}>▲ {comment.upvotes}</span>
                {'  '}
                <span style={{ color: '#c0392b' }}>▼ {comment.downvotes}</span>
                {'  '}
                <span title={comment.createdAt.toISOString()}>
                  {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                </span>
                {'  '}
                <Link href={`/t/${comment.thread.id}`} style={{ color: '#1a5276' }}>
                  [context]
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

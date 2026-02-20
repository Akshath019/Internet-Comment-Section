import Link from 'next/link'
import type { ThreadData } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  thread: ThreadData
  rank: number
}

export default function ThreadCard({ thread, rank }: Props) {
  const title = thread.title ?? thread.normalizedUrl

  return (
    <tr
      style={{
        borderBottom: '1px solid #e8e8e8',
        backgroundColor: rank % 2 === 0 ? '#f6f6f6' : '#fff',
      }}
    >
      <td
        style={{
          padding: '8px 12px',
          color: '#888',
          fontSize: '12px',
          width: '40px',
          textAlign: 'right',
        }}
      >
        {rank}
      </td>
      <td style={{ padding: '8px 12px', width: '120px' }}>
        <span
          style={{
            fontSize: '11px',
            color: '#888',
            background: '#e8e8e8',
            padding: '1px 5px',
          }}
        >
          {thread.domain}
        </span>
      </td>
      <td style={{ padding: '8px 12px' }}>
        <Link
          href={`/t/${thread.id}`}
          style={{
            color: '#1a5276',
            textDecoration: 'none',
            fontSize: '13px',
          }}
        >
          {title.length > 80 ? title.slice(0, 80) + '…' : title}
        </Link>
        <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
          <a
            href={thread.normalizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#aaa' }}
          >
            {thread.normalizedUrl.length > 60
              ? thread.normalizedUrl.slice(0, 60) + '…'
              : thread.normalizedUrl}
          </a>
        </div>
      </td>
      <td
        style={{
          padding: '8px 12px',
          textAlign: 'right',
          fontSize: '12px',
          color: thread.commentCount > 0 ? '#1a5276' : '#888',
          fontWeight: thread.commentCount > 0 ? 700 : 400,
          width: '80px',
          whiteSpace: 'nowrap',
        }}
      >
        {thread.commentCount}
      </td>
      <td
        style={{
          padding: '8px 12px',
          fontSize: '11px',
          color: '#888',
          whiteSpace: 'nowrap',
          width: '100px',
        }}
      >
        {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
      </td>
    </tr>
  )
}

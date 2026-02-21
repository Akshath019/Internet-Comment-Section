import type { ThreadData } from '@/types'

interface Props {
  thread: ThreadData
}

export default function ThreadHeader({ thread }: Props) {
  return (
    <div
      style={{
        borderBottom: '2px solid #1a5276',
        paddingBottom: '12px',
        marginBottom: '12px',
      }}
    >
      {/* Domain tag */}
      <div style={{ marginBottom: '6px' }}>
        <span
          style={{
            fontSize: '11px',
            background: '#1a5276',
            color: '#fff',
            padding: '2px 8px',
            letterSpacing: '0.05em',
          }}
        >
          {thread.domain}
        </span>
      </div>

      {/* Title */}
      {thread.title && (
        <h1
          style={{
            fontSize: '16px',
            fontWeight: 700,
            margin: '4px 0',
            color: '#222',
            lineHeight: 1.3,
          }}
        >
          {thread.title}
        </h1>
      )}

      {/* URL */}
      <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', wordBreak: 'break-all' }}>
        <a
          href={thread.normalizedUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#1a5276' }}
        >
          {thread.normalizedUrl}
        </a>
      </div>
    </div>
  )
}

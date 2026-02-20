import { db } from '@/lib/db'
import UrlInputForm from '@/components/thread/UrlInputForm'
import ThreadCard from '@/components/thread/ThreadCard'
import type { ThreadData } from '@/types'

export default async function HomePage() {
  const recent = await db.thread.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const threads: ThreadData[] = recent.map(t => ({
    id: t.id,
    normalizedUrl: t.normalizedUrl,
    originalUrl: t.originalUrl,
    domain: t.domain,
    title: t.title,
    ogImage: t.ogImage,
    commentCount: t.commentCount,
    createdAt: t.createdAt.toISOString(),
  }))

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1
          style={{
            fontSize: '18px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            marginBottom: '6px',
            color: '#1a5276',
          }}
        >
          INTERNET COMMENT SECTION
        </h1>
        <p style={{ fontSize: '12px', color: '#888', marginBottom: '20px' }}>
          paste any URL · discuss anything · no algorithm
        </p>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <UrlInputForm />
        </div>
      </div>

      {/* Recent threads */}
      {threads.length > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid #1a5276',
              paddingBottom: '4px',
              marginBottom: '0',
            }}
          >
            <span style={{ fontSize: '12px', color: '#1a5276', fontWeight: 700, letterSpacing: '0.05em' }}>
              RECENT THREADS
            </span>
            <a href="/explore" style={{ fontSize: '11px', color: '#888' }}>
              view all →
            </a>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f6f6f6', borderBottom: '1px solid #ccc' }}>
                <th style={{ padding: '6px 12px', textAlign: 'right', width: '40px', fontSize: '11px', color: '#888', fontWeight: 400 }}>#</th>
                <th style={{ padding: '6px 12px', textAlign: 'left', width: '120px', fontSize: '11px', color: '#888', fontWeight: 400 }}>domain</th>
                <th style={{ padding: '6px 12px', textAlign: 'left', fontSize: '11px', color: '#888', fontWeight: 400 }}>title / url</th>
                <th style={{ padding: '6px 12px', textAlign: 'right', width: '80px', fontSize: '11px', color: '#888', fontWeight: 400 }}>comments</th>
                <th style={{ padding: '6px 12px', textAlign: 'left', width: '100px', fontSize: '11px', color: '#888', fontWeight: 400 }}>posted</th>
              </tr>
            </thead>
            <tbody>
              {threads.map((thread, i) => (
                <ThreadCard key={thread.id} thread={thread} rank={i + 1} />
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

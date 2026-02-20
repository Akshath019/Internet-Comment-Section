import { db } from '@/lib/db'
import ThreadCard from '@/components/thread/ThreadCard'
import UrlInputForm from '@/components/thread/UrlInputForm'
import type { ThreadData } from '@/types'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ sort?: string; domain?: string; page?: string }>
}

export default async function ExplorePage({ searchParams }: Props) {
  const { sort = 'new', domain, page = '1' } = await searchParams
  const pageNum = Math.max(1, Number(page))
  const limit = 30

  const validSort = ['new', 'comments'].includes(sort) ? sort : 'new'
  const where = domain ? { domain } : {}

  const orderBy =
    validSort === 'comments'
      ? { commentCount: 'desc' as const }
      : { createdAt: 'desc' as const }

  const [threads, total, domains] = await Promise.all([
    db.thread.findMany({
      where,
      orderBy,
      take: limit,
      skip: (pageNum - 1) * limit,
    }),
    db.thread.count({ where }),
    db.thread.groupBy({
      by: ['domain'],
      _count: { domain: true },
      orderBy: { _count: { domain: 'desc' } },
      take: 20,
    }),
  ])

  const threadData: ThreadData[] = threads.map(t => ({
    id: t.id,
    normalizedUrl: t.normalizedUrl,
    originalUrl: t.originalUrl,
    domain: t.domain,
    title: t.title,
    ogImage: t.ogImage,
    commentCount: t.commentCount,
    createdAt: t.createdAt.toISOString(),
  }))

  const totalPages = Math.ceil(total / limit)

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>
      {/* URL form */}
      <div style={{ marginBottom: '24px', maxWidth: '600px' }}>
        <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
          paste a URL to find or start a discussion:
        </p>
        <UrlInputForm />
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #1a5276',
          paddingBottom: '6px',
          marginBottom: '0',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '12px', color: '#1a5276', fontWeight: 700, letterSpacing: '0.05em' }}>
          ALL THREADS ({total.toLocaleString()})
        </span>

        {/* Sort */}
        <span style={{ fontSize: '12px', color: '#888', display: 'flex', gap: '8px' }}>
          sort:
          <Link
            href={`/explore?sort=new${domain ? `&domain=${domain}` : ''}`}
            style={{ color: validSort === 'new' ? '#1a5276' : '#888', fontWeight: validSort === 'new' ? 700 : 400 }}
          >
            new
          </Link>
          <Link
            href={`/explore?sort=comments${domain ? `&domain=${domain}` : ''}`}
            style={{ color: validSort === 'comments' ? '#1a5276' : '#888', fontWeight: validSort === 'comments' ? 700 : 400 }}
          >
            most comments
          </Link>
        </span>
      </div>

      {/* Domain filters */}
      {domains.length > 0 && (
        <div style={{ padding: '8px 0', borderBottom: '1px solid #e8e8e8', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#888' }}>filter:</span>
          {domain && (
            <Link
              href={`/explore?sort=${validSort}`}
              style={{ fontSize: '11px', background: '#1a5276', color: '#fff', padding: '1px 7px', textDecoration: 'none' }}
            >
              ✕ {domain}
            </Link>
          )}
          {domains.slice(0, 12).map(d => (
            <Link
              key={d.domain}
              href={`/explore?sort=${validSort}&domain=${d.domain}`}
              style={{
                fontSize: '11px',
                background: domain === d.domain ? '#1a5276' : '#e8e8e8',
                color: domain === d.domain ? '#fff' : '#444',
                padding: '1px 7px',
                textDecoration: 'none',
              }}
            >
              {d.domain} ({d._count.domain})
            </Link>
          ))}
        </div>
      )}

      {/* Table */}
      {threadData.length > 0 ? (
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
            {threadData.map((thread, i) => (
              <ThreadCard key={thread.id} thread={thread} rank={(pageNum - 1) * limit + i + 1} />
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ padding: '32px 0', textAlign: 'center', color: '#888', fontSize: '13px' }}>
          No threads yet.{' '}
          <Link href="/" style={{ color: '#1a5276' }}>
            Be the first →
          </Link>
        </p>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', fontSize: '12px', justifyContent: 'center' }}>
          {pageNum > 1 && (
            <Link href={`/explore?sort=${validSort}${domain ? `&domain=${domain}` : ''}&page=${pageNum - 1}`} style={{ color: '#1a5276', border: '1px solid #ccc', padding: '3px 10px', textDecoration: 'none' }}>
              ← prev
            </Link>
          )}
          <span style={{ color: '#888', padding: '3px 0' }}>
            page {pageNum} of {totalPages}
          </span>
          {pageNum < totalPages && (
            <Link href={`/explore?sort=${validSort}${domain ? `&domain=${domain}` : ''}&page=${pageNum + 1}`} style={{ color: '#1a5276', border: '1px solid #ccc', padding: '3px 10px', textDecoration: 'none' }}>
              next →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

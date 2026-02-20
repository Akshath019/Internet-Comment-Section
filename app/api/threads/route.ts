import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { normalizeUrl, hashUrl, extractDomain } from '@/lib/normalize-url'
import { fetchOgMeta, type OgMeta } from '@/lib/og-fetch'

const schema = z.object({ url: z.string().url() })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const normalized = normalizeUrl(parsed.data.url)
    if (!normalized) {
      return NextResponse.json({ error: 'Could not normalize URL' }, { status: 400 })
    }

    const urlHash = hashUrl(normalized)

    const existing = await db.thread.findUnique({ where: { urlHash } })
    if (existing) {
      return NextResponse.json({ thread: existing, created: false })
    }

    const domain = extractDomain(normalized)
    const meta = await fetchOgMeta(normalized).catch((): OgMeta => ({}))

    const thread = await db.thread.create({
      data: {
        normalizedUrl: normalized,
        urlHash,
        originalUrl: parsed.data.url,
        domain,
        title: meta.title ?? null,
        ogImage: meta.image ?? null,
      },
    })

    return NextResponse.json({ thread, created: true }, { status: 201 })
  } catch (err) {
    console.error('Thread error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sort = searchParams.get('sort') ?? 'new'
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = 30
  const domain = searchParams.get('domain') ?? undefined

  const where = domain ? { domain } : {}

  const orderBy =
    sort === 'comments'
      ? { commentCount: 'desc' as const }
      : { createdAt: 'desc' as const }

  const [threads, total] = await Promise.all([
    db.thread.findMany({
      where,
      orderBy,
      take: limit,
      skip: (page - 1) * limit,
    }),
    db.thread.count({ where }),
  ])

  return NextResponse.json({ threads, total, page, limit })
}

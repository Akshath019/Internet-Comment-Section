import { createHash } from 'crypto'

const STRIP_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', 'ref', '_ga', 'mc_cid', 'mc_eid',
  'si', 'feature', 'app', 'from', 'igshid', 'twclid',
]

export function normalizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim())

    // Only http/https
    if (!['http:', 'https:'].includes(url.protocol)) return null

    // Force https force https , 
    url.protocol = 'https:'

    // Lowercase host
    url.hostname = url.hostname.toLowerCase()

    // Remove default ports
    if (url.port === '443' || url.port === '80') url.port = ''

    // Remove fragment
    url.hash = ''

    // Remove tracking params
    STRIP_PARAMS.forEach(p => url.searchParams.delete(p))

    // YouTube-specific: youtu.be/ID → youtube.com/watch?v=ID
    if (url.hostname === 'youtu.be') {
      const videoId = url.pathname.slice(1).split('?')[0]
      if (!videoId) return null
      return `https://www.youtube.com/watch?v=${videoId}`
    }

    // YouTube: keep only `v` param, drop t=, list=, index=, pp=, etc.
    if (url.hostname.endsWith('youtube.com') && url.pathname === '/watch') {
      const videoId = url.searchParams.get('v')
      if (!videoId) return null
      return `https://www.youtube.com/watch?v=${videoId}`
    }

    // Remove www
    url.hostname = url.hostname.replace(/^www\./, '')

    // Remove trailing slash (except root)
    if (url.pathname !== '/') {
      url.pathname = url.pathname.replace(/\/+$/, '')
    }

    // Sort remaining params alphabetically for determinism
    url.searchParams.sort()

    return url.toString()
  } catch {
    return null
  }
}

export function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex')
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

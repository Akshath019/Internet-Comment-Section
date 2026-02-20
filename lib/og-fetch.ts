export interface OgMeta {
  title?: string
  image?: string
  description?: string
}

export async function fetchOgMeta(url: string): Promise<OgMeta> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'InternetCommentSection/1.0 (+https://github.com)',
        Accept: 'text/html',
      },
    })
    clearTimeout(timeout)

    if (!res.ok) return {}

    const html = await res.text()

    function getMeta(property: string): string | undefined {
      // Handles both property= and name= attributes in any order
      const patterns = [
        new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
      ]
      for (const re of patterns) {
        const m = html.match(re)
        if (m?.[1]) return m[1].trim()
      }
      return undefined
    }

    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()

    return {
      title: getMeta('og:title') || getMeta('twitter:title') || titleTag,
      image: getMeta('og:image') || getMeta('twitter:image'),
      description: getMeta('og:description') || getMeta('description'),
    }
  } catch {
    return {}
  }
}

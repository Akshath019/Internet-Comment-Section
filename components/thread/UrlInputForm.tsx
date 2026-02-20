'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UrlInputForm() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to create thread')
        return
      }

      router.push(`/t/${data.thread.id}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', gap: '0' }}>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=... or any URL"
          style={{
            flex: 1,
            border: '2px solid #cccccc',
            borderRight: 'none',
            padding: '10px 12px',
            fontSize: '13px',
            fontFamily: 'inherit',
            outline: 'none',
            borderColor: '#1a5276',
          }}
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          style={{
            background: '#1a5276',
            color: '#fff',
            border: '2px solid #1a5276',
            padding: '10px 20px',
            fontSize: '13px',
            fontFamily: 'inherit',
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          {loading ? '...' : 'GO →'}
        </button>
      </div>
      {error && (
        <p style={{ color: '#c0392b', fontSize: '12px', marginTop: '6px' }}>{error}</p>
      )}
    </form>
  )
}

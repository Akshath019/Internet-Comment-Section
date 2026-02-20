'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  threadId: string
  parentId: string | null
  currentUserId?: string | null
  onSuccess?: () => void
  placeholder?: string
}

export default function CommentForm({ threadId, parentId, currentUserId, onSuccess, placeholder }: Props) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  if (!currentUserId) {
    return (
      <div
        style={{
          border: '1px solid #ccc',
          padding: '10px 12px',
          fontSize: '12px',
          color: '#888',
          background: '#f6f6f6',
        }}
      >
        <Link href="/auth/login" style={{ color: '#1a5276' }}>
          log in
        </Link>{' '}
        or{' '}
        <Link href="/auth/signup" style={{ color: '#1a5276' }}>
          register
        </Link>{' '}
        to comment.
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, parentId, content: content.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to post comment')
        return
      }

      setContent('')
      onSuccess?.()
      router.refresh() // re-run server component to show new comment
    } catch {
      setError('Network error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={placeholder ?? 'Write a comment...'}
        rows={parentId ? 3 : 4}
        style={{
          width: '100%',
          border: '1px solid #ccc',
          padding: '8px 10px',
          fontSize: '13px',
          fontFamily: 'inherit',
          resize: 'vertical',
          outline: 'none',
          display: 'block',
        }}
        disabled={submitting}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          style={{
            background: '#1a5276',
            color: '#fff',
            border: 'none',
            padding: '5px 14px',
            fontSize: '12px',
            fontFamily: 'inherit',
            cursor: submitting || !content.trim() ? 'not-allowed' : 'pointer',
            opacity: submitting || !content.trim() ? 0.6 : 1,
          }}
        >
          {submitting ? 'posting...' : parentId ? 'reply' : 'comment'}
        </button>
        {error && <span style={{ color: '#c0392b', fontSize: '12px' }}>{error}</span>}
      </div>
    </form>
  )
}

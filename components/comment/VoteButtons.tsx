'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  commentId: string
  upvotes: number
  downvotes: number
  userVote: number | null
  currentUserId?: string | null
}

export default function VoteButtons({ commentId, upvotes: initUp, downvotes: initDown, userVote: initVote, currentUserId }: Props) {
  const router = useRouter()
  const [up, setUp] = useState(initUp)
  const [down, setDown] = useState(initDown)
  const [vote, setVote] = useState<number | null>(initVote)
  const [busy, setBusy] = useState(false)

  const score = up - down

  async function cast(value: 1 | -1) {
    if (!currentUserId) {
      router.push('/auth/login')
      return
    }
    if (busy) return
    setBusy(true)

    // Optimistic
    const prevUp = up
    const prevDown = down
    const prevVote = vote
    const newVote = vote === value ? null : value
    const upDelta = (newVote === 1 ? 1 : 0) - (vote === 1 ? 1 : 0)
    const downDelta = (newVote === -1 ? 1 : 0) - (vote === -1 ? 1 : 0)
    setUp(up + upDelta)
    setDown(down + downDelta)
    setVote(newVote)

    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, value }),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setUp(data.upvotes)
      setDown(data.downvotes)
      setVote(data.userVote)
    } catch {
      setUp(prevUp)
      setDown(prevDown)
      setVote(prevVote)
    } finally {
      setBusy(false)
    }
  }

  const scoreColor = score > 0 ? '#27ae60' : score < 0 ? '#c0392b' : '#888'

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '12px' }}>
      <button
        onClick={() => cast(1)}
        disabled={busy}
        title="upvote"
        style={{
          background: 'none',
          border: 'none',
          cursor: busy ? 'wait' : 'pointer',
          color: vote === 1 ? '#27ae60' : '#888',
          padding: '0 2px',
          fontFamily: 'inherit',
          fontSize: '12px',
          fontWeight: vote === 1 ? 700 : 400,
        }}
      >
        ▲
      </button>
      <span style={{ color: scoreColor, fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>
        {score}
      </span>
      <button
        onClick={() => cast(-1)}
        disabled={busy}
        title="downvote"
        style={{
          background: 'none',
          border: 'none',
          cursor: busy ? 'wait' : 'pointer',
          color: vote === -1 ? '#c0392b' : '#888',
          padding: '0 2px',
          fontFamily: 'inherit',
          fontSize: '12px',
          fontWeight: vote === -1 ? 700 : 400,
        }}
      >
        ▼
      </button>
    </span>
  )
}

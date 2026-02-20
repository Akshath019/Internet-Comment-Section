'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import type { Session } from 'next-auth'

export default function NavActions({ session }: { session: Session | null }) {
  if (!session?.user) {
    return (
      <span style={{ display: 'flex', gap: '8px' }}>
        <Link
          href="/auth/login"
          style={{
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.4)',
            padding: '2px 8px',
            textDecoration: 'none',
            fontSize: '12px',
          }}
        >
          log in
        </Link>
        <Link
          href="/auth/signup"
          style={{
            color: '#1a5276',
            background: '#fff',
            padding: '2px 8px',
            textDecoration: 'none',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          register
        </Link>
      </span>
    )
  }

  const username = (session.user as { username?: string | null }).username ?? session.user.email

  return (
    <span style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <Link
        href={`/u/${(session.user as { username?: string | null }).username ?? ''}`}
        style={{ color: '#fff', textDecoration: 'none', fontWeight: 700 }}
      >
        {username}
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.4)',
          color: '#cce5ff',
          cursor: 'pointer',
          padding: '2px 8px',
          fontSize: '12px',
          fontFamily: 'inherit',
        }}
      >
        logout
      </button>
    </span>
  )
}

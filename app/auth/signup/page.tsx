'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Registration failed')
      setLoading(false)
      return
    }

    // Auto-login after signup
    const loginRes = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (loginRes?.error) {
      router.push('/auth/login')
      return
    }

    router.push('/')
    router.refresh()
  }

  async function handleGoogle() {
    await signIn('google', { callbackUrl: '/' })
  }

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '0 16px' }}>
      {/* Header */}
      <div style={{ borderBottom: '2px solid #1a5276', paddingBottom: '8px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#1a5276', margin: 0, letterSpacing: '0.05em' }}>
          CREATE ACCOUNT
        </h1>
      </div>

      {/* Google */}
      <button
        onClick={handleGoogle}
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #ccc',
          background: '#f6f6f6',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '13px',
          marginBottom: '16px',
        }}
      >
        G &nbsp; continue with Google
      </button>

      <div style={{ textAlign: 'center', color: '#888', fontSize: '11px', marginBottom: '16px' }}>
        — or create with email —
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>
            USERNAME{' '}
            <span style={{ fontWeight: 400, fontSize: '11px' }}>
              (3–20 chars, letters/numbers/_/-)
            </span>
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_-]+"
            style={{
              width: '100%',
              border: '1px solid #ccc',
              padding: '8px 10px',
              fontSize: '13px',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>
            EMAIL
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              border: '1px solid #ccc',
              padding: '8px 10px',
              fontSize: '13px',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>
            PASSWORD{' '}
            <span style={{ fontWeight: 400, fontSize: '11px' }}>(min 8 chars)</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            style={{
              width: '100%',
              border: '1px solid #ccc',
              padding: '8px 10px',
              fontSize: '13px',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <p style={{ color: '#c0392b', fontSize: '12px', marginBottom: '12px' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            background: '#1a5276',
            color: '#fff',
            border: 'none',
            padding: '10px',
            fontSize: '13px',
            fontFamily: 'inherit',
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            letterSpacing: '0.05em',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'creating account...' : 'CREATE ACCOUNT'}
        </button>
      </form>

      <p style={{ fontSize: '12px', color: '#888', marginTop: '16px', textAlign: 'center' }}>
        already registered?{' '}
        <Link href="/auth/login" style={{ color: '#1a5276' }}>
          log in
        </Link>
      </p>
    </div>
  )
}

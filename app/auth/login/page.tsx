'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  async function handleGoogle() {
    await signIn('google', { callbackUrl })
  }

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '0 16px' }}>
      {/* Header */}
      <div style={{ borderBottom: '2px solid #1a5276', paddingBottom: '8px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#1a5276', margin: 0, letterSpacing: '0.05em' }}>
          LOG IN
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <span>G</span> continue with Google
      </button>

      <div style={{ textAlign: 'center', color: '#888', fontSize: '11px', marginBottom: '16px' }}>
        — or —
      </div>

      {/* Credentials form */}
      <form onSubmit={handleSubmit}>
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
            PASSWORD
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
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
          {loading ? 'logging in...' : 'LOG IN'}
        </button>
      </form>

      <p style={{ fontSize: '12px', color: '#888', marginTop: '16px', textAlign: 'center' }}>
        no account?{' '}
        <Link href="/auth/signup" style={{ color: '#1a5276' }}>
          register
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

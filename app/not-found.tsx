import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ maxWidth: '600px', margin: '60px auto', padding: '0 16px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '48px', fontWeight: 700, color: '#cccccc', margin: '0 0 8px' }}>404</h1>
      <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>
        this page does not exist.
      </p>
      <Link href="/" style={{ color: '#1a5276', fontSize: '13px' }}>
        ← go home
      </Link>
    </div>
  )
}

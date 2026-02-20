import Link from 'next/link'
import type { Session } from 'next-auth'
import NavActions from './NavActions'

interface Props {
  session: Session | null
}

export default function Navbar({ session }: Props) {
  return (
    <header
      style={{
        borderBottom: '2px solid #1a5276',
        backgroundColor: '#1a5276',
        color: '#fff',
      }}
    >
      <div
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '40px',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: '13px',
            letterSpacing: '0.05em',
            textDecoration: 'none',
          }}
        >
          INTERNET COMMENT SECTION
        </Link>

        {/* Nav links + auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
          <Link href="/explore" style={{ color: '#cce5ff', textDecoration: 'none' }}>
            explore
          </Link>
          <Link href="/" style={{ color: '#cce5ff', textDecoration: 'none' }}>
            join / create
          </Link>
          <NavActions session={session} />
        </div>
      </div>
    </header>
  )
}

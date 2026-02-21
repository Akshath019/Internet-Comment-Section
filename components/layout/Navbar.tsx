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
          minWidth: 0,
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
            flexShrink: 0,
          }}
        >
          {/* Full title on desktop */}
          <span className="mobile-hide">INTERNET COMMENT SECTION</span>
          {/* Abbreviated on mobile */}
          <span className="mobile-only">ICS</span>
        </Link>

        {/* Nav links + auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', minWidth: 0 }}>
          <Link href="/explore" className="mobile-hide" style={{ color: '#cce5ff', textDecoration: 'none' }}>
            explore
          </Link>
          <Link href="/" className="mobile-hide" style={{ color: '#cce5ff', textDecoration: 'none' }}>
            join / create
          </Link>
          <NavActions session={session} />
        </div>
      </div>
    </header>
  )
}

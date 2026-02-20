'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { SortMode } from '@/types'

const OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'best', label: 'best' },
  { value: 'top', label: 'top' },
  { value: 'new', label: 'new' },
  { value: 'old', label: 'old' },
  { value: 'controversial', label: 'controversial' },
]

export default function SortDropdown({ currentSort }: { currentSort: SortMode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', e.target.value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <span style={{ fontSize: '12px', color: '#888' }}>
      sort:{' '}
      <select
        value={currentSort}
        onChange={handleChange}
        style={{
          fontFamily: 'inherit',
          fontSize: '12px',
          border: '1px solid #ccc',
          padding: '2px 4px',
          background: '#fff',
          color: '#1a5276',
          cursor: 'pointer',
        }}
      >
        {OPTIONS.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  )
}

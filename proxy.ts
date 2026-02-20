import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Pass-through proxy. Auth is handled per-route via `await auth()` in server components.
export function proxy(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
}

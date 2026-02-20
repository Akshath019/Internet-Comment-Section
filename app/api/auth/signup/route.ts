import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username: letters, numbers, _ and - only'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const { email, password, username } = parsed.data

    const [emailExists, usernameExists] = await Promise.all([
      db.user.findUnique({ where: { email } }),
      db.user.findUnique({ where: { username } }),
    ])

    if (emailExists) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }
    if (usernameExists) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await db.user.create({
      data: { email, username, passwordHash, name: username },
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error('Signup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

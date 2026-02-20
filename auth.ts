import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import GitHub from 'next-auth/providers/github'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

async function ensureUsername(userId: string, hint: string): Promise<string | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { username: true } })
  if (user?.username) return user.username

  // hint is GitHub username or email prefix — clean it up
  const base = hint
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 15) || 'user'

  let username = base
  let i = 0
  while (await db.user.findFirst({ where: { username } })) {
    username = `${base}${++i}`
  }

  await db.user.update({ where: { id: userId }, data: { username } })
  return username
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Credentials({
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const user = await db.user.findUnique({ where: { email } })
        if (!user?.passwordHash) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.username ?? email }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, profile }) {
      if (user?.id) {
        token.sub = user.id
        // Use GitHub username if available, otherwise fall back to email prefix
        const hint = (profile as { login?: string })?.login ?? user.email ?? ''
        const username = await ensureUsername(user.id, hint)
        token.username = username as string | null
      }
      return token
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      const uname = (token as { username?: string | null }).username
      if (uname !== undefined) {
        ;(session.user as { username?: string | null }).username = uname ?? null
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/login',
  },
})

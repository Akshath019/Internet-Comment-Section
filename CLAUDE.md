# CLAUDE.md — Project Context for Claude Code

This file tells Claude Code everything about this project so it can help you effectively.

---

## What this project is

**Internet Comment Section** — a universal discussion layer for any URL on the internet.
- Paste any link → creates a thread → anyone can read comments (no login needed)
- Must be logged in to post a comment
- Reddit-style threaded comments with collapse/expand, voting, and sorting
- Old-school Codeforces-style UI: monospace font, dense tables, no rounded corners

---

## Tech Stack

| Thing            | What we use                  | Version     |
|------------------|------------------------------|-------------|
| Framework        | Next.js (App Router)         | 16.1.6      |
| Language         | TypeScript                   | 5.9.3       |
| Styling          | Tailwind CSS                 | v4.1        |
| Database         | PostgreSQL (Railway)         | 16.x        |
| ORM              | Prisma                       | 6.x         |
| Auth             | NextAuth v5 (Auth.js)        | 5.x beta    |
| Hosting (app)    | Vercel                       |             |
| Hosting (DB)     | Railway                      |             |
| Validation       | Zod                          | 3.x         |

---

## Project File Map

```
/
├── app/                          ← All Next.js pages and API routes
│   ├── page.tsx                  ← Homepage (URL input + recent threads table)
│   ├── explore/page.tsx          ← All threads, sortable, filterable by domain
│   ├── t/[threadId]/page.tsx     ← Thread page (comment tree + sort dropdown)
│   ├── u/[username]/page.tsx     ← User profile + comment history
│   ├── auth/
│   │   ├── login/page.tsx        ← Login form (email/pass + Google)
│   │   └── signup/page.tsx       ← Signup form
│   └── api/
│       ├── auth/[...nextauth]/   ← NextAuth route handler
│       ├── auth/signup/          ← POST: create new user account
│       ├── threads/              ← POST: create/fetch thread by URL | GET: list threads
│       ├── threads/[id]/comments/← GET: fetch all comments for a thread
│       ├── comments/             ← POST: create a comment
│       ├── comments/[id]/        ← PUT: edit | DELETE: soft-delete
│       └── votes/                ← POST: cast/toggle vote
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx            ← Top nav bar (server component)
│   │   └── NavActions.tsx        ← Login/logout buttons (client component)
│   ├── thread/
│   │   ├── UrlInputForm.tsx      ← URL paste box on homepage
│   │   ├── ThreadCard.tsx        ← One row in the threads table
│   │   └── ThreadHeader.tsx      ← Thread title/URL/domain header on thread page
│   └── comment/
│       ├── CommentTree.tsx       ← Root wrapper, maps over root comments
│       ├── CommentNode.tsx       ← Single comment: collapse, vote, reply, edit, delete
│       ├── CommentForm.tsx       ← New comment / reply textarea
│       ├── VoteButtons.tsx       ← ▲/▼ with optimistic updates
│       └── SortDropdown.tsx      ← Sort mode selector (best/top/new/old/controversial)
│
├── lib/
│   ├── db.ts                     ← Prisma singleton (serverless-safe global)
│   ├── auth.ts                   ← NextAuth config (at project root, not in lib/)
│   ├── normalize-url.ts          ← URL normalizer + SHA-256 hasher
│   ├── wilson-score.ts           ← Reddit's "best" sort algorithm
│   ├── build-tree.ts             ← flat comment array → nested tree
│   └── og-fetch.ts               ← Fetch Open Graph title/image for a URL
│
├── prisma/
│   ├── schema.prisma             ← DB schema (edit this first for any DB change)
│   └── seed.ts                   ← Optional: seed data for local dev
│
├── types/
│   ├── index.ts                  ← Shared TypeScript types (CommentNode, ThreadData…)
│   └── next-auth.d.ts            ← Extends NextAuth session with id + username
│
├── auth.ts                       ← NextAuth config (root level, required by Next.js 16)
├── proxy.ts                      ← Next.js 16 proxy (pass-through; auth is per-route)
├── CLAUDE.md                     ← This file
├── DEPLOY.md                     ← Deploy steps (Railway + Vercel)
└── PLAN.md                       ← Full system design document
```

---

## Database Schema (quick reference)

```
User       id, username (unique), email, passwordHash, avatarUrl, createdAt
Thread     id, normalizedUrl, urlHash (SHA-256, indexed), domain, title, ogImage, commentCount
Comment    id, threadId, userId, parentId, content, path, depth, upvotes, downvotes, wilsonScore, isDeleted
Vote       userId + commentId (unique pair), value (+1 or -1)
```

**The threading trick** — `Comment` has 3 columns that work together:
- `parentId` — direct parent (NULL = root comment)
- `path` — materialized path string: `"abc.def.ghi"` (ancestor IDs joined by dots)
- `depth` — integer, used for indent pixel calculation

Path is built inside a **database transaction** to prevent race conditions.

---

## Key Decisions (don't change without reading PLAN.md)

| Decision | Why |
|---|---|
| Materialized path over closure table | Single `ORDER BY path` query fetches entire thread in tree order |
| Wilson Score for "best" sort | Same algorithm Reddit uses (80% confidence interval, z=1.281) |
| SHA-256 of normalized URL for lookup | Fixed-length index, faster than varchar comparison on long strings |
| JWT sessions (not DB sessions) | Serverless-friendly — no session table writes per request |
| Soft delete only | Children of deleted comments must remain visible (Reddit behavior) |
| `router.refresh()` after comment post | Re-runs server component to show new comment without full page reload |

---

## Commands

```bash
npm run dev          # start dev server at http://localhost:3000
npm run build        # production build
npm run lint         # ESLint check

npm run db:generate  # regenerate Prisma client after schema change
npm run db:migrate   # create + apply migration (dev only)
npm run db:push      # push schema without migration file (fast prototyping)
npm run db:studio    # open Prisma Studio (visual DB browser) at http://localhost:5555
npm run db:seed      # seed example data
```

---

## Environment Variables

```
DATABASE_URL        PostgreSQL connection string (from Railway)
NEXTAUTH_SECRET     Random 32-byte secret (openssl rand -base64 32)
NEXTAUTH_URL        Full URL of the app (http://localhost:3000 for dev)
GOOGLE_CLIENT_ID    From Google Cloud Console
GOOGLE_CLIENT_SECRET From Google Cloud Console
```

---

## Common tasks for Claude

- **Add a new field to a model** → edit `prisma/schema.prisma` → run `npm run db:migrate` → update types in `types/index.ts` → update relevant API routes
- **Add a new page** → create `app/yourpage/page.tsx` as a Server Component
- **Add a new API route** → create `app/api/yourroute/route.ts`, use `auth()` for auth check
- **Change comment sort logic** → `lib/build-tree.ts` → `sortCommentTree()`
- **Change URL normalization** → `lib/normalize-url.ts` → `normalizeUrl()`
- **Change vote scoring** → `lib/wilson-score.ts`

---

## Style rules

- **Monospace everything** — no sans-serif anywhere
- **No rounded corners** — flat, dense, Codeforces-inspired
- **Use inline styles** not Tailwind classes for layout (Tailwind is available but we use it mostly for the `@theme` CSS variables in `globals.css`)
- Colors: `#1a5276` (primary blue), `#27ae60` (upvote green), `#c0392b` (downvote red), `#888` (muted), `#ccc` (border)
- Font size: 13px base, 12px for metadata, 11px for micro labels

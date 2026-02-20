# system.md — How Everything Works

A plain-English guide to this codebase. Start here if you're new.

---

## The Big Picture

```
User opens site
    │
    ├─ Pastes a URL → /api/threads normalizes it → finds or creates a thread
    │                                              → redirects to /t/[threadId]
    │
    ├─ Reads comments → No login needed
    │
    └─ Tries to comment → Must be logged in → Comment saved → thread refreshes
```

---

## How a URL Becomes a Thread

**File: `lib/normalize-url.ts`**

1. User pastes: `https://www.YouTube.com/watch?v=abc&t=30s&utm_source=twitter`
2. We normalize it:
   - Force `https://`
   - Lowercase the domain: `youtube.com`
   - Strip tracking params: `utm_source`, `fbclid`, etc.
   - YouTube-specific: keep only `v=`, drop `t=`, `list=`, `si=`
   - Strip `www.`
   - Result: `https://youtube.com/watch?v=abc`
3. SHA-256 hash the result → `urlHash` (used as the DB lookup key)
4. If hash exists in DB → return that thread
5. If not → fetch Open Graph title/image → create new thread → return it

This means `youtu.be/abc` and `youtube.com/watch?v=abc&t=30s&utm_source=x` both point to **the same thread**.

---

## How Threaded Comments Work

**File: `lib/build-tree.ts`, `prisma/schema.prisma`**

Every comment has 3 special columns:

```
parentId  = "comment_abc"         ← who is the direct parent (null = root comment)
path      = "root_id.child_id.me" ← ALL ancestors chained by dots
depth     = 2                     ← how many ancestors (0 = root)
```

**Inserting a reply (inside a DB transaction):**
```
1. INSERT new comment with path = '' (placeholder)
2. path = parent.path + "." + new_comment.id
3. UPDATE comment SET path = new path
```
The transaction prevents two simultaneous replies corrupting each other's paths.

**Fetching a thread:**
```
SELECT all comments WHERE threadId = X
ORDER BY createdAt ASC
```
Then in JavaScript (`lib/build-tree.ts`):
- Build a Map of id → node
- Loop: if parentId is null → push to roots array, else → push to parent.children array
- Sort root-level comments by chosen mode (best/top/new/old/controversial)
- Children always stay in creation order (same as Reddit)

**Why this is better than recursive SQL:**
One query. No N+1. Works up to ~10,000 comments before needing pagination.

---

## How Voting Works

**File: `app/api/votes/route.ts`**

```
User clicks ▲ on a comment
    │
    ├─ Client: optimistic update (score changes instantly in UI)
    │
    └─ POST /api/votes { commentId, value: 1 }
           │
           ├─ Check existing vote for this user+comment pair
           │
           ├─ If same vote again → REMOVE it (toggle off)
           ├─ If different vote  → SWITCH it
           └─ If no vote         → CREATE it
           │
           └─ Recalculate Wilson Score → UPDATE comment
```

**Wilson Score ("Best" sort):**
```
score = lower_bound_of_upvote_ratio_at_80%_confidence
```
A comment with 1 upvote, 0 downvotes scores LOWER than one with 100 upvotes, 5 downvotes.
This prevents gaming the system with a single early upvote.
Same exact algorithm Reddit uses (z = 1.281551565545).

---

## How Auth Works

**File: `auth.ts`**

Two ways to sign in:
1. **Email + Password** — stored in `User.passwordHash` (bcrypt, 12 rounds)
2. **Google OAuth** — handled by NextAuth, stored in `Account` table

Session is a **JWT cookie** (not stored in DB):
- Login → NextAuth puts `{ id, username }` in a signed JWT cookie
- Every request → cookie is verified and `session.user` is populated
- No database hit per request for session validation

**Lazy auth model:**
- `GET /t/[threadId]` → no auth check, everyone can read
- `POST /api/comments` → checks `await auth()`, returns 401 if not logged in
- On the frontend: `CommentForm` shows "log in to comment" link if `currentUserId` is null

---

## How Pages Are Rendered

**Next.js App Router: Server Components by default**

```
app/t/[threadId]/page.tsx  ← Server Component
    │
    ├─ await db.thread.findUnique(...)       ← DB call on server
    ├─ await db.comment.findMany(...)        ← DB call on server
    ├─ buildTree(flatComments)               ← runs on server
    │
    └─ returns HTML with data baked in
         │
         └─ passes tree as props to CommentTree ('use client')
                │
                └─ CommentNode ('use client') handles:
                       - collapse/expand (useState)
                       - reply form toggle (useState)
                       - vote button clicks (fetch → optimistic update)
```

When a new comment is posted:
- `router.refresh()` is called in `CommentForm.tsx`
- Next.js re-runs the server component
- Fresh comments appear without a full page reload

---

## Folder-by-folder guide

### `app/` — Pages and API routes
Every file here is either a page (`page.tsx`) or an API handler (`route.ts`).
- Pages are **Server Components** by default (fast, SEO-friendly)
- Client interactivity requires `'use client'` at the top of the file
- API routes export `GET`, `POST`, `PUT`, `DELETE` functions

### `components/` — UI building blocks
- `layout/` — Navbar, Footer (shown on every page)
- `thread/` — URL input form, thread table row, thread header
- `comment/` — The comment tree (the most complex part)

### `lib/` — Pure logic, no UI
- These files have no React — just functions you can call anywhere
- Unit-testable without running Next.js

### `prisma/` — Database
- `schema.prisma` is the source of truth for the DB structure
- After any schema change: `npm run db:migrate` then `npm run db:generate`

### `types/` — TypeScript types
- `index.ts` — types used across the whole app
- `next-auth.d.ts` — adds `id` and `username` to the session type

---

## Data flow diagram

```
Browser                    Server (Next.js)              Database (PostgreSQL)
  │                              │                              │
  │── GET /t/abc ───────────────>│                              │
  │                              │── findUnique(thread) ───────>│
  │                              │── findMany(comments) ────────>│
  │                              │── findMany(votes) ───────────>│
  │                              │<─ data ──────────────────────│
  │                              │── buildTree() ───────────────│ (in memory)
  │<── SSR HTML (full page) ─────│                              │
  │                              │                              │
  │── POST /api/comments ────────>│                              │
  │   { threadId, content }      │── auth() ────────────────────│ (JWT check)
  │                              │── $transaction ─────────────>│
  │                              │   INSERT comment             │
  │                              │   UPDATE path                │
  │                              │── UPDATE commentCount ───────>│
  │<── 201 { comment } ──────────│                              │
  │── router.refresh() ──────────>│ (re-runs server component)  │
```

---

## What can go wrong (and how we handle it)

| Problem | How we handle it |
|---|---|
| Two users reply to same comment at the same time | DB transaction: INSERT + path UPDATE is atomic |
| User deletes account | Comment stays, userId set to null, shows `[deleted]` |
| User deletes comment | Soft delete: `isDeleted=true`, children stay visible |
| Same URL with different tracking params | `normalizeUrl()` strips them, SHA-256 hash deduplicates |
| YouTube short links (`youtu.be`) vs full links | Both normalize to `youtube.com/watch?v=X` |
| Serverless cold starts creating too many DB connections | Prisma global singleton (`lib/db.ts`) reuses existing client |
| Vote manipulation (double voting) | `@@unique([userId, commentId])` at DB level |

# Internet Comment Section

A universal discussion layer for any URL on the internet. Paste any link — get a thread. Anyone can read, you must be logged in to comment.

**Live:** [Click Here](https://internet-comment-section.vercel.app/)

---

## What it does

- Paste any URL → creates (or finds) a thread for that page
- Reddit-style threaded comments — reply to any comment, infinitely nested
- Upvote / downvote with 5 sort modes: Best, Top, New, Old, Controversial
- Read without an account — login only required to comment or vote
- Old-school dense UI inspired by Codeforces — monospace, no rounded corners

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (Railway) |
| ORM | Prisma 6 |
| Auth | NextAuth v5 (Auth.js) |
| Deploy | Vercel (app) + Railway (DB) |
| Validation | Zod |

---

## Architecture — how the interesting parts work

### 1. URL Normalization + Deduplication

Before any URL hits the database it goes through a normalization pipeline:

```
raw input
  → force HTTPS
  → lowercase hostname
  → strip tracking params (utm_*, fbclid, gclid, si, ref …)
  → YouTube-specific: youtu.be/X and youtube.com/watch?v=X&t=30&list=PL... → youtube.com/watch?v=X
  → remove www.
  → remove trailing slash
  → sort remaining query params alphabetically
  → SHA-256 hash of the result
```

The SHA-256 hash is stored as `urlHash` (unique index) — this is used for all lookups, not the URL string itself. Fixed-length, fast index, collision-proof.

**Interview talking point:** Two people pasting `https://www.youtube.com/watch?v=abc&t=30&si=xyz` and `https://youtu.be/abc` land on the exact same thread.

---

### 2. Threaded Comments — Materialized Path

Each comment stores three columns that together define the tree:

| Column | Example | Purpose |
|---|---|---|
| `parentId` | `"cmnt_abc"` | Direct parent (NULL = root) |
| `path` | `"cmnt_abc.cmnt_def.cmnt_xyz"` | Full ancestor chain |
| `depth` | `2` | Integer depth for indent |

**Why materialized path?**
- Fetch the entire thread in one query: `ORDER BY path`
- No recursive CTEs, no closure tables, no N+1
- Insert is wrapped in a `$transaction` — reads parent's path, appends own ID, saves atomically

The flat array comes back from the DB in path order, then `buildTree()` in JavaScript converts it to a nested structure in O(n) using a Map.

**Interview talking point:** Closure tables are more flexible but require a join table that grows O(n²). Materialized path is a simpler tradeoff — write is slightly more complex, reads are extremely fast.

---

### 3. Wilson Score — "Best" Sort

The "Best" sort is Reddit's exact algorithm — the Wilson score lower bound at 80% confidence (z = 1.281551565545).

```
score = (p̂ + z²/2n − z√(p̂(1−p̂)/n + z²/4n²)) / (1 + z²/n)
where p̂ = upvotes / total_votes
```

This is better than sorting by `upvotes - downvotes` because:
- A comment with 1 upvote, 0 downvotes does NOT outrank one with 1000 upvotes, 100 downvotes
- It penalizes low sample sizes — a new comment starts at a conservative score until it gets enough votes

Wilson score is recalculated and stored on every vote (in the same DB transaction as the vote toggle) so sorting is just `ORDER BY wilsonScore DESC` — no runtime calculation.

**Controversial sort:** `(upvotes + downvotes) ^ (min/max)` — high total votes AND close to 50/50 split.

---

### 4. Authentication

NextAuth v5 with two providers:
- **GitHub OAuth** — one-click login, username auto-generated from GitHub login name
- **Credentials** — email + password, hashed with bcryptjs (cost factor 12)

JWT sessions (not DB sessions) — serverless-friendly, no session table writes per request. The JWT carries `id` and `username`, extended via NextAuth's type augmentation.

`ensureUsername()` runs in the JWT callback on first login — generates a unique username from the OAuth profile hint if one doesn't already exist.

---

### 5. Comment Rendering — Depth Limiting + Focus Mode

Deeply nested threads would overflow horizontally if indented naively. Solution:

- Each nesting level adds exactly **23px** of indent (fixed, not multiplied by depth)
- Maximum rendered depth: **8 levels**
- At depth 8, show "↪ continue this thread" instead of children
- Clicking it enters **Focus Mode** — pushes the comment onto a stack, hides all ancestors, renders just that subtree as the new root
- Breadcrumb + "← back" button lets you navigate back up

`relativeDepth = comment.depth - rootDepth` normalizes depth so focused subtrees always start at 0.

---

### 6. Voting — Optimistic Updates + Toggle Logic

Votes are toggled — clicking the same direction twice removes the vote:
- No vote → upvote → remove (back to no vote)
- Upvote → downvote switches direction in one click

All done in a `$transaction`:
1. Upsert the Vote row
2. Recount upvotes and downvotes from Vote table
3. Recalculate Wilson score
4. Update Comment row

UI updates optimistically (instant feedback) and reverts on error.

---

## Database Schema

```
User       id, username (unique), email, passwordHash (nullable for OAuth), avatarUrl
Thread     id, normalizedUrl, urlHash (SHA-256, unique), domain, title, ogImage, commentCount
Comment    id, threadId, userId, parentId, content, path, depth, upvotes, downvotes, wilsonScore, isDeleted
Vote       userId + commentId (unique pair), value (+1 or -1)
```

`isDeleted` is a soft delete — comment content is hidden but the node stays so children remain visible (Reddit behavior).

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| SHA-256 hash for URL lookup | Fixed-length indexed column, faster than VARCHAR comparison on long URLs |
| Materialized path over closure table | Single `ORDER BY path` fetches entire thread, simpler writes |
| Wilson score stored on comment row | Sorting is `ORDER BY wilsonScore` — no runtime math |
| JWT sessions | No session table writes per request — works well on Vercel serverless |
| Soft delete only | Deleting a comment that has replies would break the thread tree |
| `router.refresh()` after post | Re-runs the Server Component to show new comment without full reload |
| `$transaction` for comment insert | Prevents race condition when reading parent path and writing child path |

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env.local
# Fill in DATABASE_URL, NEXTAUTH_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET

# 3. Push schema to DB
npm run db:push

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
app/                    Next.js pages + API routes
├── page.tsx            Homepage — URL input + recent threads
├── explore/            All threads, sortable + filterable
├── t/[threadId]/       Thread page — comment tree
├── u/[username]/       User profile + comment history
└── api/                REST endpoints (threads, comments, votes, auth)

components/
├── comment/            CommentTree, CommentNode, VoteButtons, CommentForm
├── thread/             ThreadCard, ThreadHeader, UrlInputForm
└── layout/             Navbar, NavActions

lib/
├── normalize-url.ts    URL normalization pipeline + SHA-256 hasher
├── wilson-score.ts     Reddit Best algorithm + controversial score
├── build-tree.ts       Flat array → nested tree (O(n) with Map)
├── og-fetch.ts         Open Graph title/image fetcher
└── db.ts               Prisma singleton (serverless-safe)
```

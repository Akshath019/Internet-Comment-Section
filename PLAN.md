# Internet Comment Section — System Design Plan

> Old-school UI. Dense. Functional. Codeforces aesthetic. Zero fluff.

---

## Table of Contents

1. [Project Vision](#1-project-vision)
2. [Tech Stack — Exact Versions](#2-tech-stack--exact-versions)
3. [UI Design Philosophy](#3-ui-design-philosophy)
4. [Authentication — Lazy Auth Model](#4-authentication--lazy-auth-model)
5. [URL Normalization Engine](#5-url-normalization-engine)
6. [Reddit-Style Threading — The Hard Part](#6-reddit-style-threading--the-hard-part)
7. [Database Schema](#7-database-schema)
8. [API Design](#8-api-design)
9. [Navbar Sections — Explore & Join/Create](#9-navbar-sections--explore--joincreate)
10. [Ranking & Sorting Algorithms](#10-ranking--sorting-algorithms)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Project File Structure](#12-project-file-structure)
13. [Implementation Phases](#13-implementation-phases)

---

## 1. Project Vision

**What it is:** A universal discussion layer for any URL on the internet.

Someone pastes `https://youtube.com/watch?v=dQw4w9WgXcQ` → the system normalizes it → creates a thread → anyone can read the discussion without logging in → login required to comment.

**The core loop:**
```
User pastes URL → Normalize → Hash → Lookup DB → Create if new → Reddit-style thread
```

**Why it's interesting for an interviewer:**
- Solves a real distributed systems problem (URL deduplication)
- Implements a non-trivial tree data structure (materialized path)
- Uses a statistical ranking algorithm (Wilson Score)
- Demonstrates understanding of lazy/progressive auth

---

## 2. Tech Stack — Exact Versions

| Layer             | Technology                          | Version       |
|-------------------|-------------------------------------|---------------|
| Framework         | Next.js (App Router)                | 16.1.6 LTS    |
| Language          | TypeScript                          | 5.9.3         |
| Styling           | Tailwind CSS                        | v4.1          |
| Database          | PostgreSQL (Railway)                | 16.x          |
| ORM               | Prisma                              | latest        |
| Auth              | Auth.js (NextAuth v5)               | 5.x           |
| Hosting (app)     | Vercel                              | —             |
| Hosting (DB)      | Railway                             | —             |
| Validation        | Zod                                 | 3.x           |
| Editor            | Tiptap (comment editor)             | 2.x           |
| Time              | date-fns                            | 4.x           |
| HTTP Client       | native fetch (Next.js built-in)     | —             |

### Key Version Notes
- **Next.js 16.1.6** — Turbopack file system caching by default, stable App Router, Server Actions stable
- **Tailwind v4.1** — CSS-first config (`@theme` in `.css`), no `tailwind.config.js` needed, `@import "tailwindcss"` replaces `@tailwind` directives, 5x faster full builds, 100x faster incremental
- **TypeScript 5.9.3** — last stable before the Go-native TS7; import defer support, minimal `tsconfig` via `tsc --init`

---

## 3. UI Design Philosophy

**Reference: Codeforces.com aesthetic**

### Rules
- Monospace everything. Font: `"JetBrains Mono", "Courier New", monospace`
- No rounded corners (or max `rounded-sm`). Flat. Dense.
- Color palette:
  - Background: `#FFFFFF` / `#F6F6F6` (alternating table rows)
  - Primary blue: `#1A5276` (links, handles)
  - Vote up: `#27AE60`
  - Vote down: `#C0392B`
  - Border: `#CCCCCC`
  - Text: `#222222`
  - Muted: `#888888`
- Tables, not cards. Information density over visual breathing room.
- Username displayed as `handle` in every comment (never real name, never email)
- Timestamps: relative (`3h ago`) on hover shows absolute (`2026-02-20 14:32 UTC`)
- No animations except vote number flip

### Typography
```css
@theme {
  --font-mono: "JetBrains Mono", "Courier New", monospace;
  --font-size-sm: 12px;
  --font-size-base: 13px;
  --font-size-lg: 15px;
}
```

### Comment Thread Visual
```
[+] [-]  ▲ 142  username_handle  •  4h ago
         This is a top-level comment body here.
         [reply] [share] [report]

         │  [+] [-]  ▲ 34  another_user  •  2h ago
         │  Reply to above comment, indented by left border.
         │  [reply] [share] [report]
         │
         │  │  [+] [-]  ▲ 8   deep_user  •  1h ago
         │  │  Reply to reply. Indent increases.
         │  │  [reply]
```

Indent: `16px per depth level`, max visual indent at depth 8 (collapse beyond that).

---

## 4. Authentication — Lazy Auth Model

### The Model
```
READ  → No auth required. Full comment tree visible.
WRITE → Auth required. Prompt on "Reply" or "Comment" click.
```

### Implementation
- Auth.js v5 (NextAuth) with credentials provider + Google OAuth
- Session: JWT stored in HTTP-only cookie
- On comment attempt while logged out → modal prompt: "Join to comment" with Google login + email/pass

### User Profile Fields
```
id            UUID
username      unique handle (shown in comments, never email)
email         stored, never displayed
password_hash bcrypt, nullable (null = OAuth-only user)
avatar_url    optional, gravatar fallback
created_at    timestamp
```

### Username Rules
- 3–20 characters, `[a-zA-Z0-9_-]` only
- Chosen at signup, immutable (like Reddit/Codeforces)
- Displayed in every comment as `@username`

---

## 5. URL Normalization Engine

### Why This Is Critical
`https://youtube.com/watch?v=abc&t=30s` and `https://youtu.be/abc` are the same video.
Without normalization, you get duplicate threads for the same content.

### Normalization Pipeline

```typescript
function normalizeUrl(raw: string): string {
  const url = new URL(raw);

  // 1. Lowercase scheme and host
  url.hostname = url.hostname.toLowerCase();

  // 2. Remove default ports (80 for http, 443 for https)
  if ((url.protocol === 'https:' && url.port === '443') ||
      (url.protocol === 'http:'  && url.port === '80')) {
    url.port = '';
  }

  // 3. Remove fragment (#section) — fragments are client-side only
  url.hash = '';

  // 4. Remove universal tracking params
  const STRIP_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'msclkid', 'ref', 'source', '_ga', 'mc_cid', 'mc_eid'
  ];
  STRIP_PARAMS.forEach(p => url.searchParams.delete(p));

  // 5. YouTube-specific normalization
  if (url.hostname.endsWith('youtube.com') || url.hostname === 'youtu.be') {
    url = normalizeYouTube(url);
  }

  // 6. Remove trailing slash on path (except root)
  if (url.pathname !== '/') {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }

  // 7. Sort remaining params alphabetically for determinism
  url.searchParams.sort();

  return url.toString();
}

function normalizeYouTube(url: URL): URL {
  // youtu.be/VIDEO_ID → youtube.com/watch?v=VIDEO_ID
  if (url.hostname === 'youtu.be') {
    const videoId = url.pathname.slice(1);
    return new URL(`https://www.youtube.com/watch?v=${videoId}`);
  }

  // Keep only `v` param, strip t=, list=, index=, si=, pp=, etc.
  const videoId = url.searchParams.get('v');
  const normalized = new URL('https://www.youtube.com/watch');
  if (videoId) normalized.searchParams.set('v', videoId);
  return normalized;
}
```

### URL → Thread Lookup
```
SHA-256(normalized_url) → stored as url_hash (indexed, unique)
```
Lookup by hash, not string comparison. Fast, fixed-length index.

---

## 6. Reddit-Style Threading — The Hard Part

### Why Threading is Hard
The naive approach (recursive queries or N+1 fetching) breaks at scale.
Reddit solves this with a **Hybrid: Adjacency List + Materialized Path**.

### The Data Model (Hybrid Approach)

Based on extensive research from LLD Coding, Aleksandra.codes, and the Medium article:

```sql
-- Each comment stores:
id          -- unique identifier
thread_id   -- which URL thread it belongs to
parent_id   -- direct parent (NULL = root comment) — Adjacency List
path        -- full ancestor chain: "1.5.23.47" — Materialized Path
depth       -- number of ancestors (0 = root comment)
content
user_id
upvotes
downvotes
wilson_score -- pre-computed for "best" sort
is_deleted  -- soft delete (Reddit shows [deleted] not a blank)
created_at
```

### Why Materialized Path over Closure Table

| Feature                   | Materialized Path | Closure Table |
|---------------------------|:-----------------:|:-------------:|
| Read all descendants      | `LIKE 'path%'`    | JOIN query    |
| Write complexity          | Low               | High (many rows) |
| Move subtree              | Update path column | Complex re-insert |
| Storage overhead          | Low               | O(n²) worst case |
| Sort in render order      | ORDER BY path ✓  | Requires CTE  |

**Winner: Materialized Path for this use case** — read-heavy, display-heavy.

### Inserting a Comment

```typescript
async function insertComment(threadId, parentId, content, userId) {
  if (parentId === null) {
    // Root comment: path starts with its own ID
    const comment = await db.comment.create({
      data: { threadId, parentId: null, content, userId, depth: 0, path: '' }
    });
    // Update path to be the comment's own ID
    await db.comment.update({
      where: { id: comment.id },
      data: { path: comment.id.toString() }
    });
    return comment;
  }

  // Reply: inherit parent's path + append own ID
  const parent = await db.comment.findUnique({ where: { id: parentId } });
  const comment = await db.comment.create({
    data: {
      threadId,
      parentId,
      content,
      userId,
      depth: parent.depth + 1,
      path: '' // placeholder
    }
  });

  await db.comment.update({
    where: { id: comment.id },
    data: { path: `${parent.path}.${comment.id}` }
  });

  return comment;
}
```

### Fetching an Entire Thread (Single Query)

```sql
SELECT
  c.*,
  u.username,
  u.avatar_url,
  cc.depth
FROM comments c
JOIN users u ON c.user_id = u.id
WHERE c.thread_id = $1
  AND c.path LIKE $2  -- e.g., '%' for all, or '42.%' for subtree
ORDER BY
  -- Sort top-level by wilson_score DESC, children follow parent (path order)
  SPLIT_PART(c.path, '.', 1) DESC,  -- top-level comment ranking
  c.path ASC                          -- children group under parent
LIMIT 500;
```

### Rendering the Tree (Frontend)

```typescript
// Transform flat SQL result → nested tree
function buildTree(flatComments: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  // First pass: index all nodes
  for (const c of flatComments) {
    map.set(c.id, { ...c, children: [] });
  }

  // Second pass: attach children to parents
  for (const c of flatComments) {
    if (c.parentId === null) {
      roots.push(map.get(c.id)!);
    } else {
      const parent = map.get(c.parentId);
      parent?.children.push(map.get(c.id)!);
    }
  }

  return roots;
}
```

### Collapse / Expand (Key UX Feature)
- Each comment tree node has a `[+]` / `[-]` toggle
- State stored in React `useState` / URL hash for deep linking
- Collapsed subtrees: show count of hidden replies `[42 hidden replies]`

### The `[deleted]` Behavior (Reddit Exact)
- Soft delete only. `is_deleted = true`, content → `null`
- Display: `[deleted]` as content, username as `[deleted]`
- Children of deleted comments **remain visible** (critical for thread integrity)

---

## 7. Database Schema

### Full Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String    @id @default(cuid())
  username     String    @unique
  email        String    @unique
  passwordHash String?   // null for OAuth users
  avatarUrl    String?
  createdAt    DateTime  @default(now())

  comments     Comment[]
  votes        Vote[]
  sessions     Session[]
}

model Thread {
  id            String    @id @default(cuid())
  normalizedUrl String    @unique
  urlHash       String    @unique  // SHA-256 of normalizedUrl
  originalUrl   String              // user's raw paste (for display)
  domain        String              // extracted domain (e.g., "youtube.com")
  title         String?             // OG title fetched on creation
  ogImage       String?             // OG image
  commentCount  Int       @default(0)
  createdAt     DateTime  @default(now())

  comments      Comment[]

  @@index([urlHash])
  @@index([domain])
  @@index([createdAt])
}

model Comment {
  id          String    @id @default(cuid())
  threadId    String
  userId      String?   // null if user deleted account
  parentId    String?   // null = root comment
  content     String?   // null if deleted
  path        String    // materialized path: "abc.def.ghi"
  depth       Int       @default(0)
  upvotes     Int       @default(0)
  downvotes   Int       @default(0)
  wilsonScore Float     @default(0)  // pre-computed for "best" sort
  isDeleted   Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  thread      Thread    @relation(fields: [threadId], references: [id])
  user        User?     @relation(fields: [userId], references: [id])
  parent      Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  children    Comment[] @relation("CommentReplies")
  votes       Vote[]

  @@index([threadId, path])      // critical: fetch thread sorted by path
  @@index([threadId, wilsonScore])
  @@index([path])
}

model Vote {
  id        String   @id @default(cuid())
  userId    String
  commentId String
  value     Int      // +1 or -1

  user      User     @relation(fields: [userId], references: [id])
  comment   Comment  @relation(fields: [commentId], references: [id])

  @@unique([userId, commentId])  // one vote per user per comment
}
```

### Indexes That Matter
```sql
-- The money index: fetch all comments in a thread, sorted for tree rendering
CREATE INDEX idx_comments_thread_path ON comments(thread_id, path);

-- For "best" sort on root comments
CREATE INDEX idx_comments_thread_wilson ON comments(thread_id, wilson_score DESC)
  WHERE depth = 0;

-- Thread lookup (the primary operation)
CREATE UNIQUE INDEX idx_threads_hash ON threads(url_hash);
```

---

## 8. API Design

### Routes (Next.js App Router — Server Actions + Route Handlers)

```
GET  /                          → Homepage (trending threads)
GET  /explore                   → All threads, sorted/filtered
GET  /t/[threadId]              → Thread page (full comment tree)
GET  /u/[username]              → User profile page

POST /api/threads               → Create or fetch thread by URL
GET  /api/threads/[id]/comments → Fetch comment tree (paginated)
POST /api/comments              → Post a comment (auth required)
PUT  /api/comments/[id]         → Edit comment (auth required, own comment)
DELETE /api/comments/[id]       → Soft delete (auth required, own comment)
POST /api/votes                 → Cast/toggle vote (auth required)

POST /api/auth/signup           → Register
POST /api/auth/login            → Login (NextAuth handles)
```

### Thread Creation Flow

```typescript
// POST /api/threads
async function createOrFetchThread(rawUrl: string) {
  const normalized = normalizeUrl(rawUrl);
  const hash = sha256(normalized);

  // Check if exists
  const existing = await db.thread.findUnique({ where: { urlHash: hash } });
  if (existing) return { thread: existing, created: false };

  // Fetch OG metadata for the URL (non-blocking, best-effort)
  const meta = await fetchOgMeta(normalized).catch(() => ({}));

  const thread = await db.thread.create({
    data: {
      normalizedUrl: normalized,
      urlHash: hash,
      originalUrl: rawUrl,
      domain: new URL(normalized).hostname,
      title: meta.title,
      ogImage: meta.image,
    }
  });

  return { thread, created: true };
}
```

### Wilson Score Computation (on every vote)

```typescript
// Called after each upvote/downvote via a DB trigger or background job
function wilsonScore(upvotes: number, downvotes: number): number {
  const n = upvotes + downvotes;
  if (n === 0) return 0;

  const z = 1.281551565545; // 80% confidence (Reddit uses 80%)
  const p = upvotes / n;
  const left = p + (z * z) / (2 * n);
  const right = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  const under = 1 + (z * z) / n;

  return (left - right) / under;
}
```

---

## 9. Navbar Sections — Explore & Join/Create

### Navbar Layout
```
[ Internet Comment Section ]   [ Explore ]  [ Join/Create ]   [ @username ▾ ] or [ Log In ]
```

### Explore Page (`/explore`)
- Lists all threads, sorted by: **Recent** | **Most Comments** | **Trending** (comments/hour)
- Filter by domain: `[youtube.com]` `[github.com]` `[twitter.com]` etc.
- Search: full-text search on `title` + `normalized_url`
- Codeforces-style table:
  ```
  #    Domain          Title / URL                    Comments   Last Activity
  1    youtube.com     Rick Astley - Never Gonna...   1,247      3m ago
  2    github.com      torvalds/linux                 834        12m ago
  ```

### Join/Create Page
- **URL input box** — big, centered, monospace
- On submit: normalize → lookup → redirect to `/t/[threadId]`
- If new thread: show "New thread created for: [normalized URL]"
- Join: Sign up / Log in forms (tabs: Email | Google)

---

## 10. Ranking & Sorting Algorithms

### Per-Thread Comment Sort Options (Dropdown, default: Best)

| Sort Mode    | Algorithm                                     |
|--------------|-----------------------------------------------|
| **Best**     | Wilson Score lower bound (80% confidence)     |
| **Top**      | `upvotes - downvotes` DESC                    |
| **New**      | `created_at` DESC                             |
| **Old**      | `created_at` ASC                              |
| **Controversial** | High votes but close to 50/50 split      |

**Controversial formula:**
```typescript
// Comment is controversial if it has many votes but nearly equal up/down
function controversialScore(up: number, down: number): number {
  if (up <= 0 || down <= 0) return 0;
  const magnitude = up + down;
  const balance = up > down ? down / up : up / down;
  return magnitude ** balance;
}
```

### Sorting Applies Only to Root Comments
Child comments (depth > 0) **always sort by `created_at` ASC** within their parent.
This is exactly how Reddit works. Only top-level comments are ranked.

### Thread List Sorting (Explore page)
- **Trending**: `comment_count / hours_since_created` — hot threads rise fast
- **Top**: total comment count DESC
- **New**: `created_at` DESC

---

## 11. Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        VERCEL                           │
│                                                         │
│  Next.js 16 App                                         │
│  ├── App Router (RSC + Server Actions)                  │
│  ├── Edge middleware (auth session check)               │
│  └── Vercel CDN (static assets, OG images cached)       │
└──────────────────────┬──────────────────────────────────┘
                       │ DATABASE_URL (connection pooling)
                       │ via PgBouncer (Railway built-in)
┌──────────────────────▼──────────────────────────────────┐
│                       RAILWAY                           │
│                                                         │
│  PostgreSQL 16                                          │
│  ├── Primary DB                                         │
│  ├── Automated backups                                  │
│  └── Connection pooler (PgBouncer on Railway Pro)       │
└─────────────────────────────────────────────────────────┘
```

### Environment Variables
```env
# .env (never commit)
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://your-app.vercel.app"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### Vercel Config (`vercel.json`)
```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "DATABASE_URL": "@database_url",
    "NEXTAUTH_SECRET": "@nextauth_secret"
  }
}
```

### Connection Pooling (Critical for Serverless)
Vercel runs serverless functions — each invocation may create a new DB connection.
Use `@prisma/adapter-pg` with connection pooling:
```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }
export const db = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

---

## 12. Project File Structure

```
internet-comment-section/
├── app/
│   ├── layout.tsx                  # Root layout, Navbar
│   ├── page.tsx                    # Homepage / landing
│   ├── explore/
│   │   └── page.tsx                # Explore all threads
│   ├── t/
│   │   └── [threadId]/
│   │       └── page.tsx            # Thread + comment tree
│   ├── u/
│   │   └── [username]/
│   │       └── page.tsx            # User profile
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── threads/route.ts
│       ├── threads/[id]/comments/route.ts
│       ├── comments/route.ts
│       ├── comments/[id]/route.ts
│       └── votes/route.ts
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── thread/
│   │   ├── ThreadCard.tsx          # Row in Explore table
│   │   ├── ThreadHeader.tsx        # URL, domain, OG info
│   │   └── UrlInputForm.tsx        # The paste-a-link form
│   ├── comment/
│   │   ├── CommentTree.tsx         # Recursive tree renderer
│   │   ├── CommentNode.tsx         # Single comment (collapse, vote, reply)
│   │   ├── CommentForm.tsx         # New comment / reply editor
│   │   ├── VoteButtons.tsx         # ▲ / ▼ with score
│   │   └── SortDropdown.tsx        # Best / Top / New / Old / Controversial
│   └── auth/
│       ├── AuthModal.tsx           # Triggered on comment attempt
│       └── LoginForm.tsx
│
├── lib/
│   ├── db.ts                       # Prisma singleton
│   ├── auth.ts                     # NextAuth config
│   ├── normalize-url.ts            # URL normalization engine
│   ├── wilson-score.ts             # Ranking algorithm
│   ├── build-tree.ts               # Flat array → nested tree
│   └── og-fetch.ts                 # Open Graph metadata fetcher
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── types/
│   └── index.ts                    # Shared TypeScript types
│
├── app/globals.css                 # Tailwind v4 @import + @theme
├── package.json
├── tsconfig.json
└── PLAN.md                         # This file
```

---

## 13. Implementation Phases

### Phase 1 — Foundation
- [ ] Init Next.js 16 + TypeScript 5.9.3 + Tailwind v4.1
- [ ] Set up Railway PostgreSQL + Prisma schema
- [ ] Implement URL normalization engine (with tests)
- [ ] Implement Auth.js v5 (email/pass + Google OAuth)
- [ ] Basic Navbar (static layout)

### Phase 2 — Core Thread System
- [ ] Thread creation / lookup by normalized URL
- [ ] OG metadata fetch on thread creation
- [ ] Explore page (table view, sort by new/top)
- [ ] Thread page (static, no comments yet)

### Phase 3 — Comment Engine (The Hard Part)
- [ ] Materialized path insert logic
- [ ] Single-query thread fetch (all comments, path-sorted)
- [ ] `buildTree()` — flat → nested transform
- [ ] `CommentTree.tsx` recursive renderer
- [ ] Collapse / expand subtrees
- [ ] Soft delete (`[deleted]` behavior)

### Phase 4 — Voting & Ranking
- [ ] Vote model + API (+1 / -1, one per user per comment)
- [ ] Wilson score computation on vote
- [ ] Sort dropdown (Best / Top / New / Old / Controversial)
- [ ] Optimistic UI for votes (instant response)

### Phase 5 — Polish & Deploy
- [ ] Lazy auth modal (prompt on comment attempt)
- [ ] User profile page (comment history)
- [ ] Domain filtering on Explore
- [ ] Vercel deployment config
- [ ] Railway production DB
- [ ] Environment variables in Vercel dashboard
- [ ] `robots.txt`, `sitemap.xml` (Next.js built-in)

---

## Key Interview Talking Points

1. **Why materialized path over closure table?** — O(1) write, single LIKE query reads entire subtree, ORDER BY path gives natural tree traversal order. Closure table is write-heavy (O(depth) rows per insert).

2. **Why Wilson Score over simple upvote count?** — A comment with 1 upvote, 0 downvotes would incorrectly outrank 100 upvotes, 2 downvotes with naive sorting. Wilson Score uses statistical confidence — it penalizes low sample sizes. Reddit switched to this in 2009.

3. **Why SHA-256 for URL lookup?** — Fixed-length index regardless of URL length. Faster B-tree index than varchar comparison on long strings.

4. **How do you handle the serverless connection pool problem?** — Prisma global singleton pattern + Railway's PgBouncer. Vercel serverless functions don't keep DB connections alive between invocations.

5. **What's the most dangerous bug in threaded comments?** — Race condition on path construction. Two users reply to the same parent simultaneously. Solution: wrap insert + path update in a DB transaction.

---

*Sources referenced:*
- *[Designing a Scalable DB Schema for Reddit-like Comments](https://www.lldcoding.com/designing-a-scalable-database-schema-for-reddit-like-comments-part-1)*
- *[How Reddit Ranking Algorithms Work](https://medium.com/hacking-and-gonzo/how-reddit-ranking-algorithms-work-ef111e33d0d9)*
- *[How Not To Sort By Average Rating (Wilson Score)](https://www.evanmiller.org/how-not-to-sort-by-average-rating.html)*
- *[Reddit's Comment Ranking Algorithm](https://possiblywrong.wordpress.com/2011/06/05/reddits-comment-ranking-algorithm/)*
- *[Next.js 16.1 Release Notes](https://nextjs.org/blog/next-16-1)*
- *[Tailwind CSS v4.0](https://tailwindcss.com/blog/tailwindcss-v4)*
- *[TypeScript 5.9 Docs](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)*

# Local Setup Guide (for beginners)

This guide gets the app running on your machine from zero.

---

## What you need installed first

| Tool | Why | Install |
|---|---|---|
| Node.js 22+ | Runs the app | https://nodejs.org → download LTS |
| PostgreSQL | The database | Step 2 below (or use Railway free tier) |
| Git | Version control | https://git-scm.com |

Check what you have:
```bash
node -v      # should show v22.x.x
npm -v       # should show 11.x.x
psql --version  # should show PostgreSQL 16.x
```

---

## Option A — Use a Free Cloud Database (Easiest)

Skip installing PostgreSQL locally. Use Railway's free tier instead.

1. Go to [railway.app](https://railway.app) and sign up (free)
2. Click **New Project** → **PostgreSQL**
3. Click on the PostgreSQL service → **Connect** tab
4. Copy the `DATABASE_URL` — it looks like:
   ```
   postgresql://postgres:xxxx@monorail.proxy.rlwy.net:12345/railway
   ```
5. Skip to **Step 1: Clone & Install** below

---

## Option B — Local PostgreSQL

If you want everything on your machine:

### Windows
1. Download from https://www.postgresql.org/download/windows/
2. Install with default settings, remember the password you set
3. Open **pgAdmin** or run in terminal:
   ```
   psql -U postgres
   ```
4. Create the database:
   ```sql
   CREATE DATABASE internet_comment_section;
   ```
5. Your `DATABASE_URL` will be:
   ```
   postgresql://postgres:YOUR_PASSWORD@localhost:5432/internet_comment_section
   ```

---

## Step 1 — Copy the project and install dependencies

```bash
# Go to your Projects folder
cd "D:/Projects/Internet Comment Section"

# Install all packages (already done if you followed the build guide)
npm install
```

---

## Step 2 — Create your `.env` file

```bash
# Copy the example file
copy .env.example .env
```

Now open `.env` in any text editor (Notepad, VS Code, etc.) and fill it in:

```env
# Your database URL from Option A or B above
DATABASE_URL="postgresql://postgres:password@localhost:5432/internet_comment_section"

# Generate this: open a terminal and run: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
NEXTAUTH_SECRET="paste_the_output_here"

# For local dev, always this:
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth — see Step 3 (or skip and only use email/password login)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

---

## Step 3 — Google OAuth (optional for local dev)

You can **skip this** and just use email/password login locally.

If you want Google login too:
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (name it anything)
3. Go to **APIs & Services** → **OAuth consent screen** → set to External
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs: add `http://localhost:3000/api/auth/callback/google`
7. Copy the Client ID and Client Secret into your `.env`

---

## Step 4 — Set up the database

This creates all the tables in your database:

```bash
npx prisma migrate dev --name init
```

You should see:
```
✔ Generated Prisma Client
✔ Your database is now in sync with your schema.
```

If you get a connection error, double-check your `DATABASE_URL` in `.env`.

---

## Step 5 — Start the app

```bash
npm run dev
```

You should see:
```
▲ Next.js 16.1.6 (Turbopack)
- Local:   http://localhost:3000
- Network: http://192.168.x.x:3000
✓ Ready in 1234ms
```

Open your browser → **http://localhost:3000**

---

## Step 6 — Test that it works

### Test 1: Create a thread
1. Go to http://localhost:3000
2. Paste this URL in the box: `https://github.com/torvalds/linux`
3. Click **GO →**
4. You should be redirected to a thread page

### Test 2: Create an account
1. Click **register** in the top right
2. Pick a username (e.g. `testuser`), enter email + password
3. Click **CREATE ACCOUNT** — you'll be logged in automatically

### Test 3: Post a comment
1. Go back to the thread you created
2. You should see a comment box
3. Type something and click **comment**
4. The comment appears instantly

### Test 4: Reply to a comment
1. Under any comment, click **[reply]**
2. Type a reply and submit
3. The reply appears indented below — that's the threading working

### Test 5: Vote
1. Click the **▲** or **▼** on any comment
2. The score changes instantly (optimistic update)
3. Click the same arrow again — the vote is removed (toggle)

### Test 6: Test the Explore page
1. Go to http://localhost:3000/explore
2. You should see your thread listed
3. Try pasting another URL on the homepage — it appears here too

### Test 7: URL normalization
1. Paste this: `https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s&utm_source=twitter`
2. Paste this in a new tab: `https://youtu.be/dQw4w9WgXcQ`
3. Both should open the **same thread** — because they normalize to the same URL

---

## Useful dev tools

### See your database visually
```bash
npm run db:studio
```
Opens http://localhost:5555 — a GUI to browse/edit all tables.

### Reset your database (start fresh)
```bash
npx prisma migrate reset
```
Drops all data and re-runs migrations. Useful when you change the schema.

### Check for TypeScript errors
```bash
npx tsc --noEmit
```

### Run a production build locally
```bash
npm run build
npm run start
```

---

## Common errors and fixes

### "Environment variable not found: DATABASE_URL"
→ You forgot to create the `.env` file, or the `DATABASE_URL` is wrong.
→ Make sure the file is named exactly `.env` (not `.env.txt`).

### "Can't reach database server"
→ PostgreSQL isn't running.
→ Windows: Search for "Services" → find PostgreSQL → click Start.
→ Or use Railway cloud DB instead.

### "Port 3000 is already in use"
```bash
# Find what's using it
npx kill-port 3000
# Or just use a different port:
npm run dev -- -p 3001
```

### "Prisma client not found"
```bash
npm run db:generate
```

### Module not found / import errors
```bash
npm install
```

### Login not working / "invalid credentials"
→ Make sure `NEXTAUTH_SECRET` is set in `.env`.
→ Try registering a new account — don't try to login with accounts that don't exist yet.

---

## File you edit most often

| What you want to change | File to edit |
|---|---|
| Add a new database column | `prisma/schema.prisma` → then `npm run db:migrate` |
| Change how comments look | `components/comment/CommentNode.tsx` |
| Change the homepage | `app/page.tsx` |
| Change URL normalization rules | `lib/normalize-url.ts` |
| Change sorting algorithm | `lib/build-tree.ts` |
| Change colors/fonts | `app/globals.css` |
| Add a new API endpoint | `app/api/yourname/route.ts` |

---

## Environment variable cheatsheet

```bash
# Generate NEXTAUTH_SECRET quickly:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

```bash
# Test your DATABASE_URL works:
npx prisma db pull
# If it prints your schema, the connection works.
```

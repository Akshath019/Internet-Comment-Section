# Deploy Guide

## 1. Railway (PostgreSQL)

1. Go to [railway.app](https://railway.app) → New Project → PostgreSQL
2. Copy `DATABASE_URL` from the connection panel
3. Run migrations from your machine:
   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```

## 2. Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web)
4. Authorized redirect URIs: `https://your-app.vercel.app/api/auth/callback/google`
5. Copy `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

## 3. Vercel

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add environment variables:
   - `DATABASE_URL` — from Railway
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `https://your-app.vercel.app`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
4. Deploy

## 4. Local development

```bash
cp .env.example .env
# fill in DATABASE_URL (local postgres or Railway)
# fill in NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

npx prisma migrate dev     # run migrations
npx prisma db seed         # optional seed
npm run dev                # start dev server → http://localhost:3000
```

## Migration commands

```bash
npx prisma migrate dev --name init      # create + apply migration locally
npx prisma migrate deploy               # apply migrations in production
npx prisma studio                       # GUI to browse DB
```

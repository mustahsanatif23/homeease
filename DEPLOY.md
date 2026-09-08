# Deploying HomeEase to Vercel

The local build uses SQLite, which **cannot** run on Vercel — serverless functions get a
read-only, throwaway filesystem, so the database file would vanish between requests. Deployment
therefore has one extra step: point the app at a hosted PostgreSQL database. The schema is
already portable, so nothing else changes.

Total time: about 10 minutes.

---

## 1. Create a Postgres database

Any of these work; pick one and copy the connection string.

- **Vercel Postgres** — in your Vercel dashboard: Storage → Create Database → Postgres. Vercel
  adds the environment variables to the project for you.
- **Neon** (neon.tech) — free tier, gives you a `postgresql://…` URL.
- **Supabase** (supabase.com) — free tier, use the *connection pooling* URL.

If your provider gives both a pooled and a direct URL, use the **pooled** one for `DATABASE_URL`.

## 2. Switch the Prisma provider

In the project folder:

```bash
npm run db:postgres
```

That rewrites one line in `prisma/schema.prisma` (`provider = "postgresql"`). Commit the change.
`npm run db:sqlite` switches it back for local work.

## 3. Create the tables and seed the demo data

Run this **from your machine**, pointed at the remote database, so the deployed site has content:

```bash
# macOS / Linux
DATABASE_URL="postgresql://…" npm run db:push
DATABASE_URL="postgresql://…" npm run db:seed

# Windows PowerShell
$env:DATABASE_URL="postgresql://…"; npm run db:push
$env:DATABASE_URL="postgresql://…"; npm run db:seed
```

The seed is safe to re-run — it clears and rebuilds the demo dataset.

## 4. Push the code to GitHub

```bash
git init
git add .
git commit -m "HomeEase"
git branch -M main
git remote add origin https://github.com/<you>/homeease.git
git push -u origin main
```

`.env` is git-ignored, which is what you want — secrets go in Vercel instead.

## 5. Import the project on Vercel

1. vercel.com → **Add New… → Project** → import the GitHub repository.
2. Framework preset: **Next.js** (detected automatically).
3. Build command: leave the default. `npm run build` already runs `prisma generate`.
4. Add the environment variables below, then **Deploy**.

### Environment variables

| Name | Value | Notes |
|---|---|---|
| `DATABASE_URL` | your Postgres connection string | Required |
| `AUTH_SECRET` | a long random string | Required — sessions are signed with it |
| `NEXT_PUBLIC_APP_URL` | `https://<your-project>.vercel.app` | Used in metadata and reset links |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set all three for **Production, Preview and Development**. Never reuse the development
`AUTH_SECRET` from `.env`.

## 6. Check it

Open the deployment and log in with `admin@homeease.demo` / `Password123`.
`https://<your-project>.vercel.app/api/health` returns the database status and row counts —
the quickest way to confirm the database connection.

**Change the demo passwords** before sharing the URL publicly. Admin → Users → Manage lets you
suspend the demo accounts, or create your own admin and delete them.

---

## Alternative: the Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link
vercel env add DATABASE_URL
vercel env add AUTH_SECRET
vercel env add NEXT_PUBLIC_APP_URL
vercel --prod
```

---

## Known differences on Vercel

| Behaviour | Local | Vercel |
|---|---|---|
| Database | SQLite file | Hosted Postgres (required) |
| Photo uploads | Written to `public/uploads` | Disabled — the wizard says so and the request still submits. Wire S3/Vercel Blob in `lib/storage.ts` to enable |
| Password reset email | Link printed in the terminal and shown on screen | Same — no mail provider is configured |
| Live status updates | Polling every 8–10 s | Same |

## Troubleshooting

**`PrismaClientInitializationError` on Vercel** — `DATABASE_URL` is missing or still points at
`file:./dev.db`. Check the project's environment variables, then redeploy.

**Build fails with "the URL must start with postgresql://"** — you ran the deploy before
`npm run db:postgres`; switch the provider, commit, push.

**Site loads but everything is empty** — step 3 wasn't run against the remote database.

**"Too many connections"** — use your provider's pooled connection string.

## Other hosts

The same app runs on Railway, Render or Fly.io without switching to Postgres, because those give
you a persistent disk — keep SQLite, mount a volume, and set `DATABASE_URL="file:/data/dev.db"`.

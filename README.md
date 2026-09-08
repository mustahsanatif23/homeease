# HomeEase — Smart Service. Better Living.

BAUST CSE FEST 2026 · Hackathon submission

HomeEase connects customers who need home services (AC repair, plumbing, electrical,
cleaning, appliance repair, pest control, painting, shifting) with verified providers,
and automates the parts a marketplace usually leaves to humans: **who should do this job,
when can they do it, what does it cost, and what happens next.**

It is a real full-stack application — a database, an auth system, a matching engine,
a scheduling engine with double-booking prevention, invoicing, reviews, notifications,
audit logs and analytics. Not a clickable mockup.

---

## Run it locally (3 commands)

Requires **Node.js 18.18+** (Node 20 or 22 recommended). Nothing else — the database is
a local SQLite file, so there is no Postgres/Docker setup.

```bash
npm install
npm run setup     # generates the Prisma client, creates the DB, seeds demo data
npm run dev
```

Open **http://localhost:3000**.

`npm run setup` is the only step that touches the database. If you ever want a clean
slate: `npm run db:reset`.

### Demo accounts

All demo accounts use the password **`Password123`**.

| Role | Email | What to look at |
|---|---|---|
| Customer | `customer@homeease.demo` | Booking wizard → matching screen → live tracking → invoice → review |
| Provider | `provider@homeease.demo` | Incoming jobs, accept/on-the-way/complete, calendar, earnings |
| Admin | `admin@homeease.demo` | Analytics, provider verification, and the matching weights page |

The login screen has one-click buttons for the customer and provider accounts.
There are also ~55 other seeded users (all with the same password) so ratings,
workloads and analytics have real data behind them.

---

## Interface

The whole product shares one hand-written design system (`app/globals.css`): a warm off-white
canvas, near-black ink, pill buttons, generous rounding and pastel data tiles, with the HomeEase
logo used across the public site, the auth screens, the app shell and printed invoices.

- **Public first.** Every visitor starts on the landing page — hero with service search, live
  platform stats, service categories, reasons to trust us, real customer reviews, FAQ and a
  closing call to action. Log in and Get started sit in the header, and the logo in the signed-in
  shell always takes you back to the main site.
- **Everything on your profile.** `/profile` is the account hub: your details, live counters
  (requests, completed jobs, total spent, favourites) and one-tap links to requests, bookings,
  history, invoices, favourites and notifications, plus password and session controls.
- **Live chat between customer and provider.** Every booking gets a thread. Both sides can
  message from the job page or the dedicated Messages section; the widget polls every four
  seconds, marks incoming messages read, badges the unread count in the sidebar and raises an
  in-app notification for the other party. Threads on cancelled or rejected jobs become read-only.
- **Back navigation everywhere.** Detail pages (request tracking, matching, service, provider,
  invoice, provider job, admin user) have a Back control that returns to the previous screen and
  falls back to a sensible route when the page was opened from a link.

## Input validation

The same rules run in the browser and on the server, so nothing can slip through:

| Field | Rule |
|---|---|
| Names | Letters, spaces and `.` `'` `-` only — digits and symbols are stripped as you type |
| Phone | Digits (with an optional leading `+`), 11–15 of them; anything else is filtered out |
| Email | Checked against a proper address pattern on blur, before the form is submitted |
| Prices, durations, radius, experience | Numeric inputs with enforced minimums and maximums |
| Passwords | At least 8 characters with a letter and a number, checked live |

Client-side rules live in `lib/validation.ts` and are applied by the `Field` component; the Zod
schemas in `schemas/index.ts` import the same patterns and messages, so a value that fails in the
browser fails identically on the server.

---

## The 60-second demo path

1. Log in as the customer → **Book a service** → pick *AC Repair*, describe the problem,
   choose tomorrow at 10:00, mark it **Urgent**.
2. On **Find My Best Match**, HomeEase scores every eligible provider and ranks them.
   Open *"Why this provider?"* — every score is broken down and explained in plain English.
3. Select a provider. The booking is created inside a transaction that re-checks the slot,
   so two customers can never take the same slot.
4. Open a second browser (or a private window), log in as the provider, and move the job
   through **Accept → On the way → Start work → Completed**.
5. Back on the customer tab, the timeline updates on its own, an invoice is generated
   automatically, and the review form appears. Leave a review — the provider's rating
   recalculates immediately.
6. Log in as admin → **Matching** → change the weights (they must total 100%) → book again
   and watch the ranking change.

---

## What makes it more than CRUD

**The matching engine** (`lib/core.mjs` + `services/matching.service.ts`)

Hard filters run first — the provider must offer the service, be approved and active, have
the location inside their service radius, work that day, and have a free slot that isn't
blocked by time off. Everything that survives is scored 0–1 on six signals:

| Signal | Default weight | What it measures |
|---|---|---|
| Availability | 30% | Exact slot free, or only a same-day alternative |
| Distance | 20% | Haversine distance against the provider's radius |
| Rating | 20% | Rating, damped by how many reviews back it up |
| Price | 15% | How close their price is to the service base price |
| Expertise | 10% | Declared expertise level for that service |
| Workload | 5% | Active jobs, jobs already booked that day, acceptance rate |

The weighted sum gives a 0–100 match score. For **urgent** requests, distance and
availability are multiplied by the urgency multipliers and all six weights are
renormalised back to 100%, so an urgent job genuinely prefers whoever can get there
fastest. Admins change all of this at runtime on `/admin/matching` — no redeploy.

**Scheduling that can't double-book.** Slot conflicts are checked three ways: in the
matching engine (so unavailable providers never appear), inside the booking transaction
(re-checked immediately before insert), and at the database level with a unique constraint
on `(providerId, scheduledDate, startTime)`. The Prisma `P2002` error is caught and turned
into a friendly "that slot was just taken" message.

**Explainable, not magic.** Every match carries the six sub-scores, the weights used, and
a list of human-readable reasons ("Available at your exact time", "3.2 km away — about 14
minutes", "4.8★ from 27 reviews"). The stored `RequestProviderMatch` rows keep the score
history for auditing.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run setup` | `prisma generate` + `db push` + `db seed` |
| `npm run db:reset` | Delete the SQLite file and re-seed from scratch |
| `npm run db:seed` | Re-seed only |
| `npm test` | Unit tests for the business logic (no database needed) |
| `npm run typecheck` | TypeScript check |

`npm test` covers the parts worth testing in isolation: distance and ETA maths, slot
generation and overlap detection, the booking state machine (including which actor may
make which transition), each scoring function, weight normalisation, urgency re-weighting,
pricing totals, rating recalculation and invoice numbering. **24 tests, all passing.**

---

## Tech stack and why

| Choice | Reason |
|---|---|
| Next.js 15 (App Router) | Server Components + Server Actions — one codebase, no separate API layer to keep in sync |
| Prisma + SQLite | Zero-setup local run; the schema is portable to Postgres by changing one line |
| Session auth (DB-backed) | httpOnly cookie holding an HMAC-hashed token, sessions revocable server-side |
| Zod | One schema validates the form and types the server action |
| Hand-written CSS | No build-time CSS pipeline to configure; the design system lives in `app/globals.css` |
| Plain-JS core (`lib/core.mjs`) | Business logic testable with `node --test` and zero dependencies |

### Switching to PostgreSQL

1. `npm run db:postgres` (rewrites the provider line; `npm run db:sqlite` switches back).
2. Set `DATABASE_URL` in `.env` to your Postgres URL.
3. `npm run db:push && npm run db:seed`.

Deploying to Vercel needs this switch — SQLite can't run on a serverless filesystem.
Full walkthrough in [DEPLOY.md](./DEPLOY.md).

No application code changes — the schema deliberately avoids SQLite-only assumptions
(enum-ish columns are strings validated in TypeScript, money is stored as integer taka).

---

## Project layout

```
app/            routes — (app) customer area, /provider, /admin, public pages
components/     UI primitives, forms, charts, shells
services/       server-only business services (matching, scheduling, booking, invoice…)
actions/        server actions — the only write path from the browser
lib/            core.mjs (pure logic), auth, session, db, formatting, errors
schemas/        Zod schemas shared by forms and actions
prisma/         schema + deterministic seed script
tests/          node:test unit tests for lib/core.mjs
```

More detail: [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATABASE.md](./DATABASE.md) · [API.md](./API.md) · [DEPLOY.md](./DEPLOY.md)

---

## Troubleshooting

**`@prisma/client did not initialize yet`** — run `npm run db:generate` (or `npm run setup`).

**Empty app after login** — the database wasn't seeded. Run `npm run setup`.

**Port 3000 in use** — `npm run dev -- -p 3001`.

**Prisma errors after editing the schema** — `npm run db:push` then `npm run db:generate`.

**Password reset** — email isn't configured in development, so the reset link is printed
in the terminal and shown on screen.

---

## Honest scope notes

- Payments are recorded, not processed — there is no payment gateway integration.
- Maps are distance/ETA calculations over seeded coordinates, not a live maps provider.
- "Real-time" updates are server-component revalidation on an interval, not websockets.
  Swapping in a socket only touches `components/Poller.tsx`.
- Uploaded images are stored on the local filesystem (`public/uploads`); `lib/storage.ts`
  has the seam for S3.

# Database

SQLite by default (`file:./dev.db`), portable to PostgreSQL by changing the provider in
`prisma/schema.prisma`.

## Models

| Model | Purpose |
|---|---|
| `User` | One table for all roles; `role` + `accountStatus` drive access |
| `Session` | Server-side sessions; the cookie token is stored hashed |
| `PasswordResetToken` | Single-use, expiring reset tokens |
| `CustomerProfile` / `ProviderProfile` | Role-specific data (business name, radius, rating, earnings) |
| `ServiceCategory` / `Service` | The catalog: base price and estimated duration per service |
| `ProviderService` | What a provider offers, at what price and expertise level |
| `ProviderAvailability` | Weekly working hours, one row per weekday |
| `ProviderTimeOff` | Dated blocks that remove slots |
| `SavedAddress` / `FavoriteProvider` | Customer conveniences |
| `ServiceRequest` | What the customer asked for, with coordinates and urgency |
| `RequestProviderMatch` | The ranked shortlist, with every sub-score kept for auditing |
| `Booking` | The scheduled job and its state machine |
| `Invoice` | Generated on completion; line items stored as integers |
| `Review` | Overall plus four sub-ratings; one per booking |
| `Message` | Chat between the customer and the provider, one thread per booking |
| `Notification` | In-app notifications, deduplicated |
| `AuditLog` | Every consequential state change |
| `MatchingConfiguration` | Runtime weights and fees (single `default` row) |

## Deliberate choices

**No Prisma enums.** SQLite doesn't support them. Enum-ish columns are `String`, and the
allowed values live in `lib/constants.ts` as `as const` arrays that produce TypeScript
union types, with Zod validating at the boundary. The result is the same safety, and the
schema stays portable.

**Money is `Int`, in whole taka.** No floating-point money anywhere.

**JSON is stored as a string** (`Notification.metadata`, `RequestProviderMatch.reason`),
parsed at the edge, for the same portability reason.

## Key constraints

- `Booking @@unique([providerId, scheduledDate, startTime])` — the database-level guarantee
  against double-booking, on top of the transactional re-check.
- `ProviderService @@unique([providerId, serviceId])`, `ProviderAvailability
  @@unique([providerId, dayOfWeek])`, `RequestProviderMatch @@unique([requestId, providerId])`,
  `Review` unique per booking, `FavoriteProvider` unique per pair.
- Indexes on every column the app filters or sorts by: booking status and date, request
  status, notification `(userId, read, createdAt)`, audit `createdAt`.

## Seed data

`prisma/seed.mjs` uses a seeded deterministic RNG, so everyone demoing gets the same
numbers. It creates 8 categories, 38 services, 31 customers, 25 providers (a mix of
approved, pending and rejected), around 120 requests spread over the past weeks with
matching bookings, invoices, reviews, notifications, time off, favourites and audit logs —
enough history that the analytics charts and provider rankings are meaningful.

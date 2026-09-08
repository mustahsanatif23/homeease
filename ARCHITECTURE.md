# Architecture

## Layers

```
Browser
  └── Server Components (app/**)         read data directly through services
  └── Client Components                  forms, wizard, charts, pollers
        └── Server Actions (actions/**)  the ONLY write path
              └── Services (services/**) business rules, transactions, notifications, audit
                    └── lib/core.mjs     pure functions (no I/O, unit tested)
                    └── Prisma           SQLite / PostgreSQL
```

There is no REST layer. Server Actions replace it: the browser calls a typed function,
the function validates with Zod, calls a service, and revalidates the affected paths.
Nothing in `app/**` writes to the database directly.

**`lib/core.mjs` is deliberately plain ESM JavaScript.** It holds every pure decision in
the product — distance, ETA, time arithmetic, slot generation, the booking state machine,
the six scoring functions, weight resolution, pricing and rating maths. Because it has no
imports and no I/O, it runs under `node --test` with no database, no build step and no
mocking, and it is imported unchanged by the TypeScript services.

## Request lifecycle

1. **Booking wizard** (client) collects the request and posts it to `createRequestAction`.
2. `request.service.ts` geocodes the area, prices an estimate and stores a `ServiceRequest`.
3. `matching.service.ts` runs hard filters, scores survivors, persists ranked
   `RequestProviderMatch` rows, and returns the candidates.
4. The customer picks one (or `autoAssign` takes rank 1). `booking.service.ts` opens a
   transaction, re-checks the slot, and creates the `Booking` — the unique index on
   `(providerId, scheduledDate, startTime)` is the last line of defence.
5. Status transitions run through `canTransition` / `canActorTransition`, so an invalid or
   unauthorised move is rejected in one place rather than in every route.
6. `COMPLETED` triggers idempotent invoice generation, provider stat updates and
   notifications, all inside the same transaction.
7. The review recalculates the provider's rating with an incremental average.

## Authorisation

- `middleware.ts` does a cheap cookie check to redirect obviously-unauthenticated traffic.
  It is a UX optimisation, **not** the security boundary.
- The real checks are server-side: `requireAuth`, `requireRole`, `requireApprovedProvider`,
  plus per-record ownership checks (`getRequestForCustomer` throws `ForbiddenError` when the
  request belongs to somebody else).
- Sessions are rows in the database; the cookie holds a random token and only its HMAC hash
  is stored, so a database leak doesn't hand over live sessions. Password changes and
  suspensions revoke every session for that user.

## Error handling

`lib/errors.ts` defines `AppError` and friends. `toUserMessage` converts anything thrown
into a sentence a customer can act on, and unknown errors degrade to a generic message
rather than leaking internals. Server actions return `{ ok, error, fieldErrors }` and the
form components render it — no unhandled promise rejections in the UI.

## Real-time

`components/Poller.tsx` calls `router.refresh()` on an interval while a job is live, which
re-runs the server component and streams new HTML. This is intentionally the smallest
possible surface: replacing it with a websocket subscription changes one file.

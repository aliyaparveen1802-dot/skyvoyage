# SkyVoyage API

Flight-booking backend for the SkyVoyage client (`../client`). Express 5 + TypeScript,
served under `/api`, returning the exact JSON shapes the client's
`src/services/api/*.ts` modules expect.

## Quick start

```bash
# from the repo root
npm install
cp server/.env.example server/.env   # already present in this checkout
npm run dev -w server                # tsx watch on http://localhost:4000
```

Other scripts (workspace `server`):

| Script | Purpose |
| --- | --- |
| `npm run dev` | `tsx watch src/index.ts` (dev) |
| `npm run build` | compile to `dist/` |
| `npm start` | run `dist/index.js` |
| `npm run typecheck` | `tsc --noEmit` (0 errors required) |
| `npm run lint` | `eslint .` |

## Environment (`server/.env`)

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `4000` | API port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | CORS origin (Vite dev server) |
| `JWT_SECRET` | `dev-secret-change-me` | HMAC secret for access tokens |
| `JWT_EXPIRES_IN` | `7d` | token lifetime |
| `OPENAI_API_KEY` | *(unset)* | enables `source: "live"` waiting advice |
| `OPENAI_MODEL` | `gpt-4o-mini` | model used when the key is set |
| `FLIGHT_SEARCH_PROVIDER` | `mock` | deterministic in-process offer generator |
| `FLIGHT_TRACKING_PROVIDER` | `mock` | demo schedule + status simulator |
| `PAYMENT_PROVIDER` | `mock` | Luhn-checked card simulation |
| `SUPABASE_*`, `MAPBOX_TOKEN`, `EMAIL_PROVIDER_API_KEY`, `STRIPE_SECRET_KEY` | *(unset)* | reserved for future live adapters |

The API runs fully with no optional keys. Anything not backed by a live
credential is labelled `source: "mock"` (or `live:false`) in the response and
uses deterministic seeded data — see “Mock vs live” below.

## Architecture

```
src/
  app.ts                  express app: helmet, cors, json, rate limits, routes, errors
  index.ts                dotenv + listen
  types.ts                DTOs (mirrors client/src/types/index.ts)
  controllers/            request → service orchestration, response shapes
  routes/                 path wiring + validation + auth/rate-limit middleware
  validators/             zod schemas (400 envelope on failure)
  middleware/             auth (JWT), validate, rateLimits, errorHandler
  services/               domain logic (search, seats, bookings, guide, advice, …)
  integrations/           providers: search, tracking, payment, email, calendar, ai
  database/               in-memory store + seeded reference data
  utils/                  prng, time (timezone-aware), geo, jwt, errors, ids
```

All non-2xx responses use the envelope `{ "error": { code, message, details? } }`.

Status codes: `400` validation · `401` auth · `402` payment declined ·
`403` forbidden · `404` not found · `409` conflict · `422` business rules ·
`429` rate limit · `500` unexpected.

## Endpoints (all under `/api`)

### Auth — `/auth` (rate-limited 20 req / 15 min)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | – | 201 `{ token, user }`; weak password → 422, duplicate → 409 |
| POST | `/auth/login` | – | `{ token, user }`; bad credentials → 401 |
| POST | `/auth/forgot-password` | – | always returns the same message (no account enumeration) |
| GET | `/auth/me` | ✓ | profile + preferences + saved passengers |
| PUT | `/auth/profile` | ✓ | partial name update |
| PUT | `/auth/preferences` | ✓ | partial preferences merge |
| POST | `/auth/passengers` | ✓ | 201 saved passenger (max 20) |
| DELETE | `/auth/passengers/:id` | – | 404 when unknown |

### Flights — `/flights`, `/airports`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/flights/search` | optional | 30-min TTL search; trip-type-aware legs |
| GET | `/flights/search/:searchId/offers/:offerId` | – | `{ offer, searchId }` |
| GET | `/flights/search/:searchId/offers/:offerId/segments/:segmentId/seats` | – | seat map, live hold/booking overrides |
| POST | `/flights/calendar` | – | cheapest price per day, `source: "mock"` |
| GET | `/airports?q=` | – | prefix/name search over 44 seeded airports |

### Bookings — `/bookings` (all authenticated)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/bookings/quote` | 201; seat hold per segment, 10-min TTL |
| POST | `/bookings/:quoteId/confirm-payment` | mock capture; declined card → 402 |
| GET | `/bookings` | list |
| GET | `/bookings/:reference` | single booking |
| GET | `/bookings/:reference/boarding-passes` | confirmed bookings only |
| POST | `/bookings/:reference/cancel` | refund recorded, seats released |
| POST | `/bookings/:reference/email-ticket` | queued to `/api/dev/outbox` |
| GET | `/bookings/:reference/calendar-events` | ICS-shaped events |

### Airport — `/airport`, `/ai`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET/POST | `/airport/guide?airport=&bookingReference=` | optional | 10-stage journey guide; GET *and* POST supported |
| POST | `/airport/guide/progress` | ✓ | toggle stage completion |
| GET | `/airport/facilities?airport=&category=&q=` | – | 15 seeded facilities for guide airports |
| POST | `/ai/waiting-advice` | – | buffer/bands + recommendations, `source` mock/live |

### Tracking, notifications, trips

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/tracking/flight?flight=&date=` | – | demo schedule simulation |
| GET | `/tracking/booking?reference=` | ✓ | `null` when no matching booking |
| GET | `/notifications` | ✓ | newest first |
| POST | `/notifications/:id/read` | ✓ | |
| POST | `/notifications/read-all` | ✓ | |
| GET/PUT | `/notifications/preferences` | ✓ | |
| GET/POST/DELETE | `/saved-flights` | ✓ | price-alert list |

### Dev

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/dev/health` | liveness probe |
| GET | `/api/dev/outbox` | captured “emails” (never actually sent) |

## Seat pricing

Computed server-side only (never trusted from the client):

| Cabin | Price |
| --- | --- |
| first, business | +Rs0 |
| premium | +Rs996 |
| economy window / aisle | +Rs664 |
| economy middle | +Rs0 |
| near-exit (economy rows 12–13) | +Rs1,494 |
| long-haul (flight > 360 min) | ×1.4 |

## Quote price formula

Documented in `bookingService.computeQuotePrice`:

```
flight   = (offer.base + offer.taxes + offer.fees)
           × (adults×1.0 + children×0.75 + infants×0.10)
seats    = Σ selected seat prices
baggage  = extraBaggageKg × Rs1,660 × (adults + children)
addons   = priority Rs996×seatPax + insurance Rs1,494×allPax + meal Rs747×seatPax
total    = round(flight + seats + baggage + addons)   # INR, no extra tax at quote
```

Offer taxes already embed a 12 % tax on base plus airport fees.

## Mock vs live

| Capability | Default | Label |
| --- | --- | --- |
| Flight search / offers | deterministic in-process generator | `source: "mock"`, `estimated: true` |
| Price calendar | same generator | `source: "mock"` |
| Flight tracking | demo schedule (11 flights, simulated delays/gates) | `live: false`, `source: "mock"` |
| Payments | mock capture (Luhn + expiry checks, test decline cards) | provider `mock` |
| Email | written to outbox, never sent | `source: "mock"` |
| Calendar export | generated events, no third-party push | – |
| Waiting advice | rule-based advisor | `source: "mock"`, `model: "rule-based-advisor"` |
| Waiting advice (with `OPENAI_API_KEY`) | OpenAI reply validated against a zod schema | `source: "live"` + model name; on failure falls back to mock and labels the model `"rule-based-advisor (OpenAI fallback)"` |

Guide stage `source` values: `booking` (demo counter/gate values, each carrying
the limitation “Counter and gate values are demo values assigned by the mock
provider.”), `signage` (indoor positioning unavailable), `airport_data`.

## Supabase migrations

`../supabase/migrations/`:

- `0001_init.sql` — full schema (users, airports, airlines, searches, quotes,
  seat holds, bookings, booked seats, saved flights, notifications, journey
  progress, email outbox) with RLS: reference tables publicly readable,
  user data service-role only.
- `0002_seed_airports.sql` — 44 airports with terminals/timezones/coordinates,
  plus `popular` / `guide_available` flags.

The running API uses the in-memory store (`src/database/store.ts`), not these
tables; the migrations define the equivalent persistent schema.

## Notable behaviours

- Seat holds are keyed `segmentId:seatId`, expire after 10 minutes, and are
  swept every 60 s. Confirming a quote requires holds to be intact, otherwise
  `409 quote_expired` / `409 seat_unavailable`.
- Quote seats are validated: one seat per passenger per segment, no duplicates,
  `passengers.length` must match the search's passenger counts
  (`422 passenger_count_mismatch`).
- Notifications are seeded on registration (welcome, tips, price alert, gate).
- Waiting advice buffer = `20 + walkMinutes` (walk = seeded source distance ÷
  70 m/min); recommendations are clamped so `minutesNeeded ≤ usableMinutes`.
- Boarding-pass `group` is derived from cabin: first → `A`, business → `B`,
  premium → `C`, economy → `Z`.

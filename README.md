# SkyVoyage

A full-stack flight booking and smart travel companion demo: React 19 + TypeScript + Vite + Tailwind CSS v4 client, Express + TypeScript backend with an in-memory store.

All flight data, prices, gates, terminal wait times and AI advice in this project are **mock/estimated sample data** and are labelled as such in the UI. No real payments are ever processed.

## Quick start

```bash
npm install
npm run dev          # client on http://localhost:5173, API on http://localhost:4000
```

Other commands (run from the repo root):

```bash
npm run build        # production build (client + server)
npm run typecheck    # strict TS check for both workspaces
npm run lint         # ESLint for both workspaces
npm run start        # start the built server (port 4000)
```

End-to-end API smoke test (server must be running):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\e2e-smoke.ps1
```

## Demo credentials

| | |
|---|---|
| Email | `demo@skyvoyage.app` |
| Password | `Demo1234!` |

The login screen's "Continue with the demo account" button creates this account on first use.

### Test cards

| Card | Result |
|---|---|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0002` | Declined by the gateway |

Any future expiry (e.g. `12/30`) and any 3-digit CVC. Nothing is charged and no card data leaves your machine — the "gateway" is simulated and **verified server-side** before a booking is created.

## Features

- **Search**: multi-trip-type flight search, autocomplete, passenger/cabin picker, price calendar, filters (stops, time, airlines, baggage, price), sorting, save-to-shortlist.
- **Booking flow**: flight details → seat map with held seats (10-min server-side hold) → passenger details + add-ons → checkout with server-verified payment.
- **Trips**: dashboard, my trips, trip detail, digital boarding passes with QR, cancellation, e-ticket download, email e-ticket (dev outbox), calendar events (.ics + Google Calendar).
- **Airport**: step-by-step airport guide with progress, airport explorer (terminals, facilities, maps), AI waiting-advice (rule-based, labelled `model: rule-based-advisor`).
- **Tracking**: live-style flight tracking with timeline and map (mock positions, labelled).
- **Account**: profile, preferences, saved passengers, notifications, saved flights, settings, help, onboarding.

## Architecture

```
skyvoyage/
├── client/          React 19 + Vite + Tailwind v4 (design tokens in src/styles/index.css)
│   └── src/
│       ├── pages/           route components (lazy-loaded in App.tsx)
│       ├── components/      UI + feature components
│       ├── context/         Auth, Booking (draft), Toast
│       ├── hooks/           react-query hooks (src/hooks/queries)
│       ├── services/api/    typed API client (single fetch wrapper)
│       └── types/           shared DTO contract mirrored by the server
├── server/          Express + tsx, in-memory store (src/database/store.ts)
│   ├── src/routes|controllers|services|validators
│   └── README.md            API surface notes
├── supabase/        optional SQL migrations/seed for a future Postgres backend
└── scripts/         e2e-smoke.ps1 (33-check API smoke test)
```

- API base: `http://localhost:4000/api` (dev proxy `/api` from Vite).
- Auth: bearer token from `/auth/register|login`; protected routes return `401`.
- Errors use the envelope `{ "error": { "code", "message", "details?" } }`.
- Seat holds: quoting holds seats for 10 minutes; re-quoting your own held seats is allowed.

## Security notes

- No secrets in the client bundle — payment simulation and all verification live on the server.
- Passwords are hashed (bcrypt) before storage.
- The dev outbox (`GET /api/dev/outbox`) exposes queued emails only in development.

-- SkyVoyage initial schema
-- Mirrors the in-memory store used by the API (server/src/database/store.ts).
-- The API is expected to run with the service-role key; user-owned tables have
-- RLS enabled without public policies so only the service role can read/write.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id            text primary key,
  email         text not null unique,
  password_hash text not null,
  first_name    text not null,
  last_name     text not null,
  created_at    timestamptz not null default now(),
  preferences   jsonb not null default '{}'::jsonb,
  passengers    jsonb not null default '[]'::jsonb
);

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------
create table if not exists public.airports (
  iata            text primary key check (iata ~ '^[A-Z]{3}$'),
  name            text not null,
  city            text not null,
  country         text not null,
  timezone        text not null,
  terminals       text[] not null default array['T1'],
  latitude        double precision not null,
  longitude       double precision not null,
  popular         boolean not null default false,
  guide_available boolean not null default false,
  created_at      timestamptz not null default now()
);

create table if not exists public.airlines (
  code       text primary key check (code ~ '^[A-Z]{2}$'),
  name       text not null,
  color      text not null default '#3B82F6',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Search (30 minute TTL in the API)
-- ---------------------------------------------------------------------------
create table if not exists public.flight_searches (
  id         text primary key,
  user_id    text references public.users (id) on delete set null,
  query      jsonb not null,
  offers     jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists flight_searches_expires_idx
  on public.flight_searches (expires_at);

-- ---------------------------------------------------------------------------
-- Quotes (10 minute TTL) and seat holds (10 minute TTL)
-- ---------------------------------------------------------------------------
create table if not exists public.quotes (
  id          text primary key,
  user_id     text not null references public.users (id) on delete cascade,
  search_id   text not null references public.flight_searches (id) on delete cascade,
  offer_id    text not null,
  trip_type   text not null check (trip_type in ('one-way', 'round-trip', 'multi-city')),
  status      text not null default 'open'
                check (status in ('open', 'confirmed', 'cancelled', 'expired')),
  payload     jsonb not null,
  price       jsonb not null,
  total       numeric(10, 2) not null,
  currency    text not null default 'USD',
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

create index if not exists quotes_expires_idx on public.quotes (expires_at);

create table if not exists public.seat_holds (
  id          text primary key,
  quote_id    text not null references public.quotes (id) on delete cascade,
  user_id     text not null references public.users (id) on delete cascade,
  segment_id  text not null,
  seat_id     text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  released_at timestamptz
);

-- Only one active hold per seat; expired holds must be swept (deleted) by the
-- API's retention job so the partial index stays accurate.
create unique index if not exists seat_holds_active_seat_idx
  on public.seat_holds (segment_id, seat_id)
  where released_at is null;

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id             text primary key,
  user_id        text not null references public.users (id) on delete cascade,
  reference      text not null unique,
  status         text not null default 'confirmed'
                   check (status in ('confirmed', 'cancelled')),
  offer          jsonb not null,
  passengers     jsonb not null,
  seats          jsonb not null,
  addons         jsonb not null default '{}'::jsonb,
  price          jsonb not null,
  gate           text not null,
  terminal       text not null,
  counter        text not null,
  payment_method text not null check (payment_method in ('card', 'wallet')),
  created_at     timestamptz not null default now(),
  cancelled_at   timestamptz,
  refunded_amount numeric(10, 2)
);

create index if not exists bookings_user_idx on public.bookings (user_id, created_at desc);

create table if not exists public.booked_seats (
  segment_id      text not null,
  seat_id         text not null,
  booking_id      text not null references public.bookings (id) on delete cascade,
  passenger_index integer not null check (passenger_index >= 0),
  primary key (segment_id, seat_id)
);

-- ---------------------------------------------------------------------------
-- Saved flights (price alerts)
-- ---------------------------------------------------------------------------
create table if not exists public.saved_flights (
  id           text primary key,
  user_id      text not null references public.users (id) on delete cascade,
  search_id    text not null,
  offer_id     text not null,
  flight_number text not null,
  route_label  text not null,
  departure_at timestamptz not null,
  price        numeric(10, 2) not null,
  currency     text not null default 'USD',
  created_at   timestamptz not null default now(),
  unique (user_id, offer_id)
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id         text primary key,
  user_id    text not null references public.users (id) on delete cascade,
  type       text not null check (type in (
               'checkin_available', 'gate_assigned', 'flight_delayed',
               'checkin_reminder', 'price_alert', 'boarding_reminder'
             )),
  title      text not null,
  body       text not null,
  data       jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Airport journey progress (guide stage completion)
-- ---------------------------------------------------------------------------
create table if not exists public.journey_progress (
  user_id    text not null references public.users (id) on delete cascade,
  booking_id text not null references public.bookings (id) on delete cascade,
  airport    text not null references public.airports (iata),
  terminal   text,
  completed  text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, booking_id, airport)
);

-- ---------------------------------------------------------------------------
-- Email outbox (demo mode never sends real email)
-- ---------------------------------------------------------------------------
create table if not exists public.email_outbox (
  id         text primary key,
  recipient  text not null,
  subject    text not null,
  body       text not null,
  kind       text not null,
  created_at timestamptz not null default now()
);

create index if not exists email_outbox_recipient_idx
  on public.email_outbox (recipient, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.flight_searches enable row level security;
alter table public.quotes enable row level security;
alter table public.seat_holds enable row level security;
alter table public.bookings enable row level security;
alter table public.booked_seats enable row level security;
alter table public.saved_flights enable row level security;
alter table public.notifications enable row level security;
alter table public.journey_progress enable row level security;
alter table public.email_outbox enable row level security;

alter table public.airports enable row level security;
alter table public.airlines enable row level security;

drop policy if exists "airports are readable" on public.airports;
create policy "airports are readable"
  on public.airports for select
  to anon, authenticated
  using (true);

drop policy if exists "airlines are readable" on public.airlines;
create policy "airlines are readable"
  on public.airlines for select
  to anon, authenticated
  using (true);

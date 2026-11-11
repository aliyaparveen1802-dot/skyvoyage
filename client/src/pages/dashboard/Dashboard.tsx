import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bell,
  Bookmark,
  CalendarClock,
  Compass,
  Plane,
  Radar,
  Search,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBookings } from '@/hooks/queries/useBookings';
import { useNotifications } from '@/hooks/queries/useNotifications';
import { AirlineLogo, PageHeader } from '@/components/common/Brand';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState, ErrorState } from '@/components/common/States';
import { formatDate, formatTime, pluralize, relativeTime } from '@/utils/format';
import type { Booking, FlightSegment } from '@/types';

function firstSegment(booking: Booking): FlightSegment | null {
  return booking.offer.legs[0]?.segments[0] ?? null;
}

function isUpcoming(booking: Booking, now: number): boolean {
  if (booking.status !== 'confirmed' && booking.status !== 'pending') return false;
  const segment = firstSegment(booking);
  if (!segment) return false;
  return new Date(segment.departureAt).getTime() > now;
}

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function StatCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-0.5 text-2xl font-bold text-ink">{value}</p>
        </div>
      </div>
      {hint && <p className="mt-3 border-t border-line pt-3 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const quickActions = [
  { to: '/', label: 'Search flights', description: 'Find and compare fares', icon: Search },
  { to: '/airport-explorer', label: 'Airport explorer', description: 'Lounges, dining and shops', icon: Compass },
  { to: '/saved-flights', label: 'Saved flights', description: 'Your shortlist of fares', icon: Bookmark },
  { to: '/notifications', label: 'Notifications', description: 'Alerts and gate changes', icon: Bell },
];

export default function Dashboard() {
  const { user } = useAuth();
  const now = new Date();
  const nowMs = now.getTime();
  const bookingsQuery = useBookings();
  const notificationsQuery = useNotifications();

  const bookings = bookingsQuery.data?.bookings ?? [];
  const unread = notificationsQuery.data?.unread ?? 0;
  const upcoming = bookings.filter((b) => isUpcoming(b, nowMs));
  const hero =
    bookings.find((b) => b.status === 'confirmed' && isUpcoming(b, nowMs)) ?? null;
  const heroSegment = hero ? firstSegment(hero) : null;

  const empty = !bookingsQuery.isLoading && !bookingsQuery.isError && bookings.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greetingFor(now)}, ${user?.firstName ?? 'traveler'}`}
        subtitle={formatDate(now.toISOString())}
      />

      {bookingsQuery.isError ? (
        <div className="card">
          <ErrorState
            title="We could not load your trips"
            description="Your bookings are temporarily unavailable."
            onRetry={() => void bookingsQuery.refetch()}
          />
        </div>
      ) : bookingsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-card" />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid gap-4 sm:grid-cols-3"
        >
          <StatCard
            icon={<Plane className="h-5 w-5" aria-hidden />}
            label="Upcoming trips"
            value={String(upcoming.length)}
            hint={upcoming.length > 0 ? 'Next departure ' + relativeTime(firstSegment(upcoming[0])!.departureAt) : 'Nothing on the horizon yet'}
          />
          <StatCard
            icon={<CalendarClock className="h-5 w-5" aria-hidden />}
            label="Total bookings"
            value={String(bookings.length)}
            hint={pluralize(bookings.length, 'booking') + ' on your account'}
          />
          <StatCard
            icon={<Bell className="h-5 w-5" aria-hidden />}
            label="Unread notifications"
            value={String(unread)}
            hint={unread > 0 ? 'Tap Alerts to catch up' : 'You are all caught up'}
          />
        </motion.div>
      )}

      {empty ? (
        <div className="card">
          <EmptyState
            icon={<Plane className="h-6 w-6" />}
            title="No bookings yet"
            description="Search hundreds of routes, compare fares and book your first trip — everything you book will show up here."
            action={
              <Link to="/search" className="btn-primary">
                Search flights <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            }
          />
        </div>
      ) : hero && heroSegment ? (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          aria-label="Upcoming trip"
          className="card overflow-hidden bg-navy text-white"
        >
          <div className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  Upcoming trip
                </span>
                <span className="flex items-center gap-2 text-sm text-white/85">
                  <AirlineLogo code={heroSegment.airlineCode} name={heroSegment.airlineName} size={28} />
                  {heroSegment.airlineName}
                </span>
                <span className="text-sm text-white/60">{heroSegment.flightNumber}</span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                <div>
                  <p className="text-3xl font-extrabold tracking-tight sm:text-4xl">{heroSegment.from.iata}</p>
                  <p className="mt-1 text-xs text-white/70">{heroSegment.from.city}</p>
                </div>
                <span className="flex items-center gap-2 text-white/50">
                  <span className="hidden h-px w-8 bg-white/30 sm:block" aria-hidden />
                  <Plane className="h-5 w-5 -rotate-45" aria-hidden />
                  <span className="hidden h-px w-8 bg-white/30 sm:block" aria-hidden />
                </span>
                <div>
                  <p className="text-3xl font-extrabold tracking-tight sm:text-4xl">{heroSegment.to.iata}</p>
                  <p className="mt-1 text-xs text-white/70">{heroSegment.to.city}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85">
                <span>{formatDate(heroSegment.departureAt, heroSegment.from.timezone)}</span>
                <span>
                  Dep {formatTime(heroSegment.departureAt, heroSegment.from.timezone)} ·{' '}
                  {heroSegment.from.timezone}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                  {relativeTime(heroSegment.departureAt)}
                </span>
                <span className="text-white/60">Ref {hero.reference}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to={`/my-trips/${hero.reference}`} className="btn-primary">
                View trip <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link to="/flight-tracking" className="btn-secondary">
                <Radar className="h-4 w-4" aria-hidden /> Track flight
              </Link>
              <Link to="/airport-guide" className="btn-secondary">
                <Compass className="h-4 w-4" aria-hidden /> Airport guide
              </Link>
            </div>
          </div>
        </motion.section>
      ) : !empty && !bookingsQuery.isLoading && !bookingsQuery.isError ? (
        <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">No confirmed trips yet</p>
            <p className="mt-1 text-sm text-muted">
              Bookings show up here as soon as they are confirmed, with check-in, boarding pass and
              tracking tools attached.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/my-trips" className="btn-secondary">
              My trips
            </Link>
            <Link to="/search" className="btn-primary">
              Search flights
            </Link>
          </div>
        </div>
      ) : null}

      <section aria-label="Quick actions">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Quick actions</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="card group flex items-start gap-3 p-4 transition hover:border-brand/40 hover:shadow-[0_0_24px_rgba(230,255,25,0.12)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-sm font-semibold text-ink">
                    {action.label}
                    <ArrowRight
                      className="h-3.5 w-3.5 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{action.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

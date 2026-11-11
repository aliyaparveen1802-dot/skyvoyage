import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Plane, PlaneLanding, PlaneTakeoff, Search } from 'lucide-react';
import { useBookings } from '@/hooks/queries/useBookings';
import { AirlineLogo, PageHeader } from '@/components/common/Brand';
import { Badge } from '@/components/common/Badge';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Tabs } from '@/components/common/Tabs';
import { CABINS } from '@/constants';
import { formatDuration, formatDate, formatMoney, formatTime, pluralize } from '@/utils/format';
import type { Booking, BookingStatus } from '@/types';

type TripTab = 'upcoming' | 'completed' | 'cancelled';

const STATUS_TONE: Record<BookingStatus, 'success' | 'warning' | 'error' | 'info'> = {
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'error',
  completed: 'info',
};

function firstSegment(booking: Booking) {
  return booking.offer.legs[0]?.segments[0] ?? null;
}

function departureTime(booking: Booking): number | null {
  const segment = firstSegment(booking);
  return segment ? new Date(segment.departureAt).getTime() : null;
}

function cabinLabel(cabin: Booking['cabin']): string {
  return CABINS.find((c) => c.value === cabin)?.label ?? cabin;
}

function TripCard({ booking, index }: { booking: Booking; index: number }) {
  const segment = firstSegment(booking);
  if (!segment) return null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2) }}
      className="card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AirlineLogo code={segment.airlineCode} name={segment.airlineName} size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{segment.airlineName}</p>
            <p className="truncate text-xs text-muted">
              {segment.flightNumber} · {cabinLabel(booking.cabin)}
            </p>
          </div>
        </div>
        <Badge tone={STATUS_TONE[booking.status]} dot>
          {booking.status}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div>
            <p className="text-xl font-bold text-ink sm:text-2xl">{segment.from.iata}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <PlaneTakeoff className="h-3.5 w-3.5" aria-hidden />
              {formatTime(segment.departureAt, segment.from.timezone)}
            </p>
          </div>
          <span className="flex flex-col items-center gap-1 text-muted">
            <span className="hidden h-px w-8 bg-line sm:block" aria-hidden />
            <Plane className="h-4 w-4 -rotate-45 text-brand" aria-hidden />
            <span className="hidden h-px w-8 bg-line sm:block" aria-hidden />
          </span>
          <div>
            <p className="text-xl font-bold text-ink sm:text-2xl">{segment.to.iata}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <PlaneLanding className="h-3.5 w-3.5" aria-hidden />
              {formatTime(segment.arrivalAt, segment.to.timezone)}
            </p>
          </div>
          <div className="hidden border-l border-line pl-4 sm:block">
            <p className="text-xs font-medium text-muted">Departure</p>
            <p className="mt-0.5 text-sm font-semibold text-ink">
              {formatDate(segment.departureAt, segment.from.timezone)}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-lg font-bold text-ink">
            {formatMoney(booking.price.total, booking.price.currency)}
          </p>
          <p className="text-xs text-muted">
            {pluralize(booking.passengers.length, 'passenger')} ·{' '}
            {booking.offer.stops === 0 ? 'Non-stop' : pluralize(booking.offer.stops, 'stop')}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <p className="text-xs text-muted">
          Ref {booking.reference} · {formatDuration(segment.durationMin)} in the air
        </p>
        <Link
          to={`/my-trips/${booking.reference}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
        >
          View details <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </motion.article>
  );
}

export default function MyTrips() {
  const [tab, setTab] = useState<TripTab>('upcoming');
  const { data, isLoading, isError, refetch } = useBookings();

  const bookings = data?.bookings ?? [];

  const filtered = useMemo(() => {
    const now = Date.now();
    const list = bookings.filter((booking) => {
      const departure = departureTime(booking);
      if (tab === 'cancelled') return booking.status === 'cancelled';
      if (tab === 'completed') {
        if (booking.status === 'completed') return true;
        return booking.status === 'confirmed' && departure !== null && departure <= now;
      }
      if (booking.status === 'cancelled' || booking.status === 'completed') return false;
      return departure === null || departure > now;
    });

    return list.sort((a, b) => {
      const da = departureTime(a) ?? 0;
      const db = departureTime(b) ?? 0;
      return tab === 'upcoming' ? da - db : db - da;
    });
  }, [bookings, tab]);

  const counts = useMemo(() => {
    const now = Date.now();
    let upcoming = 0;
    let completed = 0;
    let cancelled = 0;
    for (const booking of bookings) {
      const departure = departureTime(booking);
      if (booking.status === 'cancelled') {
        cancelled += 1;
      } else if (booking.status === 'completed' || (booking.status === 'confirmed' && departure !== null && departure <= now)) {
        completed += 1;
      } else {
        upcoming += 1;
      }
    }
    return { upcoming, completed, cancelled };
  }, [bookings]);

  const emptyTitle =
    tab === 'upcoming'
      ? 'No upcoming trips'
      : tab === 'completed'
        ? 'No completed trips yet'
        : 'No cancelled trips';

  const emptyDescription =
    tab === 'upcoming'
      ? 'When you book a flight it will appear here with check-in, boarding pass and tracking tools.'
      : tab === 'completed'
        ? 'Trips you have taken will be archived here once your last flight lands.'
        : 'Cancelled bookings are kept here for your records.';

  return (
    <div className="space-y-5">
      <PageHeader
        title="My trips"
        subtitle="Every booking, past and present, in one place."
        actions={
          <Link to="/search" className="btn-primary">
            <Search className="h-4 w-4" aria-hidden /> Search flights
          </Link>
        }
      />

      <Tabs
        ariaLabel="Filter trips"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'upcoming', label: 'Upcoming', count: counts.upcoming },
          { value: 'completed', label: 'Completed', count: counts.completed },
          { value: 'cancelled', label: 'Cancelled', count: counts.cancelled },
        ]}
      />

      {isError ? (
        <div className="card">
          <ErrorState
            title="We could not load your trips"
            description="Your bookings are temporarily unavailable."
            onRetry={() => void refetch()}
          />
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Plane className="h-6 w-6" />}
            title={emptyTitle}
            description={emptyDescription}
            action={
              tab === 'upcoming' ? (
                <Link to="/search" className="btn-primary">
                  Search flights <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : (
                <Link to="/search" className="btn-secondary">
                  Book a new trip
                </Link>
              )
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((booking, index) => (
            <TripCard key={booking.id} booking={booking} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

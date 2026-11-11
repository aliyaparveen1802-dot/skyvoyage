import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  DoorOpen,
  Info,
  Luggage,
  MapPin,
  Plane,
  PlaneTakeoff,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/common/Brand';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/FormFields';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState, ErrorState } from '@/components/common/States';
import { AIRPORTS_WITH_GUIDE, RETURN_GATE_BUFFER_MIN } from '@/constants';
import { useAirportGuide, useCompleteStage, useWaitingAdvice } from '@/hooks/queries/useAirport';
import { useBookings, useBoardingPasses } from '@/hooks/queries/useBookings';
import { useBookingTracking, useTracking } from '@/hooks/queries/useAirport';
import type {
  Booking,
  FlightTracking as FlightTrackingData,
  JourneyStage,
  JourneyStageId,
  TrackingStatus,
  WaitingAdvice,
} from '@/types';
import { cn } from '@/utils/cn';
import {
  formatDuration,
  formatDate,
  formatDateShort,
  formatTime,
  minutesUntil,
} from '@/utils/format';

const FLIGHT_NUMBER_PATTERN = /^[A-Z]{2}\s?\d{1,4}$/;

const STATUS_TONE: Record<TrackingStatus, 'neutral' | 'info' | 'warning' | 'error' | 'success'> = {
  scheduled: 'neutral',
  boarding: 'info',
  departed: 'info',
  enroute: 'info',
  landing: 'info',
  landed: 'success',
  delayed: 'warning',
  cancelled: 'error',
};

const STATUS_LABEL: Record<TrackingStatus, string> = {
  scheduled: 'Scheduled',
  boarding: 'Boarding',
  departed: 'Departed',
  enroute: 'In flight',
  landing: 'In flight',
  landed: 'Landed',
  delayed: 'Delayed',
  cancelled: 'Cancelled',
};

type StepBadge = 'completed' | 'progress' | 'upcoming';

interface JourneyStepDef {
  id: JourneyStageId;
  title: string;
  icon: typeof ClipboardCheck;
}

const JOURNEY_STEPS: JourneyStepDef[] = [
  { id: 'checkin', title: 'Check-in', icon: ClipboardCheck },
  { id: 'baggage', title: 'Baggage drop', icon: Luggage },
  { id: 'security', title: 'Security check', icon: ShieldCheck },
  { id: 'gate', title: 'Boarding gate', icon: DoorOpen },
  { id: 'boarding', title: 'Boarding & departure', icon: PlaneTakeoff },
];

function firstSegment(booking: Booking) {
  return booking.offer.legs[0]?.segments[0] ?? null;
}

function stepTimingLabel(
  stepId: JourneyStageId,
  stage: JourneyStage | undefined,
  boardingAt: string | null,
  checkInOpensAt: string | undefined,
): string | null {
  if (stepId === 'checkin' && checkInOpensAt) {
    return `Opens ${formatDateShort(checkInOpensAt)} · ${formatTime(checkInOpensAt)}`;
  }
  if (stepId === 'boarding' && boardingAt) {
    return `Boarding ${formatTime(boardingAt)}`;
  }
  if (stage) return `~${stage.estimatedMinutes} min`;
  return null;
}

function JourneyStepCard({
  def,
  stage,
  badge,
  boardingAt,
  checkInOpensAt,
  canMark,
  busy,
  onToggle,
  completed,
}: {
  def: JourneyStepDef;
  stage: JourneyStage | undefined;
  badge: StepBadge;
  boardingAt: string | null;
  checkInOpensAt: string | undefined;
  canMark: boolean;
  busy: boolean;
  onToggle: () => void;
  completed: boolean;
}) {
  const Icon = def.icon;
  const timing = stepTimingLabel(def.id, stage, boardingAt, checkInOpensAt);

  return (
    <li
      className={cn(
        'relative flex gap-4 rounded-card border bg-surface p-4 transition-colors sm:p-5',
        badge === 'completed' && 'border-success/40 bg-success-soft/40',
        badge === 'progress' && 'border-brand/60 ring-2 ring-brand/15',
        badge === 'upcoming' && 'border-line',
      )}
      aria-current={badge === 'progress' ? 'step' : undefined}
    >
      <div className="flex flex-col items-center">
        <span
          aria-hidden
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            badge === 'completed'
              ? 'bg-success text-navy'
              : badge === 'progress'
                ? 'bg-brand text-navy'
                : 'bg-canvas text-muted border border-line',
          )}
        >
          {badge === 'completed' ? <Check className="h-4.5 w-4.5" /> : <Icon className="h-4.5 w-4.5" />}
        </span>
        <span aria-hidden className="mt-2 w-px flex-1 bg-line last:hidden" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">{def.title}</h3>
          {badge === 'completed' && (
            <Badge tone="success">
              <Check className="h-3 w-3" aria-hidden /> Completed
            </Badge>
          )}
          {badge === 'progress' && <Badge tone="info">In progress</Badge>}
          {badge === 'upcoming' && <Badge tone="neutral">Upcoming</Badge>}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
          {timing ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {timing}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="text-muted/80">Not yet available</span>
            </span>
          )}
          {stage?.location ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {stage.location}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="text-muted/80">Location not yet available</span>
            </span>
          )}
        </div>

        {stage ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">{stage.task}</p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-muted/80">Instructions not yet available.</p>
        )}

        {stage && stage.instructions.length > 0 && (
          <ol className="mt-2.5 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink">
            {stage.instructions.map((instruction, i) => (
              <li key={i}>{instruction}</li>
            ))}
          </ol>
        )}

        <div className="mt-3.5">
          <Button
            variant={completed ? 'secondary' : 'primary'}
            size="sm"
            onClick={onToggle}
            loading={busy}
            disabled={!canMark}
            title={canMark ? undefined : 'Select a booked ticket to sync journey progress'}
            icon={completed ? <Check className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          >
            {completed ? 'Undo' : 'Mark as done'}
          </Button>
          {!canMark && (
            <p className="mt-1.5 text-xs text-muted">Select a ticket above to mark steps as done.</p>
          )}
        </div>
      </div>
    </li>
  );
}

function RouteSection({
  data,
  durationMin,
  onTrack,
  trackingRefetching,
}: {
  data: FlightTrackingData;
  durationMin: number | null;
  onTrack: () => void;
  trackingRefetching: boolean;
}) {
  const demo = !data.live || data.source === 'mock';
  const progress = Math.min(100, Math.max(0, data.progress));
  const showDepEstimate = data.estimatedDeparture && data.estimatedDeparture !== data.scheduledDeparture;
  const showArrEstimate = data.estimatedArrival && data.estimatedArrival !== data.scheduledArrival;

  return (
    <section id="route" className="card p-4 sm:p-5" aria-label="Flight route">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-white"
          >
            <Plane className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">
              {data.airlineName} {data.flightNumber}
            </h2>
            <p className="truncate text-xs text-muted">
              {data.origin.city} ({data.origin.iata}) → {data.destination.city} (
              {data.destination.iata})
              {durationMin !== null ? ` · ${formatDuration(durationMin)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[data.status]} dot>
            {STATUS_LABEL[data.status]}
          </Badge>
          {typeof data.delayMin === 'number' && data.delayMin > 0 && (
            <Badge tone="warning">+{data.delayMin} min delay</Badge>
          )}
          <Button
            variant="secondary"
            size="sm"
            loading={trackingRefetching}
            onClick={onTrack}
            icon={<Radar className="h-4 w-4" />}
          >
            Track flight
          </Button>
        </div>
      </div>

      {demo && (
        <div className="mt-4 flex gap-3 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3" role="status">
          <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand-dark" aria-hidden />
          <p className="text-sm font-medium text-brand-dark">
            Demo tracking data — not connected to a live flight data provider.
          </p>
        </div>
      )}

      {data.status === 'cancelled' && (
        <div className="mt-4 flex gap-3 rounded-xl border border-error/30 bg-error-soft px-4 py-3" role="alert">
          <XCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-error" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-error">Flight cancelled</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink">
              This flight is no longer operating. Contact your airline for rebooking options.
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-canvas p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Departure</p>
          <p className="mt-1.5 text-xl font-bold text-ink">{formatTime(data.scheduledDeparture)}</p>
          <p className="text-xs text-muted">
            {data.origin.iata} · {formatDate(data.scheduledDeparture, data.origin.timezone)}
          </p>
          {showDepEstimate ? (
            <p className="mt-2 text-sm font-semibold text-warning">
              Est. {formatTime(data.estimatedDeparture!, data.origin.timezone)}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted">On schedule</p>
          )}
        </div>
        <div className="rounded-xl border border-line bg-canvas p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Arrival</p>
          <p className="mt-1.5 text-xl font-bold text-ink">{formatTime(data.scheduledArrival)}</p>
          <p className="text-xs text-muted">
            {data.destination.iata} · {formatDate(data.scheduledArrival, data.destination.timezone)}
          </p>
          {showArrEstimate ? (
            <p className="mt-2 text-sm font-semibold text-warning">
              Est. {formatTime(data.estimatedArrival!, data.destination.timezone)}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted">On schedule</p>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-ink">{data.origin.iata}</p>
            <p className="text-xs text-muted">{formatTime(data.scheduledDeparture)}</p>
          </div>
          <div className="relative flex-1 px-1">
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Flight progress"
            >
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <Plane
              aria-hidden
              className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 text-brand drop-shadow-[0_0_6px_rgba(230,255,25,0.55)] transition-[left] duration-700"
              style={{ left: `${progress}%` }}
            />
            <p className="mt-2 text-center text-xs text-muted">
              {Math.round(progress)}% of route completed
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-ink">{data.destination.iata}</p>
            <p className="text-xs text-muted">{formatTime(data.scheduledArrival)}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-canvas px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Gate</p>
          <p className={cn('mt-1 text-base font-semibold', data.gate ? 'text-ink' : 'text-muted')}>
            {data.gate ?? 'Not yet available'}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-canvas px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Terminal</p>
          <p className={cn('mt-1 text-base font-semibold', data.terminal ? 'text-ink' : 'text-muted')}>
            {data.terminal ?? 'Not yet available'}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-canvas px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Baggage belt</p>
          <p
            className={cn('mt-1 text-base font-semibold', data.baggageBelt ? 'text-ink' : 'text-muted')}
          >
            {data.baggageBelt ?? 'Not yet available'}
          </p>
        </div>
      </div>
    </section>
  );
}

function WaitingAdvicePanel({ advice }: { advice: WaitingAdvice }) {
  const returnBy = new Date(
    new Date(advice.boardingAt).getTime() - advice.bufferMinutes * 60_000,
  );
  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2" role="list" aria-label="Waiting time summary">
        <span className="chip chip-active" role="listitem">
          {advice.availableMinutes} min until boarding
        </span>
        <span className="chip" role="listitem">
          {advice.bufferMinutes} min gate buffer
        </span>
        <span className="chip" role="listitem">
          {advice.usableMinutes} min usable
        </span>
      </div>
      <div className="rounded-xl border border-line bg-canvas px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Return-to-gate buffer
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink">
          <span className="font-semibold">{formatTime(advice.boardingAt)}</span>
          <span className="text-muted">boarding</span>
          <span className="text-muted">−</span>
          <span className="font-semibold">{advice.bufferMinutes} min</span>
          <span className="text-muted">buffer</span>
          <ArrowRight className="h-4 w-4 text-brand" aria-hidden />
          <span className="font-semibold text-brand-dark">
            back at gate by {formatTime(returnBy.toISOString())}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Anything you do must fit inside {advice.usableMinutes} usable minutes so you return{' '}
          {advice.bufferMinutes} minutes before boarding starts.
        </p>
      </div>
      <div className="flex gap-2.5 rounded-xl bg-warning-soft px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
        <p className="text-[13px] leading-relaxed text-ink">{advice.safetyNote}</p>
      </div>
      <p className="text-xs text-muted">
        {advice.source === 'mock'
          ? 'Local demo assistant — not an AI API response'
          : `Generated by ${advice.model}`}
      </p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-line bg-canvas px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={cn('mt-1 text-base font-semibold', value ? 'text-ink' : 'text-muted')}>
        {value ?? 'Not yet available'}
      </p>
    </div>
  );
}

export default function FlightTracking() {
  const { flightNumber: routeFlightNumber } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const bookingsQuery = useBookings();

  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const bookings = useMemo(() => bookingsQuery.data?.bookings ?? [], [bookingsQuery.data]);
  const trackable = useMemo(
    () => bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending'),
    [bookings],
  );

  const bookingRefParam = searchParams.get('booking');
  const selectedBooking = useMemo(
    () => trackable.find((b) => b.reference === bookingRefParam) ?? null,
    [trackable, bookingRefParam],
  );

  const manualFlight = routeFlightNumber ? routeFlightNumber.trim().toUpperCase() : undefined;

  useEffect(() => {
    if (manualFlight) setInput(manualFlight);
  }, [manualFlight]);

  useEffect(() => {
    if (
      !manualFlight &&
      !bookingRefParam &&
      trackable.length > 0
    ) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('booking', trackable[0].reference);
          return next;
        },
        { replace: true },
      );
    }
  }, [manualFlight, bookingRefParam, trackable, setSearchParams]);

  const selectedSegment = selectedBooking ? firstSegment(selectedBooking) : null;
  const activeFlight =
    selectedSegment?.flightNumber ?? manualFlight;
  const activeDate = selectedSegment
    ? selectedSegment.departureAt.slice(0, 10)
    : undefined;

  const bookingTrackingQuery = useBookingTracking(selectedBooking?.reference);
  const manualTrackingQuery = useTracking(
    !selectedBooking ? activeFlight : undefined,
    activeDate,
  );
  const trackingQuery = selectedBooking ? bookingTrackingQuery : manualTrackingQuery;
  const tracking = trackingQuery.data ?? null;

  const originIata = selectedSegment?.from.iata ?? tracking?.origin.iata ?? null;
  const guideSupported = !!originIata && AIRPORTS_WITH_GUIDE.includes(originIata);

  const guideQuery = useAirportGuide({
    airport: guideSupported ? originIata : '',
    bookingReference: selectedBooking?.reference,
  });
  const guide = guideQuery.data ?? null;
  const completeStage = useCompleteStage();
  const adviceMutation = useWaitingAdvice();
  const passesQuery = useBoardingPasses(selectedBooking?.reference);
  const boardingPass = passesQuery.data?.passes[0] ?? null;

  const stagesById = useMemo(() => {
    const map = new Map<JourneyStageId, JourneyStage>();
    for (const stage of guide?.stages ?? []) map.set(stage.id, stage);
    return map;
  }, [guide]);

  const completedIds = useMemo(
    () => new Set(guide?.progress?.completed ?? []),
    [guide],
  );

  const currentStepId = useMemo(() => {
    for (const def of JOURNEY_STEPS) {
      if (!completedIds.has(def.id) && stagesById.has(def.id)) return def.id;
    }
    return null;
  }, [completedIds, stagesById]);

  const badgeFor = (id: JourneyStageId): StepBadge => {
    if (completedIds.has(id)) return 'completed';
    if (currentStepId === id) return 'progress';
    return 'upcoming';
  };

  const boardingAt = guide?.boardingAt ?? boardingPass?.boardingAt ?? null;
  const gate = guide?.gate ?? boardingPass?.gate ?? tracking?.gate ?? null;
  const terminal = guide?.terminal ?? boardingPass?.terminal ?? tracking?.terminal ?? null;
  const counter = guide?.counter ?? null;
  const airportName = guide?.airport.name ?? tracking?.origin.name ?? null;
  const canMark = !!selectedBooking && guideSupported;

  const handleManualSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = input.trim().toUpperCase();
    if (!FLIGHT_NUMBER_PATTERN.test(value)) {
      setError('Enter a valid flight number, e.g. AI 302 or SQ12.');
      return;
    }
    setError(null);
    const next = new URLSearchParams(searchParams);
    next.delete('booking');
    navigate({
      pathname: `/flight-tracking/${encodeURIComponent(value)}`,
      search: next.toString() ? `?${next.toString()}` : '',
    });
  };

  const selectBooking = (booking: Booking) => {
    setError(null);
    const next = new URLSearchParams(searchParams);
    next.set('booking', booking.reference);
    setSearchParams(next);
    navigate({ pathname: '/flight-tracking', search: next.toString() ? `?${next.toString()}` : '' });
  };

  const handleTrack = () => {
    trackingQuery.refetch();
    document.getElementById('route')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const journeyLoading = guideSupported && guideQuery.isLoading;
  const journeyError = guideSupported && guideQuery.isError;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flight tracking"
        subtitle="Your tickets, live route and airport journey in one place"
        actions={
          activeFlight ? (
            <Badge tone="navy">
              <Radar className="h-3.5 w-3.5" aria-hidden /> {activeFlight}
            </Badge>
          ) : undefined
        }
      />

      <section aria-label="My tickets" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">My tickets</h2>
          <Link to="/search" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
            Search flights <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {bookingsQuery.isLoading && (
          <div className="grid gap-3 lg:grid-cols-2" aria-busy="true" aria-label="Loading tickets">
            <Skeleton className="h-36 w-full rounded-card" />
            <Skeleton className="h-36 w-full rounded-card" />
          </div>
        )}

        {bookingsQuery.isError && (
          <div className="card">
            <ErrorState
              title="We could not load your tickets"
              description="Your bookings are temporarily unavailable."
              onRetry={() => void bookingsQuery.refetch()}
            />
          </div>
        )}

        {!bookingsQuery.isLoading && !bookingsQuery.isError && trackable.length === 0 && (
          <div className="card">
            <EmptyState
              icon={<PlaneTakeoff className="h-6 w-6" />}
              title="No booked tickets yet"
              description="Book a flight and it will appear here — select a ticket to see its route, airport journey and waiting times."
              action={
                <Link to="/search" className="btn-primary">
                  <Search className="h-4 w-4" aria-hidden /> Search flights
                </Link>
              }
            />
          </div>
        )}

        {!bookingsQuery.isLoading && !bookingsQuery.isError && trackable.length > 0 && (
          <div className="grid gap-3 lg:grid-cols-2">
            {trackable.map((booking) => {
              const segment = firstSegment(booking);
              if (!segment) return null;
              const selected = selectedBooking?.reference === booking.reference && !manualFlight;
              return (
                <button
                  key={booking.id}
                  type="button"
                  onClick={() => selectBooking(booking)}
                  aria-pressed={selected}
                  aria-label={`Select ticket ${booking.reference} for flight ${segment.flightNumber}`}
                  className={cn(
                    'card w-full p-4 text-left transition-all sm:p-5',
                    selected
                      ? 'border-brand/70 ring-2 ring-brand/20'
                      : 'hover:border-brand/40 hover:bg-brand-soft/30',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink">{segment.airlineName}</p>
                        <Badge tone={booking.status === 'confirmed' ? 'success' : 'warning'} dot>
                          {booking.status}
                        </Badge>
                        {selected && <Badge tone="info">Selected</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {segment.flightNumber} · Ref {booking.reference}
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                        selected ? 'border-brand bg-brand text-navy' : 'border-line bg-canvas text-muted',
                      )}
                    >
                      {selected ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-3">
                    <div>
                      <p className="text-xl font-bold text-ink">{segment.from.iata}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatTime(segment.departureAt, segment.from.timezone)} ·{' '}
                        {formatDateShort(segment.departureAt)}
                      </p>
                    </div>
                    <span aria-hidden className="mb-2 hidden h-px w-10 bg-line sm:block" />
                    <div>
                      <p className="text-xl font-bold text-ink">{segment.to.iata}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatTime(segment.arrivalAt, segment.to.timezone)} ·{' '}
                        {formatDateShort(segment.arrivalAt)}
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xs text-muted">{formatDuration(segment.durationMin)}</p>
                      <p className="text-xs text-muted">
                        {booking.offer.stops === 0 ? 'Non-stop' : `${booking.offer.stops} stop`}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="card p-4 sm:p-5" aria-label="Manual flight search">
        <p className="text-[13px] font-medium text-ink">Track another flight</p>
        <p className="mt-0.5 text-xs text-muted">Secondary — search any flight number without a ticket.</p>
        <form onSubmit={handleManualSubmit} noValidate className="mt-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Flight number"
                placeholder="e.g. AI 302"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value.toUpperCase());
                  if (error) setError(null);
                }}
                error={error ?? undefined}
                hint="Two-letter airline code followed by 1–4 digits"
                aria-label="Flight number"
                autoComplete="off"
              />
            </div>
            <Button type="submit" className="sm:mb-0" icon={<Search className="h-4 w-4" />}>
              Search
            </Button>
          </div>
        </form>
      </section>

      {!activeFlight && (
        <div className="card">
          <EmptyState
            icon={<Radar className="h-6 w-6" />}
            title="No flight selected"
            description="Select a ticket above — or enter a flight number — to see the route, airport journey and waiting times."
          />
        </div>
      )}

      {activeFlight && trackingQuery.isLoading && (
        <div className="space-y-4" aria-busy="true" aria-label="Loading flight tracking">
          <Skeleton className="h-64 w-full rounded-card" />
          <Skeleton className="h-48 w-full rounded-card" />
        </div>
      )}

      {activeFlight && trackingQuery.isError && (
        <div className="card">
          <ErrorState
            title={`Could not track ${activeFlight}`}
            description="We could not fetch this flight's status. Check the flight number and try again."
            onRetry={() => trackingQuery.refetch()}
          />
        </div>
      )}

      {activeFlight && tracking && (
        <RouteSection
          data={tracking}
          durationMin={selectedSegment?.durationMin ?? null}
          onTrack={handleTrack}
          trackingRefetching={trackingQuery.isFetching}
        />
      )}

      {activeFlight && (
        <section aria-label="Your airport journey" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
                Your airport journey
              </h2>
              <p className="mt-1 text-[13px] text-muted">
                {airportName ? `${airportName}${originIata ? ` (${originIata})` : ''}` : 'Airport'}
                {' · '}5 steps from check-in to departure
              </p>
            </div>
            {guide?.source === 'mock' && (
              <span className="chip">
                <Info className="h-3 w-3" aria-hidden /> Demo guidance
              </span>
            )}
          </div>

          {journeyLoading && (
            <div className="space-y-3" aria-busy="true" aria-label="Loading airport journey">
              <Skeleton className="h-32 w-full rounded-card" />
              <Skeleton className="h-32 w-full rounded-card" />
              <Skeleton className="h-32 w-full rounded-card" />
            </div>
          )}

          {journeyError && (
            <div className="card">
              <ErrorState
                title="Could not load the airport journey"
                description="Guidance for this airport is unavailable right now."
                onRetry={() => guideQuery.refetch()}
              />
            </div>
          )}

          {!journeyLoading && !journeyError && (
            <>
              {guide && guide.limitations.length > 0 && (
                <div
                  className="flex gap-3 rounded-card border border-brand/30 bg-brand-soft px-4 py-3"
                  role="status"
                >
                  <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand-dark" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-dark">
                      Demo airport guidance — indoor positioning is unavailable; directions use
                      terminal signage.
                    </p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-snug text-brand-dark/90">
                      {guide.limitations.map((limitation) => (
                        <li key={limitation}>{limitation}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {!guideSupported && (
                <div className="flex gap-3 rounded-card border border-line bg-canvas px-4 py-3" role="status">
                  <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-muted" aria-hidden />
                  <p className="text-sm text-muted">
                    Step-by-step guidance is not published for this airport yet. Times and
                    locations show “Not yet available”.
                  </p>
                </div>
              )}

              <ol className="space-y-3">
                {JOURNEY_STEPS.map((def) => {
                  const stage = stagesById.get(def.id);
                  const badge = badgeFor(def.id);
                  const completed = completedIds.has(def.id);
                  return (
                    <JourneyStepCard
                      key={def.id}
                      def={def}
                      stage={stage}
                      badge={badge}
                      boardingAt={boardingAt}
                      checkInOpensAt={selectedBooking?.checkInOpensAt}
                      canMark={canMark}
                      busy={
                        completeStage.isPending &&
                        completeStage.variables?.stageId === def.id
                      }
                      completed={completed}
                      onToggle={() => {
                        if (!selectedBooking || !guideSupported) return;
                        const airport = originIata;
                        if (!airport) return;
                        completeStage.mutate(
                          {
                            bookingReference: selectedBooking.reference,
                            airport,
                            stageId: def.id,
                            done: !completed,
                          },
                        );
                      }}
                    />
                  );
                })}
              </ol>
            </>
          )}
        </section>
      )}

      {activeFlight && (
        <section aria-label="Waiting time and airport info" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
              Waiting time & airport info
            </h2>
            {boardingAt && (
              <span className="chip">
                <Clock className="h-3 w-3" aria-hidden />{' '}
                {Math.max(0, minutesUntil(boardingAt))} min to boarding
              </span>
            )}
          </div>

          <div className="card p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Fact label="Airport" value={airportName} />
              <Fact label="Terminal" value={terminal} />
              <Fact label="Gate" value={gate} />
              <Fact label="Check-in counter" value={counter} />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Fact
                label="Boarding time"
                value={boardingAt ? formatTime(boardingAt) : null}
              />
              <Fact
                label="Departure"
                value={
                  tracking
                    ? `${formatTime(tracking.scheduledDeparture)} · ${tracking.origin.iata}`
                    : null
                }
              />
              <Fact
                label="Baggage belt"
                value={tracking?.baggageBelt ?? null}
              />
              <Fact
                label="Gate buffer"
                value={boardingAt ? `${RETURN_GATE_BUFFER_MIN} min before boarding` : null}
              />
            </div>

            <div className="mt-5 border-t border-line pt-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Sparkles className="h-4 w-4 text-brand" aria-hidden />
                    While you wait
                  </h3>
                  <p className="mt-1 text-[13px] text-muted">
                    {boardingAt
                      ? `Boarding at ${formatTime(boardingAt)}${terminal ? ` · Terminal ${terminal}` : ''}${gate ? ` · Gate ${gate}` : ''} — safe buffer ${RETURN_GATE_BUFFER_MIN} min.`
                      : 'Boarding time is not yet available for this flight.'}
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  loading={adviceMutation.isPending}
                  disabled={!boardingAt || !terminal}
                  title={
                    boardingAt && terminal
                      ? undefined
                      : 'Waiting-time advice needs your boarding time and terminal assignment'
                  }
                  onClick={() =>
                    adviceMutation.mutate({
                      airport: originIata ?? '',
                      terminal: terminal ?? '',
                      boardingAt: boardingAt ?? '',
                      gate,
                      bookingReference: selectedBooking?.reference,
                    })
                  }
                >
                  Get waiting-time advice
                </Button>
              </div>

              {adviceMutation.isError && (
                <p className="mt-3 rounded-xl bg-error-soft px-4 py-3 text-sm text-error" role="alert">
                  Waiting-time advice is unavailable right now. Please try again shortly.
                </p>
              )}

              {adviceMutation.data && <WaitingAdvicePanel advice={adviceMutation.data} />}

              {!adviceMutation.data && !adviceMutation.isPending && !adviceMutation.isError && (
                <p className="mt-3 text-[13px] text-muted">
                  {boardingAt && terminal
                    ? 'Get suggestions sized to the time you have before boarding — always with a safe return-to-gate buffer.'
                    : 'Not yet available — waiting-time advice appears once boarding time and terminal are assigned.'}
                </p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

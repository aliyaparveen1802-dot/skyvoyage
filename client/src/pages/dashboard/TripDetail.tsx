import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Ban,
  CalendarPlus,
  CreditCard,
  Mail,
  Navigation,
  Plane,
  Radar,
  Ticket,
  Users,
} from 'lucide-react';
import { bookingsApi } from '@/services/api/bookings';
import { useBooking, useCalendarEvents, useEmailTicket } from '@/hooks/queries/useBookings';
import { useToast } from '@/context/ToastContext';
import { AirlineLogo, PageHeader } from '@/components/common/Brand';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState, ErrorState } from '@/components/common/States';
import { buildIcs, downloadTextFile } from '@/utils/calendar';
import {
  formatDuration,
  formatDate,
  formatMoney,
  formatTime,
  pluralize,
  relativeTime,
} from '@/utils/format';
import { CABINS } from '@/constants';
import type {
  AddonsSelection,
  Booking,
  BookingStatus,
  PaymentStatus,
  PriceBreakdown,
} from '@/types';

const STATUS_TONE: Record<BookingStatus, 'success' | 'warning' | 'error' | 'info'> = {
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'error',
  completed: 'info',
};

const PAYMENT_TONE: Record<PaymentStatus, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  pending: 'warning',
  authorized: 'info',
  captured: 'success',
  failed: 'error',
  refunded: 'neutral',
};

function cabinLabel(cabin: Booking['cabin']): string {
  return CABINS.find((c) => c.value === cabin)?.label ?? cabin;
}

function stopsLabel(stops: number): string {
  return stops === 0 ? 'Non-stop' : pluralize(stops, 'stop');
}

function addonList(addons: AddonsSelection): string[] {
  const items: string[] = [];
  if (addons.extraBaggageKg > 0) items.push(`Extra baggage +${addons.extraBaggageKg} kg`);
  if (addons.seatSelection) items.push('Seat selection');
  if (addons.meal !== 'none') items.push(`Meal: ${addons.meal}`);
  if (addons.specialAssistance !== 'none') items.push(`Assistance: ${addons.specialAssistance}`);
  if (addons.priorityBoarding) items.push('Priority boarding');
  if (addons.travelInsurance) items.push('Travel insurance');
  return items;
}

function FareRow({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{formatMoney(value, currency)}</span>
    </div>
  );
}

function FareBreakdown({ price }: { price: PriceBreakdown }) {
  return (
    <div>
      <div className="space-y-0.5">
        <FareRow label="Base fare" value={price.base} currency={price.currency} />
        <FareRow label="Taxes" value={price.taxes} currency={price.currency} />
        <FareRow label="Airport fees" value={price.fees} currency={price.currency} />
        <FareRow label="Seats" value={price.seats} currency={price.currency} />
        <FareRow label="Baggage" value={price.baggage} currency={price.currency} />
        <FareRow label="Add-ons" value={price.addons} currency={price.currency} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 border-t border-line pt-3">
        <span className="text-sm font-bold text-ink">Total</span>
        <span className="text-lg font-bold text-ink">
          {formatMoney(price.total, price.currency)}
        </span>
      </div>
      <p className="mt-1 text-right text-xs text-muted">Charged in {price.currency}</p>
    </div>
  );
}

export default function TripDetail() {
  const { reference } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);

  const bookingQuery = useBooking(reference);
  const calendarQuery = useCalendarEvents(reference);
  const emailMutation = useEmailTicket(reference);

  const cancelMutation = useMutation({
    mutationFn: (ref: string) => bookingsApi.cancel(ref),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setCancelOpen(false);
      toast({
        title: 'Booking cancelled',
        description: `Booking ${reference ?? ''} has been cancelled.`,
        variant: 'success',
      });
      navigate('/my-trips');
    },
    onError: (error: Error) => {
      toast({ title: 'Could not cancel booking', description: error.message, variant: 'error' });
    },
  });

  const booking = bookingQuery.data?.booking;

  const handleEmailTicket = () => {
    emailMutation.mutate(undefined, {
      onSuccess: (data) => {
        toast({ title: 'Ticket emailed', description: data.message, variant: 'success' });
      },
      onError: (error: Error) => {
        toast({ title: 'Could not email ticket', description: error.message, variant: 'error' });
      },
    });
  };

  const handleCalendar = () => {
    const events = calendarQuery.data?.events ?? [];
    if (events.length === 0) {
      toast({
        title: 'Nothing to download yet',
        description: 'Calendar events for this trip are not available right now.',
        variant: 'info',
      });
      return;
    }
    const ics = buildIcs(
      events.map((event, index) => ({
        uid: `${reference ?? 'trip'}-${index}`,
        title: event.title,
        description: event.description,
        location: event.location,
        start: event.start,
        end: event.end,
      })),
    );
    downloadTextFile(`skyvoyage-${reference ?? 'trip'}.ics`, ics);
    toast({
      title: 'Calendar downloaded',
      description: `${pluralize(events.length, 'event')} saved as an .ics file.`,
      variant: 'success',
    });
  };

  const handleBack = () => {
    const historyState = window.history.state as { idx?: number } | null;
    if (typeof historyState?.idx === 'number' && historyState.idx > 0) {
      navigate(-1);
    } else {
      navigate('/my-trips');
    }
  };

  if (bookingQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56 rounded-xl" />
        <Skeleton className="h-44 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  if (bookingQuery.isError || !booking) {
    return (
      <div className="card">
        <ErrorState
          title="Booking not found"
          description="We could not find this trip. It may have been removed or the link is out of date."
          onRetry={() => void bookingQuery.refetch()}
        />
      </div>
    );
  }

  const firstSegment = booking.offer.legs[0]?.segments[0] ?? null;
  const firstFlightNumber = firstSegment?.flightNumber ?? null;
  const cancellable = booking.status === 'confirmed' || booking.status === 'pending';
  const addons = addonList(booking.addons);

  return (
    <div className="space-y-5">
      <div>
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={handleBack}>
          Back
        </Button>
      </div>

      <PageHeader
        title={`Trip ${booking.reference}`}
        subtitle={`Booked ${formatDate(booking.createdAt)} · ${cabinLabel(booking.cabin)} · ${pluralize(
          booking.passengers.length,
          'passenger',
        )}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[booking.status]} dot>
              {booking.status}
            </Badge>
            <Badge tone="info">{booking.tripType}</Badge>
          </div>
        }
      />

      <div className="space-y-4">
        {booking.offer.legs.map((leg) => (
          <section key={leg.id} className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <h2 className="text-sm font-bold text-ink">{leg.label}</h2>
              <div className="flex flex-wrap gap-2">
                <span className="chip">{formatDuration(leg.durationMin)}</span>
                <span className="chip">{stopsLabel(leg.stops)}</span>
              </div>
            </div>

            <ol className="mt-4">
              {leg.segments.map((segment) => (
                <li
                  key={segment.id}
                  className="relative border-l border-line pb-6 pl-6 last:border-transparent last:pb-0"
                >
                  <span
                    className="absolute -left-[7px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-brand"
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <AirlineLogo code={segment.airlineCode} name={segment.airlineName} size={32} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{segment.airlineName}</p>
                        <p className="text-xs text-muted">
                          {segment.flightNumber} · {segment.aircraft}
                        </p>
                      </div>
                    </div>
                    <span className="chip">{cabinLabel(segment.cabin)}</span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Departs
                      </p>
                      <p className="mt-1 text-2xl font-bold text-ink">
                        {formatTime(segment.departureAt, segment.from.timezone)}
                      </p>
                      <p className="text-sm font-medium text-ink">
                        {segment.from.iata} · {segment.from.city}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDate(segment.departureAt, segment.from.timezone)} ·{' '}
                        {segment.from.timezone}
                      </p>
                    </div>

                    <div className="flex flex-col items-center gap-1 text-muted">
                      <span className="text-xs font-semibold">{formatDuration(segment.durationMin)}</span>
                      <span className="h-px w-20 bg-line sm:w-28" aria-hidden />
                      <span className="text-xs">{stopsLabel(segment.stops)}</span>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Arrives
                      </p>
                      <p className="mt-1 text-2xl font-bold text-ink">
                        {formatTime(segment.arrivalAt, segment.to.timezone)}
                      </p>
                      <p className="text-sm font-medium text-ink">
                        {segment.to.iata} · {segment.to.city}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDate(segment.arrivalAt, segment.to.timezone)} · {segment.to.timezone}
                      </p>
                    </div>
                  </div>

                  {segment.stopAirports.length > 0 && (
                    <p className="mt-3 text-xs text-muted">
                      Layover:{' '}
                      {segment.stopAirports
                        .map((stop) => `${stop.iata} (${stop.city})`)
                        .join(', ')}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>Cabin bag {segment.baggage.cabinKg} kg</span>
                    <span>Checked bag {segment.baggage.checkedKg} kg</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
            <Users className="h-4 w-4" aria-hidden /> Passengers
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {booking.passengers.map((passenger) => (
              <li
                key={passenger.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {passenger.firstName} {passenger.lastName}
                  </p>
                  <p className="text-xs capitalize text-muted">
                    {passenger.type}
                    {passenger.boardingPassIssued ? ' · boarding pass issued' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {passenger.seatLabels.length > 0 ? (
                    passenger.seatLabels.map((label) => (
                      <span key={label} className="chip">
                        {label}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted">No seat assigned</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Fare breakdown</h2>
          <div className="mt-3">
            <FareBreakdown price={booking.price} />
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Add-ons</h2>
          {addons.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {addons.map((item) => (
                <li key={item} className="chip">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No add-ons on this booking.</p>
          )}
          {booking.checkInOpensAt && (
            <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
              Check-in opens {formatDate(booking.checkInOpensAt)} at{' '}
              {formatTime(booking.checkInOpensAt)}
            </p>
          )}
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
            <CreditCard className="h-4 w-4" aria-hidden /> Payment
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone={PAYMENT_TONE[booking.payment.status]} dot>
              {booking.payment.status}
            </Badge>
            <span className="text-sm text-muted">{booking.payment.method}</span>
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Amount</dt>
              <dd className="font-semibold text-ink">
                {formatMoney(booking.price.total, booking.price.currency)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Transaction</dt>
              <dd className="font-medium text-ink">{booking.payment.transactionId ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Paid</dt>
              <dd className="font-medium text-ink">
                {booking.payment.paidAt
                  ? `${formatDate(booking.payment.paidAt)} ${formatTime(booking.payment.paidAt)}`
                  : '—'}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="card p-4 sm:p-5" aria-label="Trip actions">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Manage this trip</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to={`/boarding-pass/${booking.reference}`} className="btn-primary">
            <Ticket className="h-4 w-4" aria-hidden /> View boarding pass
          </Link>
          {firstFlightNumber ? (
            <Link to={`/flight-tracking/${firstFlightNumber}`} className="btn-secondary">
              <Radar className="h-4 w-4" aria-hidden /> Track flight
            </Link>
          ) : (
            <Button variant="secondary" disabled icon={<Radar className="h-4 w-4" />}>
              Track flight
            </Button>
          )}
          <Link to="/airport-guide" className="btn-secondary">
            <Navigation className="h-4 w-4" aria-hidden /> Airport guide
          </Link>
          <Button
            variant="secondary"
            icon={<CalendarPlus className="h-4 w-4" />}
            loading={calendarQuery.isFetching}
            onClick={handleCalendar}
          >
            Download calendar
          </Button>
          <Button
            variant="secondary"
            icon={<Mail className="h-4 w-4" />}
            loading={emailMutation.isPending}
            onClick={handleEmailTicket}
          >
            Email ticket
          </Button>
          {cancellable && (
            <Button
              variant="danger"
              icon={<Ban className="h-4 w-4" />}
              onClick={() => setCancelOpen(true)}
            >
              Cancel booking
            </Button>
          )}
        </div>
        {firstSegment && (
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-muted">
            <span>
              {firstSegment.from.iata} → {firstSegment.to.iata}
            </span>
            <span>
              Departs {relativeTime(firstSegment.departureAt)}
            </span>
            <span className="flex items-center gap-1">
              <Plane className="h-3.5 w-3.5" aria-hidden />
              {firstSegment.flightNumber}
            </span>
          </p>
        )}
      </section>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this booking?"
        description={`Booking ${booking.reference} will be cancelled for all ${pluralize(
          booking.passengers.length,
          'passenger',
        )}.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep booking
            </Button>
            <Button
              variant="danger"
              loading={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate(booking.reference)}
            >
              Yes, cancel booking
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted">
          This action cannot be undone. Any refund follows the fare rules shown in your booking
          confirmation, and your trip will move to the Cancelled tab in My trips.
        </p>
      </Modal>

      {!cancellable && booking.status === 'cancelled' && (
        <EmptyState
          icon={<Ban className="h-6 w-6" />}
          title="This booking was cancelled"
          description="You can still review the details above. Book a new trip whenever you are ready."
          action={
            <Link to="/search" className="btn-primary">
              Search flights
            </Link>
          }
        />
      )}
    </div>
  );
}

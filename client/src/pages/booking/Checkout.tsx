import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle,
  ArrowLeft,
  CreditCard,
  Lock,
  Plane,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Ticket,
  Timer,
} from 'lucide-react';
import { Input } from '@/components/common/FormFields';
import { Badge } from '@/components/common/Badge';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/common/States';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useToast } from '@/context/ToastContext';
import { useConfirmPayment, useCreateQuote } from '@/hooks/queries/useBookings';
import { ApiError, errorMessage } from '@/services/api/client';
import type { QuoteResponse } from '@/types';
import { cn } from '@/utils/cn';
import { formatDate, formatMoney, formatTime } from '@/utils/format';

const cardSchema = z.object({
  method: z.enum(['card', 'wallet']),
  cardName: z.string().optional(),
  cardNumber: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvc: z.string().optional(),
});

type FormValues = z.infer<typeof cardSchema>;

function luhnValid(number: string): boolean {
  const digits = number.replace(/\D/g, '');
  if (digits.length < 13) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export default function Checkout() {
  const { search, searchId, offer, passengers, addons, seats, setQuote, reset } = useBooking();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const quoteMutation = useCreateQuote();
  const [quote, setLocalQuote] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!searchId || !offer || requestedRef.current) return;
    if (passengers.length === 0) return;
    requestedRef.current = true;
    quoteMutation
      .mutateAsync({
        searchId,
        offerId: offer.id,
        seats: seats.map((s) => ({
          segmentId: s.segmentId,
          passengerIndex: s.passengerIndex,
          seatId: s.seatId,
        })),
        addons,
        passengers,
      })
      .then((q) => {
        setLocalQuote(q);
        setQuote(q);
        setQuoteError(null);
        setExpired(false);
      })
      .catch((err: unknown) => {
        setQuoteError(errorMessage(err));
      });
  }, [searchId, offer, passengers, addons, seats, quoteMutation]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const secondsLeft = quote ? Math.max(0, Math.floor((new Date(quote.expiresAt).getTime() - now) / 1000)) : 0;
  useEffect(() => {
    if (quote && secondsLeft === 0) setExpired(true);
  }, [quote, secondsLeft]);

  const confirmMutation = useConfirmPayment(quote?.quoteId ?? '');
  const [payError, setPayError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      method: 'card',
      cardName: user ? `${user.firstName} ${user.lastName}` : '',
      cardNumber: '',
      cardExpiry: '',
      cardCvc: '',
    },
  });

  const method = watch('method');

  if (!searchId || !offer || passengers.length === 0) {
    return <Navigate to={passengers.length === 0 ? '/passenger-details' : '/search'} replace />;
  }

  const segments = offer.legs.flatMap((l) => l.segments);

  const seatTotal = seats.reduce((s, x) => s + x.price, 0);

  function refreshQuote() {
    if (!searchId || !offer) return;
    requestedRef.current = false;
    setQuoteError(null);
    setExpired(false);
    quoteMutation
      .mutateAsync({
        searchId,
        offerId: offer.id,
        seats: seats.map((s) => ({
          segmentId: s.segmentId,
          passengerIndex: s.passengerIndex,
          seatId: s.seatId,
        })),
        addons,
        passengers,
      })
      .then((q) => {
        setLocalQuote(q);
        setQuote(q);
        toast({ title: 'Price refreshed', description: 'Your seats are held for another 10 minutes.', variant: 'success' });
      })
      .catch((err: unknown) => setQuoteError(errorMessage(err)));
  }

  async function onSubmit(values: FormValues) {
    setPayError(null);
    if (!quote) return;
    if (values.method === 'card') {
      const digits = (values.cardNumber ?? '').replace(/\D/g, '');
      if (!values.cardName?.trim()) {
        setPayError('Enter the name printed on the card.');
        return;
      }
      if (digits.length < 13 || !luhnValid(digits)) {
        setPayError('That card number looks invalid. Try 4242 4242 4242 4242 for the demo.');
        return;
      }
      const expiryMatch = /^(\d{2})\/(\d{2})$/.exec(values.cardExpiry ?? '');
      if (!expiryMatch) {
        setPayError('Enter the expiry as MM/YY.');
        return;
      }
      const month = Number(expiryMatch[1]);
      const year = 2000 + Number(expiryMatch[2]);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59).getTime();
      if (month < 1 || month > 12 || endOfMonth < Date.now()) {
        setPayError('That card has expired. Use a future expiry date.');
        return;
      }
      if (!/^\d{3,4}$/.test(values.cardCvc ?? '')) {
        setPayError('Enter the 3 or 4 digit security code.');
        return;
      }
    }
    try {
      const result = await confirmMutation.mutateAsync({
        method: values.method,
        card:
          values.method === 'card'
            ? {
                number: (values.cardNumber ?? '').replace(/\s/g, ''),
                name: values.cardName ?? '',
                expiry: values.cardExpiry ?? '',
                cvc: values.cardCvc ?? '',
              }
            : undefined,
      });
      toast({
        title: 'Booking confirmed',
        description: `Reference ${result.booking.reference} — payment verified ${result.verification.verifiedBy}.`,
        variant: 'success',
      });
      reset();
      navigate(`/booking-confirmation/${result.booking.reference}`, { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Payment could not be verified. Your card was not charged — please try again.';
      setPayError(message);
      if (err instanceof ApiError && (err.status === 409 || err.status === 410)) {
        refreshQuote();
      }
    }
  }

  if (quoteError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="card">
          <ErrorState
            title="We couldn't hold this fare"
            description={quoteError}
            onRetry={() => {
              requestedRef.current = false;
              setQuoteError(null);
              quoteMutation.mutate({
                searchId,
                offerId: offer.id,
                seats: seats.map((s) => ({
                  segmentId: s.segmentId,
                  passengerIndex: s.passengerIndex,
                  seatId: s.seatId,
                })),
                addons,
                passengers,
              });
            }}
          />
        </div>
      </div>
    );
  }

  const price = quote?.price;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-40 sm:px-6 lg:px-8 lg:pb-12">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">Step 4 of 4 · Review & pay</p>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Confirm and pay</h1>
        </div>
        <button onClick={() => navigate('/passenger-details')} className="btn-ghost h-9 px-3 text-[13px]">
          <ArrowLeft className="h-4 w-4" /> Passenger details
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          {/* Itinerary */}
          <section className="card p-5" aria-labelledby="review-route">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="review-route" className="flex items-center gap-2 text-sm font-bold text-ink">
                <Plane className="h-4 w-4 text-brand" aria-hidden />
                Your itinerary
              </h2>
              <Badge tone="info">{offer.fareBrand}</Badge>
            </div>

            <div className="mt-4 space-y-4">
              {offer.legs.map((leg, li) => (
                <div key={leg.id} className="rounded-xl border border-line p-3.5">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                    {search.tripType === 'roundtrip' ? (li === 0 ? 'Outbound' : 'Return') : 'Flight'}
                  </p>
                  {leg.segments.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-bold text-ink">
                          {formatTime(s.departureAt, s.from.timezone)} {s.from.iata}
                          <span className="mx-2 text-muted">→</span>
                          {formatTime(s.arrivalAt, s.to.timezone)} {s.to.iata}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {formatDate(s.departureAt)} · {s.airlineName} {s.flightNumber} · {s.aircraft}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted">{s.baggage.checkedKg} kg checked</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* Passengers & seats */}
          <section className="card p-5" aria-labelledby="review-pax">
            <h2 id="review-pax" className="flex items-center gap-2 text-sm font-bold text-ink">
              <Ticket className="h-4 w-4 text-brand" aria-hidden /> Travellers & seats
            </h2>
            <ul className="mt-3 divide-y divide-line">
              {passengers.map((p, i) => {
                const paxSeats = seats.filter((s) => s.passengerIndex === i);
                return (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {p.firstName} {p.lastName}
                      </p>
                      <p className="text-xs capitalize text-muted">{p.type}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      {paxSeats.length > 0 ? (
                        segments.map((s) => {
                          const seat = paxSeats.find((x) => x.segmentId === s.id);
                          return (
                            <span
                              key={s.id}
                              className="rounded-md bg-brand-soft px-2 py-1 text-[11px] font-bold text-brand-dark"
                            >
                              {s.from.iata}–{s.to.iata}: {seat ? seat.label : 'at check-in'}
                            </span>
                          );
                        })
                      ) : (
                        <span className="rounded-md bg-canvas px-2 py-1 text-[11px] text-muted">Seats at check-in</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Add-ons */}
          <section className="card p-5" aria-labelledby="review-addons">
            <h2 id="review-addons" className="text-sm font-bold text-ink">
              Add-ons
            </h2>
            <ul className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
              <li>Extra baggage: {addons.extraBaggageKg > 0 ? `+${addons.extraBaggageKg} kg` : 'none'}</li>
              <li>Meal: {addons.meal === 'none' ? 'Standard' : addons.meal}</li>
              <li>Assistance: {addons.specialAssistance === 'none' ? 'None' : addons.specialAssistance}</li>
              <li>Priority boarding: {addons.priorityBoarding ? 'Yes' : 'No'}</li>
              <li>Travel insurance: {addons.travelInsurance ? 'Yes' : 'No'}</li>
              <li>Seat selection: {addons.seatSelection && seats.length > 0 ? `${seats.length} seats` : 'At check-in'}</li>
            </ul>
          </section>

          {/* Payment */}
          <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} noValidate className="card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <CreditCard className="h-4 w-4 text-brand" aria-hidden /> Payment
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Payment method">
              {(
                [
                  { value: 'card', label: 'Card', icon: CreditCard },
                  { value: 'wallet', label: 'Test wallet', icon: Smartphone },
                ] as const
              ).map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={method === m.value}
                  onClick={() => setValue('method', m.value, { shouldDirty: true })}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition',
                    method === m.value
                      ? 'border-brand bg-brand-soft text-brand-dark'
                      : 'border-line text-muted hover:text-ink',
                  )}
                >
                  <m.icon className="h-4 w-4" aria-hidden />
                  {m.label}
                </button>
              ))}
            </div>
            <div className="sr-only">
              <label>
                Card
                <input type="radio" value="card" {...register('method')} />
              </label>
              <label>
                Wallet
                <input type="radio" value="wallet" {...register('method')} />
              </label>
            </div>

            {method === 'card' ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input
                    label="Card number"
                    required
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                    error={errors.cardNumber?.message}
                    {...register('cardNumber', {
                      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                        e.target.value = digits.replace(/(.{4})/g, '$1 ').trim();
                      },
                    })}
                  />
                </div>
                <Input
                  label="Cardholder name"
                  required
                  autoComplete="cc-name"
                  placeholder="Name on card"
                  error={errors.cardName?.message}
                  {...register('cardName')}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Expiry"
                    required
                    placeholder="MM/YY"
                    maxLength={5}
                    autoComplete="cc-exp"
                    error={errors.cardExpiry?.message}
                    {...register('cardExpiry', {
                      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                        e.target.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
                      },
                    })}
                  />
                  <Input
                    label="CVC"
                    required
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="cc-csc"
                    placeholder="123"
                    error={errors.cardCvc?.message}
                    {...register('cardCvc', {
                      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      },
                    })}
                  />
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-canvas p-4 text-sm text-muted">
                The test wallet approves instantly in this demo build and simulates a wallet provider callback that the
                server verifies before your booking is created.
              </p>
            )}

            <p className="mt-4 flex items-start gap-2 rounded-xl bg-success-soft p-3.5 text-xs leading-relaxed text-ink">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              Demo cards: <span className="mx-1 font-bold">4242 4242 4242 4242</span> succeeds ·
              <span className="mx-1 font-bold">4000 0000 0000 0002</span> is declined by the gateway. Nothing is
              charged and no real card data leaves this device.
            </p>

            {payError && (
              <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl border border-error/25 bg-error-soft p-3.5 text-sm text-error">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{payError}</span>
              </div>
            )}
          </form>
        </div>

        {/* Fare summary */}
        <aside className="min-w-0">
          <div className="sticky top-20 space-y-4">
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink">Fare breakdown</h2>
                <Badge tone="info">INR</Badge>
              </div>

              {!quote && quoteMutation.isPending && (
                <div className="mt-4 space-y-2.5" aria-label="Calculating price">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-8 w-full" />
                </div>
              )}

              {price && (
                <>
                  <dl className="mt-4 space-y-2.5 text-sm">
                    <Row label="Base fare" value={formatMoney(price.base, price.currency)} />
                    <Row label="Taxes" value={formatMoney(price.taxes, price.currency)} />
                    <Row label="Carrier fees" value={formatMoney(price.fees, price.currency)} />
                    <Row
                      label={`Seat charges${seats.length ? ` (${seats.length})` : ''}`}
                      value={formatMoney(price.seats || seatTotal, price.currency)}
                    />
                    <Row label="Add-ons" value={formatMoney(price.addons, price.currency)} />
                    <div className="border-t border-line pt-2.5">
                      <Row label="Total payable" value={formatMoney(price.total, price.currency)} bold />
                    </div>
                  </dl>

                  <div
                    className={cn(
                      'mt-4 flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-semibold',
                      expired
                        ? 'border-error/30 bg-error-soft text-error'
                        : secondsLeft < 120
                          ? 'border-warning/40 bg-warning-soft text-warning'
                          : 'border-line bg-canvas text-muted',
                    )}
                    aria-live="polite"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Timer className="h-3.5 w-3.5" aria-hidden />
                      {expired ? 'Hold expired' : 'Seats held for'}
                    </span>
                    <span className="tabular-nums">
                      {expired
                        ? 'refresh required'
                        : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`}
                    </span>
                  </div>

                  {expired && (
                    <button onClick={refreshQuote} className="btn-secondary mt-3 w-full">
                      <RefreshCcw className="h-4 w-4" /> Refresh price & hold
                    </button>
                  )}

                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={expired || isSubmitting || confirmMutation.isPending || !quote}
                    className="btn-primary mt-4 w-full"
                  >
                    {confirmMutation.isPending
                      ? 'Verifying payment…'
                      : isSubmitting
                        ? 'Validating…'
                        : `Pay ${formatMoney(price.total, price.currency)}`}
                  </button>

                  <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-muted">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                    The server re-checks this exact amount and your seat holds before creating the booking — a browser
                    “success” message alone is never trusted.
                  </p>
                </>
              )}
            </div>

            <div className="card p-4 text-xs leading-relaxed text-muted">
              <p className="flex gap-2">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                Booking is created only after payment verification. You'll receive a reference, e-ticket and calendar
                events on the confirmation screen.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile sticky pay bar */}
      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-ink">{price ? formatMoney(price.total, price.currency) : '—'}</p>
            <p className="truncate text-[11px] text-muted">{expired ? 'Hold expired — refresh' : 'Total payable'}</p>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={expired || isSubmitting || confirmMutation.isPending || !quote}
            className="btn-primary"
          >
            {confirmMutation.isPending ? 'Verifying…' : 'Pay now'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={cn(bold ? 'font-semibold text-ink' : 'text-muted')}>{label}</dt>
      <dd className={cn('font-semibold text-ink', bold && 'text-base font-extrabold')}>{value}</dd>
    </div>
  );
}

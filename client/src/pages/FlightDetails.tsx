import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Clock,
  Info,
  Luggage,
  Plane,
  RefreshCcw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { AirlineLogo } from '@/components/common/Brand';
import { Badge } from '@/components/common/Badge';
import { SkeletonList } from '@/components/common/Skeleton';
import { ErrorState, EmptyState } from '@/components/common/States';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useToast } from '@/context/ToastContext';
import { flightsApi } from '@/services/api/flights';
import { errorMessage } from '@/services/api/client';
import { useSaveFlight, useSavedFlights } from '@/hooks/queries/useProfile';
import type { FlightLeg, FlightSegment } from '@/types';
import { formatDuration, formatDate, formatMoney, formatTime } from '@/utils/format';
import { cn } from '@/utils/cn';

const EXTRA_BAGGAGE_OPTIONS = [5, 10, 15, 20];
const BAGGAGE_PRICE_PER_KG = 1660;

export default function FlightDetails({ offerId }: { offerId: string }) {
  const { search, searchId, selectOffer, addons, setAddons } = useBooking();
  const navigate = useNavigate();
  const params = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['offer', searchId, params.offerId ?? offerId],
    queryFn: () => flightsApi.offerDetail(searchId!, params.offerId ?? offerId),
    enabled: !!searchId && !!(params.offerId ?? offerId),
    staleTime: Infinity,
    retry: false,
  });

  const saveMutation = useSaveFlight();
  const savedQuery = useSavedFlights();
  const offer = detailQuery.data?.offer;
  const saved = offer ? (savedQuery.data?.flights ?? []).some((f) => f.offerId === offer.id) : false;

  const extraKg = EXTRA_BAGGAGE_OPTIONS.includes(addons.extraBaggageKg) ? addons.extraBaggageKg : 0;
  const seatPax = Math.max(1, search.passengers.adult + search.passengers.child);

  useEffect(() => {
    if (addons.extraBaggageKg !== 0 && !EXTRA_BAGGAGE_OPTIONS.includes(addons.extraBaggageKg)) {
      setAddons({ ...addons, extraBaggageKg: 0 });
    }
  }, [addons, setAddons]);

  if (detailQuery.isPending) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <SkeletonList count={2} />
      </div>
    );
  }

  if (detailQuery.isError || !offer) {
    const notFound = (detailQuery.error as { status?: number } | null)?.status === 404;
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="card">
          {notFound ? (
            <EmptyState
              icon={<RefreshCcw className="h-6 w-6" />}
              title="This fare is no longer available"
              description="Search results expire after a while so prices stay accurate. Run a fresh search to see current demo fares."
              action={
                <Link to="/search" className="btn-primary">
                  Search again
                </Link>
              }
            />
          ) : (
            <ErrorState
              title="Couldn't load this flight"
              description={errorMessage(detailQuery.error)}
              onRetry={() => detailQuery.refetch()}
            />
          )}
        </div>
      </div>
    );
  }

  const segments = offer.legs.flatMap((l) => l.segments);
  const first = segments[0];
  const baggageCost = extraKg * BAGGAGE_PRICE_PER_KG * seatPax;
  const payable = offer.price.total + baggageCost;

  function onSave() {
    if (!user) {
      navigate('/login', { state: { from: `/flight/${offerId}` } });
      return;
    }
    if (!searchId) return;
    saveMutation.mutate(
      { searchId, offerId: offer!.id },
      {
        onSuccess: () => toast({ title: 'Flight saved', variant: 'success', description: 'Find it under Saved flights.' }),
        onError: (e) => toast({ title: 'Could not save flight', description: errorMessage(e), variant: 'error' }),
      },
    );
  }

  function onContinue() {
    setBusy(true);
    selectOffer(offer!, searchId!);
    navigate('/seat-selection');
  }

  function onChooseBaggage(kg: number) {
    setAddons({ ...addons, extraBaggageKg: kg });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-32 sm:px-6 lg:px-8 lg:pb-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button onClick={() => navigate('/search/results')} className="btn-ghost h-9 px-3 text-[13px]">
          <ArrowLeft className="h-4 w-4" /> Back to results
        </button>
        <button
          onClick={onSave}
          disabled={saveMutation.isPending}
          className={cn(
            'btn-secondary h-9 px-3.5 text-[13px]',
            saved && 'border-brand/40 bg-brand-soft text-brand-dark',
          )}
        >
          <Bookmark className={cn('h-4 w-4', saved && 'fill-current')} />
          {saved ? 'Saved' : 'Save flight'}
        </button>
      </div>

      {/* Combined flight + price booking summary */}
      <section className="card overflow-hidden" aria-label="Flight booking summary">
        {/* Airline header */}
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <AirlineLogo code={first.airlineCode} name={first.airlineName} size={44} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-extrabold tracking-tight text-ink">
                {first.from.city} to {first.to.city}
              </h1>
              <p className="truncate text-sm text-muted">
                {first.airlineName} · {segments.map((s) => s.flightNumber).join(', ')} · {formatDate(first.departureAt)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone={offer.stops === 0 ? 'success' : 'warning'}>
              {offer.stops === 0 ? 'Non-stop' : `${offer.stops} stop${offer.stops > 1 ? 's' : ''}`}
            </Badge>
            <Badge tone={offer.refundable ? 'success' : 'neutral'}>
              {offer.refundable ? 'Refundable' : 'Non-refundable'}
            </Badge>
            <Badge tone="info">{offer.fareBrand}</Badge>
            {offer.estimated && (
              <Badge tone="warning" dot>
                Estimated price
              </Badge>
            )}
            {offer.seatsLeft != null && <Badge tone="error">{offer.seatsLeft} seats left</Badge>}
          </div>
          {offer.estimated && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-xs leading-relaxed text-ink">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              Prices come from a demo flight provider. The amount is verified server-side when you pay — the
              provider is never asked to trust a browser.
            </p>
          )}
        </div>

        {/* Journey timeline */}
        <div className="border-t border-line p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Plane className="h-4 w-4 text-brand" aria-hidden /> Itinerary
          </h2>
          {offer.legs.map((leg, li) => (
            <div key={leg.id} className={cn(li > 0 && 'mt-5 border-t border-line pt-5')}>
              <div className="mt-3 flex items-center justify-between gap-3">
                <h3 className="text-[13px] font-bold text-ink">
                  {search.tripType === 'roundtrip' ? (li === 0 ? 'Outbound' : 'Return') : `Flight ${li + 1}`}
                </h3>
                <span className="truncate text-xs text-muted">
                  {leg.segments.map((s) => s.flightNumber).join(' → ')}
                </span>
              </div>
              <JourneyTimeline leg={leg} />
            </div>
          ))}
        </div>

        {/* Baggage: included allowance + extra selection */}
        <div className="border-t border-line p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Luggage className="h-4 w-4 text-brand" aria-hidden /> Baggage
          </h2>
          <div className="mt-3 flex flex-wrap gap-x-10 gap-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Cabin baggage</p>
              <p className="mt-0.5 text-base font-extrabold text-ink">
                {first.baggage.cabinKg} kg <span className="text-xs font-medium text-muted">per traveller</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Checked baggage</p>
              <p className="mt-0.5 text-base font-extrabold text-ink">
                {first.baggage.checkedKg} kg <span className="text-xs font-medium text-muted">per traveller</span>
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">Included with your fare — kept separate from extra baggage below.</p>

          <div className="mt-4 rounded-2xl border border-line bg-canvas/60 p-4">
            <h3 className="text-[13px] font-bold text-ink">Extra checked baggage</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {[{ kg: 0, label: 'No extra bag' }, ...EXTRA_BAGGAGE_OPTIONS.map((kg) => ({ kg, label: `+${kg} kg` }))].map(
                ({ kg, label }) => (
                  <button
                    key={kg}
                    type="button"
                    onClick={() => onChooseBaggage(kg)}
                    aria-pressed={extraKg === kg}
                    className={cn(
                      'min-w-[108px] rounded-xl border px-3.5 py-2.5 text-left transition',
                      extraKg === kg
                        ? 'border-brand bg-brand-soft'
                        : 'border-line bg-surface hover:border-brand/40',
                    )}
                  >
                    <span className="flex items-center gap-1 text-sm font-extrabold text-ink">
                      {extraKg === kg && <Check className="h-3.5 w-3.5 text-brand-dark" aria-hidden />}
                      {label}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-medium text-muted">
                      {kg === 0
                        ? 'Included fare only'
                        : `≈ ${formatMoney(kg * BAGGAGE_PRICE_PER_KG * seatPax, offer.price.currency)}`}
                    </span>
                  </button>
                ),
              )}
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
              Demo estimate · {formatMoney(BAGGAGE_PRICE_PER_KG, offer.price.currency)} per kg
              {seatPax > 1 ? ` × ${seatPax} travellers` : ''}. The provider doesn't publish baggage fees — the final
              charge is verified server-side at checkout.
            </p>
            {extraKg > 0 ? (
              <p className="mt-3 flex items-center gap-1.5 text-[13px] font-bold text-brand">
                <Check className="h-4 w-4" aria-hidden />
                Selected: +{extraKg} kg — adds {formatMoney(baggageCost, offer.price.currency)}
              </p>
            ) : (
              <p className="mt-3 text-[13px] text-muted">No extra baggage selected.</p>
            )}
          </div>
        </div>

        {/* Combined price breakdown + CTA */}
        <div className="border-t border-line p-5 sm:p-6">
          <h2 className="text-sm font-bold text-ink">Price breakdown</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <Row label="Base fare" value={formatMoney(offer.price.base, offer.price.currency)} />
            <Row
              label="Taxes & carrier fees"
              value={formatMoney(offer.price.taxes + offer.price.fees, offer.price.currency)}
            />
            <Row
              label={extraKg > 0 ? `Extra baggage (+${extraKg} kg)` : 'Extra baggage'}
              value={formatMoney(baggageCost, offer.price.currency)}
            />
            <div className="border-t border-line pt-3">
              <Row label="Final payable amount" value={formatMoney(payable, offer.price.currency)} bold />
            </div>
          </dl>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
            Seat charges are priced on the next step. Extra baggage amounts are estimates confirmed at checkout.
          </p>
          <button onClick={onContinue} disabled={busy} className="btn-primary mt-4 w-full">
            Continue to seats
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted">
            <Wallet className="h-3 w-3" aria-hidden /> Payment verified server-side at checkout
          </p>
        </div>
      </section>

      {/* Secondary info */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <ShieldCheck className="h-4 w-4 text-brand" aria-hidden /> Fare conditions
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li className="flex gap-2">
              <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', offer.refundable ? 'bg-success' : 'bg-error')} />
              {offer.refundable ? 'Refundable to original payment method' : 'Non-refundable demo fare rule'}
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              {offer.fareBrand} — seat map available before departure
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
              Changes handled by the airline after ticketing
            </li>
          </ul>
        </div>
        <div className="card p-4 text-xs leading-relaxed text-muted">
          <p className="flex gap-2">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
            Search results are cached for this session. If a fare expires you'll be asked to search again.
          </p>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-extrabold text-ink">{formatMoney(payable, offer.price.currency)}</p>
            <p className="text-[11px] text-muted">
              {offer.estimated ? 'Est. total · demo fare' : 'Total'}
              {extraKg > 0 ? ` · +${extraKg} kg` : ''}
            </p>
          </div>
          <button onClick={onContinue} disabled={busy} className="btn-primary flex-1">
            Continue to seats
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={cn('text-muted', bold && 'font-semibold text-ink')}>{label}</dt>
      <dd className={cn('font-semibold text-ink', bold && 'text-base font-extrabold')}>{value}</dd>
    </div>
  );
}

function JourneyTimeline({ leg }: { leg: FlightLeg }) {
  const reduced = useReducedMotion();
  const segs = leg.segments;
  const first = segs[0];
  const last = segs[segs.length - 1];
  const stopsLabel = leg.stops === 0 ? 'Non-stop' : `${leg.stops} stop${leg.stops > 1 ? 's' : ''}`;

  const midNodes: Array<{ key: string; iata: string }> = [];
  segs.forEach((seg, i) => {
    seg.stopAirports.forEach((a, j) => midNodes.push({ key: `tech-${i}-${j}`, iata: a.iata }));
    if (i < segs.length - 1) midNodes.push({ key: `hub-${i}`, iata: seg.to.iata });
  });
  const denom = Math.max(1, midNodes.length + 1);

  return (
    <div className="mt-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        {/* Departure */}
        <div className="sm:w-44 sm:shrink-0">
          <p className="text-2xl font-extrabold leading-none text-ink">
            {formatTime(first.departureAt, first.from.timezone)}
            <span className="ml-2 text-sm font-bold text-muted">{first.from.iata}</span>
          </p>
          <p className="mt-2 text-[13px] leading-snug text-muted">{first.from.name}</p>
          <p className="text-[13px] font-semibold text-muted">{first.from.city}</p>
        </div>

        {/* Horizontal route with moving plane */}
        <div className="min-w-0 flex-1 sm:pt-2">
          <div className="relative h-6">
            <div
              className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
              style={{
                background:
                  'linear-gradient(90deg, rgba(230,255,25,0.5), #2a3531 14%, #2a3531 86%, rgba(230,255,25,0.5))',
              }}
              aria-hidden
            />
            <span
              className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-surface"
              aria-hidden
            />
            <span
              className="absolute right-0 top-1/2 h-3 w-3 translate-x-1/2 -translate-y-1/2 rounded-full bg-brand"
              aria-hidden
            />
            {midNodes.map((n, i) => (
              <span
                key={n.key}
                title={n.iata}
                className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-surface"
                style={{ left: `${((i + 1) / denom) * 100}%` }}
                aria-hidden
              />
            ))}
            <motion.div
              className="absolute top-1/2"
              style={{ transform: 'translate(-50%, -50%)' }}
              initial={{ left: '0%' }}
              animate={{ left: reduced ? '50%' : ['0%', '100%'] }}
              transition={
                reduced ? undefined : { duration: 3.4, repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut' }
              }
            >
              <Plane className="h-4 w-4 rotate-45 text-brand" aria-hidden />
            </motion.div>
          </div>
          <div className="mt-1.5 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 text-[11px] font-bold text-muted">
              <span
                className={cn('h-1.5 w-1.5 rounded-full', leg.stops === 0 ? 'bg-brand' : 'bg-warning')}
                aria-hidden
              />
              {stopsLabel} · {formatDuration(leg.durationMin)}
            </span>
          </div>
          {segs.length === 1 && (
            <p className="mt-2 text-center text-xs text-muted">
              {first.airlineName} {first.flightNumber} · {first.aircraft}
            </p>
          )}
        </div>

        {/* Arrival */}
        <div className="sm:w-44 sm:shrink-0 sm:text-right">
          <p className="text-2xl font-extrabold leading-none text-ink">
            {formatTime(last.arrivalAt, last.to.timezone)}
            <span className="ml-2 text-sm font-bold text-muted">{last.to.iata}</span>
          </p>
          <p className="mt-2 text-[13px] leading-snug text-muted">{last.to.name}</p>
          <p className="text-[13px] font-semibold text-muted">{last.to.city}</p>
        </div>
      </div>

      {/* Technical stops */}
      {segs.some((s) => s.stopAirports.length > 0) && (
        <p className="mt-3 text-xs text-muted">
          Stop{segs.flatMap((s) => s.stopAirports).length > 1 ? 's' : ''}:{' '}
          {segs
            .flatMap((s) => s.stopAirports)
            .map((a) => `${a.city} (${a.iata})`)
            .join(', ')}
        </p>
      )}

      {/* Connecting flights: each segment and layover shown separately */}
      {segs.length > 1 && (
        <div className="mt-3 space-y-2">
          {segs.map((seg, i) => (
            <div key={seg.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-canvas px-3.5 py-2.5 text-sm">
                <span className="font-bold text-ink">
                  {seg.airlineName} {seg.flightNumber}
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                  {formatTime(seg.departureAt, seg.from.timezone)}{' '}
                  <span className="text-muted">{seg.from.iata}</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted" aria-hidden />
                <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                  {formatTime(seg.arrivalAt, seg.to.timezone)} <span className="text-muted">{seg.to.iata}</span>
                </span>
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted">
                  <Clock className="h-3 w-3" aria-hidden /> {formatDuration(seg.durationMin)}
                </span>
              </div>
              {i < segs.length - 1 && <LayoverRow from={seg} to={segs[i + 1]} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LayoverRow({ from, to }: { from: FlightSegment; to: FlightSegment }) {
  const mins =
    from.arrivalAt && to.departureAt
      ? Math.round((new Date(to.departureAt).getTime() - new Date(from.arrivalAt).getTime()) / 60000)
      : 0;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-sm">
      <span className="inline-flex items-center gap-1.5 font-bold text-ink">
        <Clock className="h-3.5 w-3.5 text-warning" aria-hidden />
        Layover in {from.to.city} ({from.to.iata})
      </span>
      <span className="text-xs font-semibold text-muted">
        {formatTime(from.arrivalAt, from.to.timezone)} → {formatTime(to.departureAt, to.from.timezone)} ·{' '}
        {formatDuration(mins)}
      </span>
    </div>
  );
}

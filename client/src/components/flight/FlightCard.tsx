import { useNavigate } from 'react-router-dom';
import { Armchair, Bookmark, Clock, Info, Luggage, PlaneTakeoff } from 'lucide-react';
import { AirlineLogo } from '@/components/common/Brand';
import { Badge } from '@/components/common/Badge';
import type { FlightLeg, FlightOffer } from '@/types';
import { cn } from '@/utils/cn';
import { formatDuration, formatMoney, formatTime } from '@/utils/format';

interface Props {
  offer: FlightOffer;
  searchId: string;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
}

export function FlightCard({ offer, searchId, onSave, saving, saved }: Props) {
  const navigate = useNavigate();
  const first = offer.legs[0]?.segments[0];
  const segments = offer.legs.flatMap((l) => l.segments);
  const baggage = segments[0]?.baggage;

  return (
    <article className="card relative overflow-hidden transition hover:shadow-pop">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <AirlineLogo code={first?.airlineCode ?? ''} name={first?.airlineName ?? 'Airline'} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{first?.airlineName}</p>
              <p className="truncate text-xs text-muted">
                {segments.map((s) => s.flightNumber).join(' · ')} · {offer.fareBrand}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {offer.refundable && <Badge tone="success">Refundable</Badge>}
            {offer.seatsLeft != null && offer.seatsLeft <= 5 && (
              <Badge tone="warning" className="hidden sm:inline-flex">
                {offer.seatsLeft} seats left
              </Badge>
            )}
            {onSave && (
              <button
                onClick={onSave}
                disabled={saving}
                aria-label={saved ? 'Remove saved flight' : 'Save flight'}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg border transition',
                  saved
                    ? 'border-brand/40 bg-brand-soft text-brand'
                    : 'border-line text-muted hover:border-brand/40 hover:text-brand',
                )}
              >
                <Bookmark className={cn('h-4 w-4', saved && 'fill-current')} />
              </button>
            )}
          </div>
        </div>

        {/* Legs */}
        <div className="space-y-3.5">
          {offer.legs.map((leg) => (
            <LegRow key={leg.id} leg={leg} />
          ))}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-line pt-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
            {baggage && (
              <span className="inline-flex items-center gap-1.5">
                <Luggage className="h-3.5 w-3.5" aria-hidden /> {baggage.cabinKg} kg cabin ·{' '}
                {baggage.checkedKg} kg checked
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Armchair className="h-3.5 w-3.5" aria-hidden /> Seat map available
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden /> {formatDuration(offer.durationMin)} total
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="text-right">
              <p className="text-lg font-extrabold leading-tight text-ink">{formatMoney(offer.price.total)}</p>
              <p className="flex items-center justify-end gap-1 text-[11px] text-muted">
                {offer.estimated && <Info className="h-3 w-3" aria-hidden />}
                {offer.estimated ? 'Est. total · ' : 'Total · '}demo fare
              </p>
            </div>
            <button
              onClick={() => navigate(`/flight/${offer.id}`, { state: { searchId } })}
              className="btn-secondary h-10 px-3.5 text-[13px]"
            >
              Details
            </button>
            <button onClick={() => navigate(`/flight/${offer.id}`)} className="btn-primary h-10 px-4 text-[13px]">
              Select
            </button>
          </div>
        </div>
      </div>

      {offer.estimated && (
        <span className="absolute -left-px top-0 h-full w-0.5 bg-brand/50" aria-hidden />
      )}
    </article>
  );
}

function LegRow({ leg }: { leg: FlightLeg }) {
  const first = leg.segments[0];
  const last = leg.segments[leg.segments.length - 1];
  const stopsList = leg.segments.flatMap((s) => s.stopAirports.map((a) => a.iata));

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="w-[86px] shrink-0 sm:w-24">
        <p className="text-lg font-extrabold leading-tight text-ink sm:text-xl">
          {formatTime(first.departureAt, first.from.timezone)}
        </p>
        <p className="text-xs font-semibold text-navy">{first.from.iata}</p>
        <p className="truncate text-[11px] text-muted">{first.from.city}</p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>{formatDuration(leg.durationMin)}</span>
          <span className={cn('font-semibold', leg.stops === 0 ? 'text-success' : 'text-warning')}>
            {leg.stops === 0 ? 'Non-stop' : `${leg.stops} stop${leg.stops > 1 ? 's' : ''}`}
          </span>
        </div>
        <div className="relative my-1 h-4">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
          <div className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-brand" />
          {leg.segments.slice(1).map((s, i) => (
            <div
              key={s.id + i}
              className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-warning"
              style={{ left: `${((i + 1) / leg.segments.length) * 100}%` }}
              title={`Layover in ${s.from.city}`}
            />
          ))}
          <div className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-navy" />
          <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
            <span className="rounded-full bg-surface px-1.5 text-muted">
              <PlaneTakeoff className="h-3 w-3" aria-hidden />
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span className="truncate">{first.aircraft}</span>
          <span className="truncate">
            {stopsList.length > 0 ? `via ${stopsList.join(', ')}` : `${first.from.iata} → ${last.to.iata}`}
          </span>
        </div>
      </div>

      <div className="w-[86px] shrink-0 text-right sm:w-24">
        <p className="text-lg font-extrabold leading-tight text-ink sm:text-xl">
          {formatTime(last.arrivalAt, last.to.timezone)}
        </p>
        <p className="text-xs font-semibold text-navy">{last.to.iata}</p>
        <p className="truncate text-[11px] text-muted">{last.to.city}</p>
      </div>
    </div>
  );
}

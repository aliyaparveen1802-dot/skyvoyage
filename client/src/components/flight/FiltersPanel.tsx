import { Link } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import type { CabinClass, FlightOffer } from '@/types';
import { CABINS } from '@/constants';
import { cn } from '@/utils/cn';
import { formatDuration, formatMoney } from '@/utils/format';

export type TimeWindow = 'any' | 'early' | 'morning' | 'afternoon' | 'evening';
export type StopsFilter = 'any' | 'direct' | 'one' | 'twoPlus';

export interface FiltersState {
  maxPrice: number;
  maxDuration: number;
  airlines: string[];
  depWindow: TimeWindow;
  arrWindow: TimeWindow;
  stops: StopsFilter;
}

export interface FilterBounds {
  minPrice: number;
  maxPrice: number;
  minDuration: number;
  maxDuration: number;
  airlines: Array<{ code: string; name: string }>;
}

const TIME_WINDOWS: Array<{ value: TimeWindow; label: string }> = [
  { value: 'any', label: 'Any time' },
  { value: 'early', label: '00–06' },
  { value: 'morning', label: '06–12' },
  { value: 'afternoon', label: '12–18' },
  { value: 'evening', label: '18–24' },
];

const STOPS_OPTIONS: Array<{ value: StopsFilter; label: string }> = [
  { value: 'any', label: 'Any' },
  { value: 'direct', label: 'Non-stop' },
  { value: 'one', label: '1 stop' },
  { value: 'twoPlus', label: '2+ stops' },
];

export function computeBounds(offers: FlightOffer[]): FilterBounds {
  if (offers.length === 0) {
    return { minPrice: 0, maxPrice: 1000, minDuration: 60, maxDuration: 1200, airlines: [] };
  }
  const prices = offers.map((o) => o.price.total);
  const durations = offers.map((o) => o.durationMin);
  const airlines = new Map<string, string>();
  for (const o of offers) {
    const seg = o.legs[0]?.segments[0];
    if (seg) airlines.set(seg.airlineCode, seg.airlineName);
  }
  return {
    minPrice: Math.floor(Math.min(...prices)),
    maxPrice: Math.ceil(Math.max(...prices)),
    minDuration: Math.max(30, Math.floor(Math.min(...durations) / 30) * 30),
    maxDuration: Math.max(...durations),
    airlines: [...airlines.entries()].map(([code, name]) => ({ code, name })),
  };
}

export function defaultFilters(bounds: FilterBounds): FiltersState {
  return {
    maxPrice: bounds.maxPrice,
    maxDuration: bounds.maxDuration,
    airlines: [],
    depWindow: 'any',
    arrWindow: 'any',
    stops: 'any',
  };
}

export function activeFilterCount(f: FiltersState, bounds: FilterBounds): number {
  let n = 0;
  if (f.maxPrice < bounds.maxPrice) n++;
  if (f.maxDuration < bounds.maxDuration) n++;
  if (f.airlines.length > 0) n++;
  if (f.depWindow !== 'any') n++;
  if (f.arrWindow !== 'any') n++;
  if (f.stops !== 'any') n++;
  return n;
}

function hourOf(iso: string, timeZone?: string): number {
  const str = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    hour12: false,
  }).format(new Date(iso));
  return Number(str);
}

function inWindow(hour: number, w: TimeWindow): boolean {
  if (w === 'any') return true;
  if (w === 'early') return hour >= 0 && hour < 6;
  if (w === 'morning') return hour >= 6 && hour < 12;
  if (w === 'afternoon') return hour >= 12 && hour < 18;
  return hour >= 18;
}

export function filterOffers(offers: FlightOffer[], f: FiltersState): FlightOffer[] {
  return offers.filter((o) => {
    if (o.price.total > f.maxPrice) return false;
    if (o.durationMin > f.maxDuration) return false;
    if (f.stops === 'direct' && o.stops !== 0) return false;
    if (f.stops === 'one' && o.stops !== 1) return false;
    if (f.stops === 'twoPlus' && o.stops < 2) return false;
    const seg = o.legs[0]?.segments[0];
    const lastSeg = o.legs[o.legs.length - 1]?.segments.slice(-1)[0];
    if (seg && f.airlines.length > 0 && !f.airlines.includes(seg.airlineCode)) return false;
    if (seg && !inWindow(hourOf(seg.departureAt, seg.from.timezone), f.depWindow)) return false;
    if (lastSeg && !inWindow(hourOf(lastSeg.arrivalAt, lastSeg.to.timezone), f.arrWindow)) return false;
    return true;
  });
}

interface PanelProps {
  filters: FiltersState;
  onChange: (f: FiltersState) => void;
  bounds: FilterBounds;
  cabin: CabinClass;
  onReset: () => void;
}

export function FiltersPanel({ filters, onChange, bounds, cabin, onReset }: PanelProps) {
  const cabinLabel = CABINS.find((c) => c.value === cabin)?.label ?? cabin;
  const count = activeFilterCount(filters, bounds);

  const toggleAirline = (code: string) =>
    onChange({
      ...filters,
      airlines: filters.airlines.includes(code)
        ? filters.airlines.filter((c) => c !== code)
        : [...filters.airlines, code],
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink">Filters {count > 0 && <span className="text-brand">({count})</span>}</h2>
        <button
          onClick={onReset}
          disabled={count === 0}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-brand disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      {/* Price */}
      <fieldset>
        <legend className="mb-2 flex w-full items-center justify-between text-[13px] font-semibold text-ink">
          Max total price
          <span className="text-brand">{formatMoney(filters.maxPrice)}</span>
        </legend>
        <input
          type="range"
          min={bounds.minPrice}
          max={bounds.maxPrice}
          step={Math.max(1, Math.round((bounds.maxPrice - bounds.minPrice) / 50))}
          value={filters.maxPrice}
          onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })}
          aria-label="Maximum total price"
          className="w-full accent-brand"
        />
        <div className="mt-1 flex justify-between text-[11px] text-muted">
          <span>{formatMoney(bounds.minPrice)}</span>
          <span>{formatMoney(bounds.maxPrice)}</span>
        </div>
      </fieldset>

      {/* Duration */}
      <fieldset>
        <legend className="mb-2 flex w-full items-center justify-between text-[13px] font-semibold text-ink">
          Max travel time
          <span className="text-brand">{formatDuration(filters.maxDuration)}</span>
        </legend>
        <input
          type="range"
          min={bounds.minDuration}
          max={bounds.maxDuration}
          step={15}
          value={filters.maxDuration}
          onChange={(e) => onChange({ ...filters, maxDuration: Number(e.target.value) })}
          aria-label="Maximum travel duration"
          className="w-full accent-brand"
        />
        <div className="mt-1 flex justify-between text-[11px] text-muted">
          <span>{formatDuration(bounds.maxDuration)}</span>
          <span>{formatDuration(bounds.maxDuration)}</span>
        </div>
      </fieldset>

      {/* Stops */}
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-ink">Stops</legend>
        <div className="flex flex-wrap gap-1.5">
          {STOPS_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange({ ...filters, stops: o.value })}
              aria-pressed={filters.stops === o.value}
              className={cn('h-8 rounded-lg border px-3 text-[13px] font-medium transition', filters.stops === o.value ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-muted hover:text-ink')}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Departure time */}
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-ink">Departure time</legend>
        <div className="flex flex-wrap gap-1.5">
          {TIME_WINDOWS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => onChange({ ...filters, depWindow: w.value })}
              aria-pressed={filters.depWindow === w.value}
              className={cn('h-8 rounded-lg border px-2.5 text-[13px] font-medium transition', filters.depWindow === w.value ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-muted hover:text-ink')}
            >
              {w.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Arrival time */}
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-ink">Arrival time</legend>
        <div className="flex flex-wrap gap-1.5">
          {TIME_WINDOWS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => onChange({ ...filters, arrWindow: w.value })}
              aria-pressed={filters.arrWindow === w.value}
              className={cn('h-8 rounded-lg border px-2.5 text-[13px] font-medium transition', filters.arrWindow === w.value ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-muted hover:text-ink')}
            >
              {w.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Airlines */}
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-ink">Airlines</legend>
        <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
          {bounds.airlines.map((a) => {
            const checked = filters.airlines.includes(a.code);
            return (
              <label
                key={a.code}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-ink transition hover:bg-canvas"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleAirline(a.code)}
                  className="h-4 w-4 rounded border-line text-brand accent-brand focus:ring-brand/30"
                />
                <span className="flex-1 truncate">{a.name}</span>
                <span className="text-[11px] font-bold text-muted">{a.code}</span>
              </label>
            );
          })}
          {bounds.airlines.length === 0 && <p className="text-[13px] text-muted">No airlines in results.</p>}
        </div>
      </fieldset>

      {/* Cabin */}
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-ink">Cabin class</legend>
        <div className="rounded-lg border border-line bg-canvas px-3 py-2.5 text-[13px] text-muted">
          <span className="font-semibold text-ink">{cabinLabel}</span> — set by your search.{' '}
          <Link to="/search" className="font-semibold text-brand hover:underline">
            Adjust in search
          </Link>
        </div>
      </fieldset>
    </div>
  );
}

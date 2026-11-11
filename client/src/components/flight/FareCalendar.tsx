import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { usePriceCalendar } from '@/hooks/queries/useFlights';
import { cn } from '@/utils/cn';
import { addDays, formatDate, formatMoney, toDateString } from '@/utils/format';
import type { CabinClass, PriceCalendarDay } from '@/types';

interface Props {
  label: string;
  value: string;
  onChange: (date: string) => void;
  cabin: CabinClass;
  fromIata?: string | null;
  toIata?: string | null;
  /** Earliest selectable date (YYYY-MM-DD). Defaults to today. */
  minDate?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const PANEL_MIN_WIDTH = 340;

function monthOf(date: string): string {
  return date.slice(0, 7);
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/** Sunday-first grid of YYYY-MM-DD cells (null = leading/trailing blanks). */
function monthGrid(month: string): (string | null)[] {
  const [y, m] = month.split('-').map(Number);
  const leading = new Date(y, m - 1, 1).getDay();
  const count = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= count; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

type Tier = 'cheap' | 'typical' | 'high';

function priceTier(price: number, min: number, max: number): Tier {
  if (max <= min) return 'cheap';
  const t = (price - min) / (max - min);
  if (t <= 0.3) return 'cheap';
  if (t >= 0.7) return 'high';
  return 'typical';
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', className)} aria-hidden />
      {label}
    </span>
  );
}

/**
 * Google Flights-style fare calendar dropdown.
 * Fares come from the existing /flights/calendar API via react-query
 * (cached per route + month + cabin), so route/month changes refetch
 * automatically and repeated opens hit the cache.
 */
export function FareCalendar({
  label,
  value,
  onChange,
  cabin,
  fromIata,
  toIata,
  minDate,
  required,
  error,
  className,
}: Props) {
  const today = toDateString(new Date());
  const min = minDate ?? today;
  const minMonth = monthOf(min);
  const maxMonth = monthOf(addDays(today, 335));

  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => monthOf(value || today));
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fieldId = useId();

  const routeReady = !!fromIata && !!toIata;

  // Selected-date fare (kept loaded while closed so the trigger can show it).
  const selQuery = usePriceCalendar(
    routeReady && value ? { from: fromIata!, to: toIata!, month: monthOf(value), cabin } : null,
  );
  // Viewed-month fares while open. Same month as selection -> same query key -> cache hit.
  const viewQuery = usePriceCalendar(
    routeReady && open ? { from: fromIata!, to: toIata!, month: viewMonth, cabin } : null,
  );

  const activeQuery = open ? viewQuery : selQuery;
  const days: PriceCalendarDay[] | undefined = activeQuery.data?.days;
  const estimated = activeQuery.data?.estimated ?? true;
  const loading = activeQuery.isFetching;

  const byDate = useMemo(() => new Map((days ?? []).map((d) => [d.date, d])), [days]);
  const { minPrice, maxPrice } = useMemo(() => {
    const prices = (days ?? []).filter((d) => d.available && d.price > 0).map((d) => d.price);
    return {
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
    };
  }, [days]);

  const cells = monthGrid(open ? viewMonth : monthOf(value || today));
  const activeMonth = open ? viewMonth : monthOf(value || today);
  const canGoPrev = activeMonth > minMonth;
  const canGoNext = activeMonth < maxMonth;

  /* ---- dropdown positioning (portal -> never clipped) ---- */
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const compute = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger) return;
      const r = trigger.getBoundingClientRect();
      const width = Math.max(r.width, PANEL_MIN_WIDTH);
      const height = panel?.offsetHeight ?? 480;
      const gap = 8;
      const spaceBelow = window.innerHeight - r.bottom;
      const placeAbove = spaceBelow < height + gap && r.top > spaceBelow;
      const rawTop = placeAbove ? r.top - height - gap : r.bottom + gap;
      const top = Math.max(10, Math.min(rawTop, window.innerHeight - height - 10));
      const left = Math.max(10, Math.min(r.left, window.innerWidth - width - 10));
      setPos({ left, top, width });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [open]);

  /* ---- close on outside click / Escape ---- */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setViewMonth(monthOf(value || today));
    setOpen(true);
  }

  function pick(date: string) {
    if (isDisabled(date)) return;
    onChange(date);
    setViewMonth(monthOf(date));
    setOpen(false);
    triggerRef.current?.focus();
  }

  function isDisabled(date: string): boolean {
    if (date < min) return true;
    const day = byDate.get(date);
    if (day && !day.available) return true;
    return false;
  }

  function fareFor(date: string): { text: string; tier: Tier | null } {
    const day = byDate.get(date);
    if (day) {
      if (!day.available) return { text: '—', tier: null };
      if (minPrice == null || maxPrice == null) return { text: formatMoney(day.price), tier: null };
      return { text: formatMoney(day.price), tier: priceTier(day.price, minPrice, maxPrice) };
    }
    if (loading) return { text: '···', tier: null };
    return { text: '', tier: null };
  }

  const selectedFare = value && !open ? selQuery.data?.days.find((d) => d.date === value) : undefined;
  const viewFare = open ? viewQuery.data?.days.find((d) => d.date === value) : undefined;
  const triggerFare = viewFare ?? selectedFare;

  return (
    <div className={cn('w-full', className)}>
      {/* Field label (mirrors Input) */}
      <label
        htmlFor={fieldId}
        className="mb-1.5 block text-[13px] font-medium text-ink"
      >
        {label}
        {required && <span className="ml-0.5 text-error">*</span>}
      </label>

      {/* Trigger styled like .input */}
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={!!error}
        onClick={toggle}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-xl border bg-canvas px-3.5 text-sm transition',
          'focus:outline-none focus:ring-4',
          error
            ? 'border-error text-ink focus:border-error focus:ring-error/15'
            : open
              ? 'border-brand text-ink focus:ring-brand/15'
              : 'border-line text-ink focus:border-brand focus:ring-brand/15',
        )}
      >
        <span className={cn('shrink-0', value ? 'text-brand' : 'text-muted')} aria-hidden>
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="2" y="3.5" width="12" height="10.5" rx="2" />
            <path d="M2 6.5h12M5.5 2v3M10.5 2v3" strokeLinecap="round" />
          </svg>
        </span>
        <span className={cn('min-w-0 flex-1 truncate text-left', !value && 'text-muted')}>
          {value ? formatDate(value) : 'Select date'}
        </span>
        {triggerFare && triggerFare.available && (
          <span
            className={cn(
              'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold',
              loading ? 'animate-pulse text-muted' : 'bg-brand-soft text-brand',
            )}
          >
            {formatMoney(triggerFare.price)}
          </span>
        )}
        <span className={cn('shrink-0 transition-transform duration-200', open && 'rotate-180')} aria-hidden>
          <svg className="h-4 w-4 text-muted" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-error">
          {error}
        </p>
      )}

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={`${label} fare calendar`}
            className="fixed z-[60] animate-fade-in rounded-2xl border border-line bg-surface p-3 shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
            style={{
              left: pos?.left ?? -9999,
              top: pos?.top ?? -9999,
              width: pos?.width ?? PANEL_MIN_WIDTH,
              visibility: pos ? 'visible' : 'hidden',
            }}
          >
            {/* Header: month nav + Today / Clear */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => canGoPrev && setViewMonth(shiftMonth(activeMonth, -1))}
                  disabled={!canGoPrev}
                  aria-label="Previous month"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition hover:border-brand hover:text-brand disabled:opacity-35 disabled:hover:border-line disabled:hover:text-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[148px] px-1.5 text-center text-sm font-bold text-ink">
                  {monthLabel(activeMonth)}
                </span>
                <button
                  type="button"
                  onClick={() => canGoNext && setViewMonth(shiftMonth(activeMonth, 1))}
                  disabled={!canGoNext}
                  aria-label="Next month"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition hover:border-brand hover:text-brand disabled:opacity-35 disabled:hover:border-line disabled:hover:text-muted"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" aria-label="Loading fares" />}
                <button
                  type="button"
                  onClick={() => setViewMonth(monthOf(today))}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-brand-soft hover:text-brand"
                >
                  Today
                </button>
                {value && (
                  <button
                    type="button"
                    onClick={() => onChange('')}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-error-soft hover:text-error"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <path d="M3 3l6 6M9 3L3 9" strokeLinecap="round" />
                    </svg>
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Weekday header */}
            <div className="mt-2 grid grid-cols-7 gap-1 px-0.5" aria-hidden>
              {WEEKDAYS.map((w) => (
                <span key={w} className="py-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted">
                  {w}
                </span>
              ))}
            </div>

            {/* Day grid with fares */}
            <div className="grid grid-cols-7 gap-1 px-0.5" role="grid" aria-label={monthLabel(activeMonth)}>
              {cells.map((date, i) => {
                if (!date) return <span key={`blank-${i}`} aria-hidden />;
                const dayNum = Number(date.slice(8, 10));
                const isPast = date < min;
                const day = byDate.get(date);
                const unavailable = day ? !day.available : false;
                const disabled = isPast || unavailable;
                const selected = date === value;
                const isToday = date === today;
                const { text, tier } = fareFor(date);

                return (
                  <button
                    key={date}
                    type="button"
                    role="gridcell"
                    onClick={() => pick(date)}
                    disabled={disabled}
                    aria-pressed={selected}
                    aria-label={`${formatDate(date)}${text && text !== '—' ? `, ${text}` : ''}${unavailable ? ', unavailable' : ''}`}
                    className={cn(
                      'relative flex h-14 flex-col items-center justify-center gap-1 rounded-xl border transition',
                      selected
                        ? 'border-brand bg-brand shadow-[0_0_18px_rgba(230,255,25,0.4)]'
                        : disabled
                          ? 'cursor-not-allowed border-transparent bg-transparent opacity-45'
                          : tier === 'cheap'
                            ? 'border-brand/30 bg-brand/[0.07] hover:border-brand/70 hover:bg-brand/15'
                            : 'border-transparent hover:border-line hover:bg-canvas',
                      !selected && isToday && !disabled && 'ring-1 ring-brand/40',
                    )}
                  >
                    <span
                      className={cn(
                        'text-[13px] font-semibold leading-none',
                        selected ? 'text-navy' : disabled ? 'text-muted' : 'text-ink',
                      )}
                    >
                      {dayNum}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-medium leading-none',
                        selected
                          ? 'text-navy/75'
                          : text === '···'
                            ? 'animate-pulse text-muted/70'
                            : text === '—' || text === ''
                              ? 'text-muted/40'
                              : tier === 'cheap'
                                ? 'text-brand'
                                : tier === 'high'
                                  ? 'text-ink'
                                  : 'text-muted',
                      )}
                    >
                      {text || '\u00A0'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Footer: legend + source note */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-line pt-2.5 text-[10px] font-medium text-muted">
              <div className="flex items-center gap-3">
                <LegendDot className="bg-brand" label="Cheapest" />
                <LegendDot className="bg-muted" label="Typical" />
                <LegendDot className="bg-ink" label="Higher fare" />
              </div>
              <span>
                {!routeReady
                  ? 'Select airports to see fares'
                  : loading
                    ? 'Loading fares…'
                    : estimated
                      ? 'Estimated demo fares'
                      : 'Live fares'}
              </span>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

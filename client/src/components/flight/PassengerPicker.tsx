import { useEffect, useRef, useState } from 'react';
import { Check, Minus, Plus, Users } from 'lucide-react';
import { PASSENGER_HINTS, PASSENGER_LABELS } from '@/constants';
import type { SearchPassengers } from '@/types';
import { cn } from '@/utils/cn';
import { pluralize } from '@/utils/format';

interface Props {
  value: SearchPassengers;
  onChange: (value: SearchPassengers) => void;
  error?: string;
}

const KEYS: Array<keyof SearchPassengers> = ['adult', 'child', 'infant'];
const MAX_TOTAL = 9;

export function PassengerPicker({ value, onChange, error }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const total = value.adult + value.child + value.infant;

  const update = (key: keyof SearchPassengers, next: number) => {
    const draft = { ...value, [key]: next };
    if (draft.adult < 1) draft.adult = 1;
    if (draft.child < 0) draft.child = 0;
    if (draft.infant < 0) draft.infant = 0;
    if (draft.infant > draft.adult) draft.infant = draft.adult;
    if (draft.adult + draft.child + draft.infant > MAX_TOTAL) return;
    onChange(draft);
  };

  const summary = KEYS.filter((k) => value[k] > 0)
    .map((k) => `${value[k]} ${PASSENGER_LABELS[k].toLowerCase()}`)
    .join(', ');

  return (
    <div className="relative w-full" ref={ref}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink" id="pax-label">
        <Users className="mr-1.5 inline h-3.5 w-3.5 text-brand" aria-hidden />
        Passengers
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-labelledby="pax-label"
        aria-invalid={!!error}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-xl border bg-surface px-3.5 text-sm transition focus:outline-none focus:ring-4',
          error ? 'border-error focus:ring-error/15' : 'border-line focus:border-brand focus:ring-brand/15',
        )}
      >
        <span className="truncate text-ink">{summary}</span>
        <span className="ml-2 rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-bold text-brand-dark">
          {total}
        </span>
      </button>
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-error">
          {error}
        </p>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Select passengers"
          className="absolute right-0 top-full z-30 mt-1.5 w-full max-w-xs rounded-xl border border-line bg-surface p-3 shadow-pop sm:w-80"
        >
          {KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0">
              <div>
                <p className="text-sm font-semibold text-ink">{PASSENGER_LABELS[key]}</p>
                <p className="text-xs text-muted">{PASSENGER_HINTS[key]}</p>
              </div>
              <div className="flex items-center gap-2">
                <Stepper
                  direction="minus"
                  label={`Remove one ${PASSENGER_LABELS[key].toLowerCase()}`}
                  disabled={key === 'adult' ? value.adult <= 1 : value[key] <= 0}
                  onClick={() => update(key, value[key] - 1)}
                />
                <span className="w-5 text-center text-sm font-bold text-ink" aria-live="polite">
                  {value[key]}
                </span>
                <Stepper
                  direction="plus"
                  label={`Add one ${PASSENGER_LABELS[key].toLowerCase()}`}
                  disabled={total >= MAX_TOTAL || (key === 'infant' && value.infant >= value.adult)}
                  onClick={() => update(key, value[key] + 1)}
                />
              </div>
            </div>
          ))}
          <p className="pt-1 text-[11px] leading-relaxed text-muted">
            Up to {MAX_TOTAL} passengers per booking. Infants must travel with an adult.
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-navy text-[13px] font-semibold text-white hover:bg-navy-soft"
          >
            <Check className="h-4 w-4" /> Done
          </button>
        </div>
      )}
    </div>
  );
}

function Stepper({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction: 'plus' | 'minus';
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const Icon = direction === 'plus' ? Plus : Minus;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink transition hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function passengerSummary(p: SearchPassengers): string {
  return KEYS.filter((k) => p[k] > 0)
    .map((k) => `${p[k]} ${PASSENGER_LABELS[k].toLowerCase()}`)
    .join(', ') || pluralize(p.adult, 'passenger');
}

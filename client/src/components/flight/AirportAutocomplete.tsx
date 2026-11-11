import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, Plane, X } from 'lucide-react';
import { useAirportAutocomplete } from '@/hooks/queries/useFlights';
import { flightsApi } from '@/services/api/flights';
import type { Airport } from '@/types';
import { cn } from '@/utils/cn';

interface Props {
  label: string;
  value: Airport | null;
  onChange: (airport: Airport | null) => void;
  placeholder?: string;
  error?: string;
  defaultIata?: string;
  required?: boolean;
}

export function AirportAutocomplete({
  label,
  value,
  onChange,
  placeholder = 'City or airport',
  error,
  defaultIata,
  required,
}: Props) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resolvedRef = useRef<string | null>(null);

  const { data, isFetching } = useAirportAutocomplete(debounced);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (value) setQuery(`${value.city} (${value.iata})`);
    else if (!open) setQuery('');
  }, [value, open]);

  useEffect(() => {
    if (value || !defaultIata || resolvedRef.current === defaultIata) return;
    resolvedRef.current = defaultIata;
    let cancelled = false;
    flightsApi
      .autocomplete(defaultIata)
      .then((res) => {
        const found = res.airports.find((a) => a.iata === defaultIata);
        if (found && !cancelled) onChange(found);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [defaultIata, value, onChange]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const options = data?.airports ?? [];

  const choose = (airport: Airport) => {
    onChange(airport);
    setQuery(`${airport.city} (${airport.iata})`);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(options.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && options[activeIndex]) {
        e.preventDefault();
        choose(options[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={wrapRef}>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-ink">
        <MapPin className="h-3.5 w-3.5 text-brand" aria-hidden />
        {label}
        {required && <span className="text-error">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && options[activeIndex] ? `${id}-opt-${options[activeIndex].iata}` : undefined}
          aria-invalid={!!error}
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
            if (value) onChange(null);
          }}
          onKeyDown={onKeyDown}
          className={cn(
            'h-11 w-full rounded-xl border bg-surface pr-16 pl-3.5 text-sm text-ink transition',
            'placeholder:text-muted focus:outline-none focus:ring-4',
            error ? 'border-error focus:ring-error/15' : 'border-line focus:border-brand focus:ring-brand/15',
          )}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                onChange(null);
                inputRef.current?.focus();
              }}
              className="rounded p-1 text-muted hover:text-ink"
              aria-label={`Clear ${label}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {value && (
            <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-bold text-brand-dark">
              {value.iata}
            </span>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-error">
          {error}
        </p>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            id={`${id}-list`}
            role="listbox"
            aria-label={`${label} options`}
            className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-pop"
          >
            {isFetching && !options.length && (
              <div className="px-3 py-2 text-xs text-muted">Searching airports…</div>
            )}
            {!isFetching && options.length === 0 && (
              <div className="px-3 py-3 text-xs text-muted">No airports match “{debounced}”.</div>
            )}
            {options.map((a, i) => (
              <button
                type="button"
                key={a.iata}
                id={`${id}-opt-${a.iata}`}
                role="option"
                aria-selected={value?.iata === a.iata}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => choose(a)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition',
                  i === activeIndex ? 'bg-brand-soft' : 'hover:bg-canvas',
                )}
              >
                <span className="flex h-8 w-11 items-center justify-center rounded-md bg-navy text-[11px] font-bold text-white">
                  {a.iata}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{a.city}</span>
                  <span className="block truncate text-xs text-muted">{a.name}</span>
                </span>
                <Plane className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {open && options.length === 0 && debounced === '' && (
        <p className="sr-only">Start typing a city or airport code</p>
      )}
      {!open && (
        <span className="sr-only">
          {label} selected{value ? `: ${value.city}` : ''}
        </span>
      )}
    </div>
  );
}

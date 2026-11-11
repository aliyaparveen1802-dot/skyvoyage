import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  CalendarRange,
  SlidersHorizontal,
  ArrowUpDown,
  Search as SearchIcon,
} from 'lucide-react';
import { FlightCard } from '@/components/flight/FlightCard';
import { PriceCalendar } from '@/components/flight/PriceCalendar';
import {
  FiltersPanel,
  activeFilterCount,
  computeBounds,
  defaultFilters,
  filterOffers,
  type FiltersState,
} from '@/components/flight/FiltersPanel';
import { SkeletonList } from '@/components/common/Skeleton';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Modal } from '@/components/common/Modal';
import { Badge } from '@/components/common/Badge';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useToast } from '@/context/ToastContext';
import { useFlightSearch, usePriceCalendar } from '@/hooks/queries/useFlights';
import { useSaveFlight, useSavedFlights } from '@/hooks/queries/useProfile';
import { CABINS } from '@/constants';
import type { FlightSearchQuery } from '@/types';
import type { SearchResult } from '@/services/api/flights';
import { errorMessage } from '@/services/api/client';
import { addDays, formatDate, pluralize } from '@/utils/format';
import { cn } from '@/utils/cn';

type SortKey = 'cheapest' | 'fastest' | 'recommended';

const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'cheapest', label: 'Cheapest' },
  { value: 'fastest', label: 'Fastest' },
];

export default function SearchResults() {
  const { search, searchId, setSearch } = useBooking();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [sort, setSort] = useState<SortKey>('recommended');
  const [filters, setFilters] = useState<FiltersState | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const searchMutation = useFlightSearch();
  const attemptedRef = useRef(false);

  const validQuery = search.legs.length > 0 && search.legs.every((l) => l.from && l.to && !!l.date);
  const cached = searchId ? qc.getQueryData<SearchResult>(['search', searchId]) : undefined;
  const results = cached ?? searchMutation.data ?? null;

  useEffect(() => {
    if (results || attemptedRef.current || !searchId || !validQuery || searchMutation.isPending) return;
    attemptedRef.current = true;
    searchMutation
      .mutateAsync(search)
      .then((r) => setSearch(search, r.searchId))
      .catch(() => undefined);
  }, [results, searchId, validQuery, searchMutation.isPending]);

  const bounds = useMemo(() => computeBounds(results?.offers ?? []), [results]);
  const activeFilters = filters ?? defaultFilters(bounds);

  useEffect(() => {
    setFilters(null);
  }, [results]);

  const visible = useMemo(() => {
    const filtered = filterOffers(results?.offers ?? [], activeFilters);
    const sorted = [...filtered];
    if (sort === 'cheapest') sorted.sort((a, b) => a.price.total - b.price.total);
    else if (sort === 'fastest') sorted.sort((a, b) => a.durationMin - b.durationMin);
    else sorted.sort((a, b) => b.score - a.score);
    return sorted;
  }, [results, activeFilters, sort]);

  /* Price calendar for the outbound month (+ adjacent month when the window crosses over) */
  const departDate = search.legs[0]?.date ?? '';
  const outbound = search.legs[0];
  const calMonth1 = departDate.slice(0, 7);
  const calMonth2 = addDays(departDate, 4).slice(0, 7);
  const cal1 = usePriceCalendar(
    outbound && calMonth1 ? { from: outbound.from, to: outbound.to, month: calMonth1, cabin: search.cabin } : null,
  );
  const cal2 = usePriceCalendar(
    outbound && calMonth2 && calMonth2 !== calMonth1
      ? { from: outbound.from, to: outbound.to, month: calMonth2, cabin: search.cabin }
      : null,
  );
  const calendarDays = [...(cal1.data?.days ?? []), ...(cal2.data?.days ?? [])];

  const savedQuery = useSavedFlights();
  const saveMutation = useSaveFlight();
  const savedIds = new Set((savedQuery.data?.flights ?? []).map((f) => f.offerId));

  async function runQuery(query: FlightSearchQuery) {
    try {
      const r = await searchMutation.mutateAsync(query);
      setSearch(query, r.searchId);
      attemptedRef.current = true;
    } catch (err) {
      toast({ title: 'Flight search failed', description: errorMessage(err), variant: 'error' });
    }
  }

  function pickDate(date: string) {
    if (!validQuery) return;
    const legs = search.legs.map((l, i) => (i === 0 ? { ...l, date } : l));
    if (search.tripType === 'roundtrip' && legs[1] && legs[1].date < date) {
      legs[1] = { ...legs[1], date: addDays(date, 7) };
    }
    void runQuery({ ...search, legs });
  }

  function onSave(offerId: string) {
    if (!user) {
      navigate('/login', { state: { from: '/search/results' } });
      return;
    }
    if (!searchId) return;
    saveMutation.mutate(
      { searchId, offerId },
      {
        onSuccess: () => toast({ title: 'Flight saved', description: 'Find it under Saved flights.', variant: 'success' }),
        onError: (e) => toast({ title: 'Could not save flight', description: errorMessage(e), variant: 'error' }),
      },
    );
  }

  if (!searchId || !validQuery) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<SearchIcon className="h-6 w-6" />}
          title="No active flight search"
          description="Start a search to compare demo fares across airlines, cabins and dates."
          action={
            <Link to="/search" className="btn-primary">
              Search flights
            </Link>
          }
        />
      </div>
    );
  }

  const legs = search.legs;
  const paxTotal = search.passengers.adult + search.passengers.child + search.passengers.infant;
  const cabinLabel = CABINS.find((c) => c.value === search.cabin)?.label ?? search.cabin;
  const filterCount = activeFilterCount(activeFilters, bounds);
  const rangeLabel =
    legs.length > 1
      ? `${legs[0].from} → ${legs[0].to} → ${legs[legs.length - 1].to}`
      : `${legs[0].from} → ${legs[0].to}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Search summary */}
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-extrabold tracking-tight text-ink sm:text-xl">{rangeLabel}</h1>
            <Badge tone="info">Demo fares</Badge>
          </div>
          <p className="mt-1 truncate text-sm text-muted">
            {legs.map((l) => formatDate(l.date)).join(' · ')} · {pluralize(paxTotal, 'passenger')} · {cabinLabel} ·{' '}
            {search.tripType === 'roundtrip' ? 'Round trip' : search.tripType === 'multicity' ? 'Multi-city' : 'One way'}
          </p>
        </div>
        <Link to="/search" className="btn-secondary h-10 shrink-0 self-start px-4 text-[13px] sm:self-auto">
          <ArrowLeftRight className="h-4 w-4" /> Modify search
        </Link>
      </div>

      {/* Price calendar */}
      <div className="mt-4">
        <PriceCalendar
          baseDate={departDate}
          days={calendarDays}
          activeDate={departDate}
          onPick={pickDate}
          onShift={(dir) => pickDate(addDays(departDate, dir))}
          loading={cal1.isFetching || cal2.isFetching}
        />
      </div>

      <div className="mt-5 flex gap-6">
        {/* Desktop filters */}
        <aside className="hidden w-72 shrink-0 lg:block" aria-label="Search filters">
          <div className="card sticky top-20 p-5">
            {results && (
              <FiltersPanel
                filters={activeFilters}
                onChange={setFilters}
                bounds={bounds}
                cabin={search.cabin}
                onReset={() => setFilters(defaultFilters(bounds))}
              />
            )}
          </div>
        </aside>

        {/* Results */}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {results ? (
                <>
                  <span className="font-semibold text-ink">{visible.length}</span> of{' '}
                  {pluralize(results.offers.length, 'flight')} · estimated prices from a{' '}
                  <span className="font-semibold text-ink">demo provider</span>
                </>
              ) : (
                'Searching the demo provider…'
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="btn-secondary h-9 px-3.5 text-[13px] lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" /> Filters
                {filterCount > 0 && (
                  <span className="ml-1 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {filterCount}
                  </span>
                )}
              </button>
              <div className="hidden items-center gap-1.5 lg:flex">
                <ArrowUpDown className="h-4 w-4 text-muted" aria-hidden />
                <div className="flex rounded-lg border border-line bg-surface p-0.5">
                  {SORTS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSort(s.value)}
                      aria-pressed={sort === s.value}
                      className={cn(
                        'h-8 rounded-md px-3 text-[13px] font-semibold transition',
                        sort === s.value ? 'bg-navy text-white' : 'text-muted hover:text-ink',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile sort */}
          <div className="mb-4 flex items-center gap-2 overflow-x-auto lg:hidden">
            {SORTS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSort(s.value)}
                aria-pressed={sort === s.value}
                className={cn(
                  'h-9 shrink-0 rounded-full border px-4 text-[13px] font-semibold transition',
                  sort === s.value ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line bg-surface text-muted',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {!results && searchMutation.isError && (
            <div className="card">
              <ErrorState
                title="We couldn't complete your search"
                description={errorMessage(searchMutation.error)}
                onRetry={() => {
                  attemptedRef.current = false;
                  searchMutation.mutate(search);
                }}
              />
            </div>
          )}

          {!results && searchMutation.isPending && <SkeletonList count={4} />}

          {results && visible.length === 0 && (
            <div className="card">
              <EmptyState
                title="No flights match your filters"
                description="Try widening the price range, allowing more stops or clearing airline filters."
                action={
                  <button
                    onClick={() => setFilters(defaultFilters(bounds))}
                    className="btn-primary"
                  >
                    Clear filters
                  </button>
                }
              />
            </div>
          )}

          {results && visible.length > 0 && (
            <div className="space-y-4">
              {visible.map((offer) => (
                <FlightCard
                  key={offer.id}
                  offer={offer}
                  searchId={results.searchId}
                  saved={savedIds.has(offer.id)}
                  saving={saveMutation.isPending}
                  onSave={() => onSave(offer.id)}
                />
              ))}
            </div>
          )}

          {results && visible.length > 0 && (
            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
              <CalendarRange className="h-3.5 w-3.5" aria-hidden />
              Final prices are confirmed by the provider at checkout — this demo verifies payment server-side.
            </p>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      <Modal
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        title="Filter flights"
        description={`${visible.length} flights match your filters`}
        footer={
          <button onClick={() => setMobileFiltersOpen(false)} className="btn-primary w-full">
            Show {visible.length} flights
          </button>
        }
      >
        {results && (
          <FiltersPanel
            filters={activeFilters}
            onChange={setFilters}
            bounds={bounds}
            cabin={search.cabin}
            onReset={() => setFilters(defaultFilters(bounds))}
          />
        )}
      </Modal>
    </div>
  );
}

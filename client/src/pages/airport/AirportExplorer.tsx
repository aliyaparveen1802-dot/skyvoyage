import { useEffect, useMemo, useState } from 'react';
import { Armchair, BedDouble, Clock, HeartPulse, Info, MapPin, Search, ShoppingBag, Star, Stethoscope, Utensils, Wallet, X } from 'lucide-react';
import { PageHeader } from '@/components/common/Brand';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/FormFields';
import { Modal } from '@/components/common/Modal';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState, ErrorState } from '@/components/common/States';
import { AirportSelector } from '@/components/airport/AirportSelector';
import { AIRPORTS_WITH_GUIDE, FACILITY_CATEGORIES } from '@/constants';
import { useFacilities } from '@/hooks/queries/useAirport';
import type { AirportFacility } from '@/types';
import { cn } from '@/utils/cn';
import { formatMoney } from '@/utils/format';

const CATEGORY_ICONS: Record<string, typeof Armchair> = {
  lounge: Armchair,
  dining: Utensils,
  hotel: BedDouble,
  shopping: ShoppingBag,
  wellness: HeartPulse,
  worship: MapPin,
  services: Wallet,
  medical: Stethoscope,
};

function categoryLabel(value: string): string {
  return FACILITY_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function Rating({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[13px] font-medium text-ink"
      aria-label={`Rated ${rating} out of 5`}
    >
      <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden />
      {rating.toFixed(1)}
    </span>
  );
}

function FacilityCard({
  facility,
  currency,
  onReserve,
}: {
  facility: AirportFacility;
  currency: string;
  onReserve: () => void;
}) {
  const Icon = CATEGORY_ICONS[facility.category] ?? MapPin;

  const priceLabel = (() => {
    if (facility.priceMin === undefined) return 'Price on request';
    if (facility.priceMin === 0) return 'Free';
    return formatMoney(facility.priceMin, facility.currency || currency);
  })();

  const distanceLabel = (() => {
    if (facility.distanceM !== undefined && facility.walkMin !== undefined) {
      return `${facility.distanceM} m · ~${facility.walkMin} min walk`;
    }
    if (facility.distanceM !== undefined) return `${facility.distanceM} m`;
    if (facility.walkMin !== undefined) return `~${facility.walkMin} min walk`;
    return null;
  })();

  return (
    <article className="card flex h-full flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-dark"
          >
            <Icon className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-snug text-ink">{facility.name}</h3>
            <p className="mt-1 text-xs text-muted">
              {facility.terminal} · {facility.location}
            </p>
          </div>
        </div>
        <Badge tone="info">{categoryLabel(facility.category)}</Badge>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-muted">{facility.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {facility.openingHours}
        </span>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
            facility.openNow ? 'bg-success-soft text-success' : 'bg-canvas text-muted',
          )}
        >
          {facility.openNow ? 'Open now' : 'Closed'}
        </span>
        {distanceLabel && <span>{distanceLabel}</span>}
        {facility.rating !== undefined && <Rating rating={facility.rating} />}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3.5">
        <p className="text-sm font-semibold text-ink">{priceLabel}</p>
        {facility.bookingSupported && (
          <Button variant="secondary" size="sm" onClick={onReserve}>
            Reserve
          </Button>
        )}
      </div>
    </article>
  );
}

export default function AirportExplorer() {
  const [airport, setAirport] = useState(AIRPORTS_WITH_GUIDE[0]);
  const [category, setCategory] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [reserveTarget, setReserveTarget] = useState<AirportFacility | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setQ(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const facilitiesQuery = useFacilities({
    airport,
    category: category === 'all' ? undefined : category,
    q: q || undefined,
  });

  const facilities = facilitiesQuery.data?.facilities ?? [];
  const currency = facilitiesQuery.data?.currency ?? 'INR';
  const source = facilitiesQuery.data?.source;

  const hasActiveFilters = category !== 'all' || q.length > 0;

  const clearFilters = () => {
    setCategory('all');
    setSearchInput('');
    setQ('');
  };

  const categories = useMemo(() => FACILITY_CATEGORIES, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Airport explorer"
        subtitle="Lounges, dining, rest and services inside the terminal"
      />

      <div
        className="flex gap-3 rounded-card border border-warning/30 bg-warning-soft px-4 py-3.5"
        role="status"
      >
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
        <p className="text-sm font-medium text-ink">
          Sample facility directory (demo data) — verify details with the airport.
          {source === 'mock' && ' Entries below come from the demo dataset, not a live feed.'}
        </p>
      </div>

      <section className="card space-y-5 p-4 sm:p-5" aria-label="Facility filters">
        <div className="grid gap-5 lg:grid-cols-2">
          <AirportSelector value={airport} onChange={setAirport} label="Airport" />
          <div>
            <label htmlFor="facility-search" className="label">
              Search
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <Input
                id="facility-search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search lounges, food, shops…"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div>
          <p className="label" id="facility-category-label">
            Category
          </p>
          <div
            role="group"
            aria-labelledby="facility-category-label"
            className="flex flex-wrap gap-2"
          >
            {categories.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={category === item.value}
                onClick={() => setCategory(item.value)}
                className={cn('chip min-h-11 px-4', category === item.value && 'chip-active')}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {facilitiesQuery.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card space-y-3 p-4" aria-hidden>
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      )}

      {facilitiesQuery.isError && (
        <div className="card">
          <ErrorState
            title="Could not load facilities"
            description="The facility directory is unreachable right now."
            onRetry={() => facilitiesQuery.refetch()}
          />
        </div>
      )}

      {facilitiesQuery.isSuccess && facilities.length === 0 && (
        <div className="card">
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title="No facilities found"
            description={
              hasActiveFilters
                ? 'Nothing matches your current filters. Try a different category or clear the search.'
                : 'This airport has not published any facilities yet.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  <X className="h-4 w-4" aria-hidden /> Clear filters
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      {facilitiesQuery.isSuccess && facilities.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {facilities.map((facility) => (
            <FacilityCard
              key={facility.id}
              facility={facility}
              currency={currency}
              onReserve={() => setReserveTarget(facility)}
            />
          ))}
        </div>
      )}

      <Modal
        open={reserveTarget !== null}
        onClose={() => setReserveTarget(null)}
        title="Reservations are demo-only"
        description={reserveTarget ? reserveTarget.name : undefined}
      >
        <div className="space-y-3">
          <div className="flex gap-2.5 rounded-xl bg-warning-soft px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            <p className="text-[13px] leading-relaxed text-ink">
              Reservations are not processed in this demo — no booking will be created and no
              payment is taken.
            </p>
          </div>
          {reserveTarget && (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Terminal</dt>
                <dd className="font-medium text-ink">{reserveTarget.terminal}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Location</dt>
                <dd className="text-right font-medium text-ink">{reserveTarget.location}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Hours</dt>
                <dd className="text-right font-medium text-ink">
                  {reserveTarget.openingHours} · {reserveTarget.openNow ? 'Open now' : 'Closed'}
                </dd>
              </div>
            </dl>
          )}
          <p className="text-[13px] leading-relaxed text-muted">
            In a production build this would open the facility’s booking flow. Verify availability
            directly with the airport or facility.
          </p>
        </div>
      </Modal>
    </div>
  );
}

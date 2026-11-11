import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Plane, Trash2 } from 'lucide-react';
import { SearchWidget } from '@/components/flight/SearchWidget';
import { PageHeader } from '@/components/common/Brand';
import { useFlightSearch } from '@/hooks/queries/useFlights';
import { useBooking } from '@/context/BookingContext';
import { useToast } from '@/context/ToastContext';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { POPULAR_DESTINATIONS } from '@/constants';
import { errorMessage } from '@/services/api/client';
import { formatMoney } from '@/utils/format';

export default function SearchPage() {
  const navigate = useNavigate();
  const { setSearch } = useBooking();
  const { toast } = useToast();
  const recent = useRecentSearches();
  const searchMutation = useFlightSearch();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function rerun(id: string) {
    const entry = recent.items.find((r) => r.id === id);
    if (!entry) return;
    setPendingId(id);
    try {
      const result = await searchMutation.mutateAsync(entry.query);
      setSearch(entry.query, result.searchId);
      navigate('/search/results');
    } catch (err) {
      toast({ title: 'Flight search failed', description: errorMessage(err), variant: 'error' });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <PageHeader
        title="Search flights"
        subtitle="Compare demo fares across 18 airlines with full price transparency before you pay."
      />

      <div className="mt-6">
        <SearchWidget variant="page" />
      </div>

      {recent.items.length > 0 && (
        <section className="mt-10" aria-labelledby="recent-heading">
          <div className="flex items-center justify-between">
            <h2 id="recent-heading" className="flex items-center gap-2 text-base font-bold text-ink">
              <Clock className="h-4 w-4 text-brand" aria-hidden /> Recent searches
            </h2>
            <button
              onClick={recent.clear}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-error"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear all
            </button>
          </div>
          <div className="mt-3 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
            {recent.items.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{r.label}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {r.sublabel} · {r.query.passengers.adult + r.query.passengers.child + r.query.passengers.infant}{' '}
                    passenger
                    {r.query.passengers.adult + r.query.passengers.child + r.query.passengers.infant > 1 ? 's' : ''} ·{' '}
                    {r.query.cabin}
                  </p>
                </div>
                <button
                  onClick={() => rerun(r.id)}
                  disabled={searchMutation.isPending}
                  className="btn-secondary h-9 shrink-0 px-3.5 text-[13px]"
                >
                  {pendingId === r.id ? 'Searching…' : 'Search again'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10" aria-labelledby="popular-heading">
        <h2 id="popular-heading" className="flex items-center gap-2 text-base font-bold text-ink">
          <Plane className="h-4 w-4 text-brand" aria-hidden /> Trending routes from the demo dataset
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {POPULAR_DESTINATIONS.slice(0, 8).map((d) => (
            <div key={d.iata} className="rounded-card border border-line bg-surface p-3.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-extrabold text-navy">{d.iata}</span>
                <span className="text-[11px] font-semibold text-muted">{formatMoney(d.fromPrice)}</span>
              </div>
              <p className="mt-1 truncate text-[13px] text-ink">{d.city}</p>
              <p className="truncate text-[11px] text-muted">{d.country}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Prices are indicative estimates until a live provider is connected.</p>
      </section>
    </div>
  );
}

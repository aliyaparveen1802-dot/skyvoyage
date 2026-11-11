import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bookmark, Info, Plane, Radar, Search, Trash2 } from 'lucide-react';
import { useRemoveSavedFlight, useSavedFlights } from '@/hooks/queries/useProfile';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/common/Brand';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState, ErrorState } from '@/components/common/States';
import { formatDate, formatMoney, formatTime, relativeTime } from '@/utils/format';
import type { SavedFlight } from '@/types';

function SavedCard({
  flight,
  index,
  onRemove,
}: {
  flight: SavedFlight;
  index: number;
  onRemove: (flight: SavedFlight) => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2) }}
      className="card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold text-ink">{flight.routeLabel}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="chip">{flight.flightNumber}</span>
            <span>Saved {relativeTime(flight.createdAt)}</span>
          </p>
        </div>
        <p className="text-lg font-bold text-ink">
          {formatMoney(flight.price, flight.currency)}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <Plane className="h-4 w-4 text-brand" aria-hidden />
            {formatDate(flight.departureAt)}
          </span>
          <span>Departs {formatTime(flight.departureAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/flight-tracking/${flight.flightNumber}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-[13px] font-semibold text-ink transition hover:bg-canvas"
          >
            <Radar className="h-4 w-4" aria-hidden /> Track
          </Link>
          <button
            type="button"
            onClick={() => onRemove(flight)}
            aria-label={`Remove ${flight.flightNumber} ${flight.routeLabel} from saved flights`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted transition hover:border-error/40 hover:bg-error-soft hover:text-error"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export default function SavedFlights() {
  const { data, isLoading, isError, refetch } = useSavedFlights();
  const removeMutation = useRemoveSavedFlight();
  const { toast } = useToast();
  const [pending, setPending] = useState<SavedFlight | null>(null);

  const flights = data?.flights ?? [];

  const confirmRemove = () => {
    if (!pending) return;
    const target = pending;
    removeMutation.mutate(target.id, {
      onSuccess: () => {
        setPending(null);
        toast({
          title: 'Removed from saved flights',
          description: `${target.flightNumber} · ${target.routeLabel}`,
          variant: 'success',
        });
      },
      onError: (error: Error) => {
        setPending(null);
        toast({ title: 'Could not remove flight', description: error.message, variant: 'error' });
      },
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Saved flights"
        subtitle="Fares you shortlisted while searching."
        actions={
          <Link to="/search" className="btn-primary">
            <Search className="h-4 w-4" aria-hidden /> Search flights
          </Link>
        }
      />

      <p className="flex items-start gap-2 rounded-card border border-line bg-warning-soft px-4 py-3 text-xs leading-relaxed text-warning">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        Prices are indicative and come from the mock flight provider — they can change or disappear
        at any time. Re-run a search to see the current fare before booking.
      </p>

      {isError ? (
        <div className="card">
          <ErrorState
            title="We could not load your saved flights"
            description="Your shortlist is temporarily unavailable."
            onRetry={() => void refetch()}
          />
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-card" />
          ))}
        </div>
      ) : flights.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Bookmark className="h-6 w-6" />}
            title="No saved flights yet"
            description="Save fares from the search results to compare them later — they will wait for you here."
            action={
              <Link to="/search" className="btn-primary">
                <Search className="h-4 w-4" aria-hidden /> Search flights
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {flights.map((flight, index) => (
            <SavedCard key={flight.id} flight={flight} index={index} onRemove={setPending} />
          ))}
        </div>
      )}

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title="Remove this saved flight?"
        description={pending ? `${pending.flightNumber} · ${pending.routeLabel}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Keep it
            </Button>
            <Button variant="danger" loading={removeMutation.isPending} onClick={confirmRemove}>
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted">
          The fare will be removed from your shortlist. You can always search for it again.
        </p>
      </Modal>
    </div>
  );
}

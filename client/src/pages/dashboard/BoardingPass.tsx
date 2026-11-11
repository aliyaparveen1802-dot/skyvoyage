import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Plane, Printer, Ticket } from 'lucide-react';
import { useBoardingPasses } from '@/hooks/queries/useBookings';
import { PageHeader } from '@/components/common/Brand';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState, ErrorState } from '@/components/common/States';
import { formatDate, formatTime } from '@/utils/format';
import type { BoardingPass as BoardingPassRecord } from '@/services/api/bookings';

function splitAirport(value: string): { code: string; city: string } {
  const trimmed = value.trim();
  if (/^[A-Za-z]{3}$/.test(trimmed)) return { code: trimmed.toUpperCase(), city: '' };
  const parts = trimmed.split(/\s+/);
  if (parts.length > 1 && /^[A-Za-z]{3}$/.test(parts[0])) {
    return { code: parts[0].toUpperCase(), city: parts.slice(1).join(' ') };
  }
  return { code: trimmed, city: '' };
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function Barcode({ seed }: { seed: string }) {
  // Deterministic stripe pattern derived from the booking reference.
  const bars = Array.from({ length: 46 }, (_, i) => {
    const code = seed.charCodeAt(i % seed.length) + i * 7;
    return (code % 3) + 1;
  });
  return (
    <div className="flex h-12 items-stretch gap-[2px] overflow-hidden rounded-md bg-white px-3 py-1.5" aria-hidden>
      {bars.map((w, i) => (
        <span key={i} className="bg-navy" style={{ width: `${w}px` }} />
      ))}
    </div>
  );
}

function PassCard({ pass }: { pass: BoardingPassRecord }) {
  const from = splitAirport(pass.from);
  const to = splitAirport(pass.to);

  return (
    <article className="card relative overflow-hidden transition-shadow duration-300 hover:shadow-[0_0_36px_rgba(230,255,25,0.1)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-brand/25 bg-navy px-5 py-4 text-white shadow-[inset_0_-1px_0_rgba(230,255,25,0.25)]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand shadow-[inset_0_0_12px_rgba(230,255,25,0.15)]">
            <Plane className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{pass.airlineName}</p>
            <p className="text-xs text-white/70">{pass.flightNumber}</p>
          </div>
        </div>
        <Badge className="border-brand/40 bg-brand/15 text-brand">{pass.group}</Badge>
      </header>

      <div className="px-5 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{from.code}</p>
            {from.city && <p className="mt-1 truncate text-xs text-muted">{from.city}</p>}
          </div>
          <span className="relative flex min-w-0 flex-1 items-center gap-2" aria-hidden>
            <span className="h-px flex-1 bg-[repeating-linear-gradient(90deg,rgba(230,255,25,0.7)_0_6px,transparent_6px_12px)]" />
            <Plane className="bp-route__plane h-4 w-4 shrink-0 -rotate-45 text-brand drop-shadow-[0_0_8px_rgba(230,255,25,0.8)]" />
            <span className="h-px flex-1 bg-[repeating-linear-gradient(90deg,rgba(230,255,25,0.7)_0_6px,transparent_6px_12px)]" />
          </span>
          <div className="min-w-0 text-right">
            <p className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{to.code}</p>
            {to.city && <p className="mt-1 truncate text-xs text-muted">{to.city}</p>}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
          <Detail label="Passenger" value={pass.passengerName} />
          <Detail label="Seat" value={pass.seat} />
          <Detail label="Boarding group" value={pass.group} />
          <Detail label="Gate" value={pass.gate ?? '—'} />
          <Detail label="Terminal" value={pass.terminal ?? '—'} />
          <Detail label="Boarding time" value={formatTime(pass.boardingAt)} />
          <Detail label="Date" value={formatDate(pass.departureAt)} />
          <Detail label="Departs" value={formatTime(pass.departureAt)} />
          <Detail label="Booking ref" value={pass.bookingReference} />
        </div>

        <div className="relative mt-5 border-t border-dashed border-line pt-5">
          {/* Ticket perforation notches */}
          <span className="absolute -left-[26px] -top-3 h-6 w-6 rounded-full bg-canvas" aria-hidden />
          <span className="absolute -right-[26px] -top-3 h-6 w-6 rounded-full bg-canvas" aria-hidden />
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-xl bg-white p-1.5 shadow-[0_0_20px_rgba(230,255,25,0.25)]">
                <QRCodeSVG
                  value={pass.qrPayload}
                  size={132}
                  marginSize={1}
                  bgColor="#FFFFFF"
                  fgColor="#07131C"
                  title={`QR code for ${pass.passengerName} on ${pass.flightNumber}`}
                />
              </div>
              <p className="text-[11px] text-muted">Scan at security and boarding</p>
            </div>
            <div className="flex w-full max-w-xs flex-col items-center gap-3 sm:items-end">
              <Barcode seed={pass.bookingReference} />
              <p className="text-[11px] text-muted">{pass.bookingReference}</p>
              <p className="text-xs leading-relaxed text-muted sm:text-right">
                <span className="font-semibold uppercase tracking-wide text-muted">Not a valid travel document</span>
                {' — '}carry a government-issued photo ID matching the passenger name above. Gate and
                terminal appear only when the airline has assigned them.
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function BoardingPass() {
  const { reference } = useParams<{ reference: string }>();
  const { data, isLoading, isError, refetch } = useBoardingPasses(reference);
  const passes = data?.passes ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card">
        <ErrorState
          title="Boarding passes unavailable"
          description="We could not load boarding passes for this trip."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Boarding pass"
        subtitle={reference ? `Booking ${reference}` : undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to={reference ? `/my-trips/${reference}` : '/my-trips'} className="btn-secondary">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back to trip
            </Link>
            <Button
              variant="secondary"
              icon={<Printer className="h-4 w-4" />}
              onClick={() => window.print()}
              disabled={passes.length === 0}
            >
              Print
            </Button>
          </div>
        }
      />

      {passes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Ticket className="h-6 w-6" />}
            title="Not issued yet"
            description="Your boarding pass is not available because check-in has not opened for this flight. Check back once the airline opens check-in, usually 24–48 hours before departure."
            action={
              <Link to={reference ? `/my-trips/${reference}` : '/my-trips'} className="btn-primary">
                Back to trip
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-5">
          {passes.map((pass) => (
            <PassCard key={pass.id} pass={pass} />
          ))}
        </div>
      )}
    </div>
  );
}

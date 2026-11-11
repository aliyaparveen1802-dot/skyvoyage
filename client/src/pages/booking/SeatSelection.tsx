import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useReducedMotion } from 'framer-motion';
import { AlertCircle, ArrowRight, Check, Plane, User, WandSparkles, X } from 'lucide-react';
import { AircraftViewer } from '@/components/seats/AircraftViewer';
import { SeatLegend, SeatMap } from '@/components/seats/SeatMap';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/common/States';
import { Button } from '@/components/common/Button';
import { useBooking } from '@/context/BookingContext';
import { flightsApi } from '@/services/api/flights';
import { errorMessage } from '@/services/api/client';
import type { PassengerType, Seat, SeatMap as SeatMapType, SeatZone, SelectedSeat } from '@/types';
import { formatMoney, pluralize } from '@/utils/format';
import { cn } from '@/utils/cn';

const TYPE_LABEL: Record<PassengerType, string> = {
  adult: 'Adult',
  child: 'Child',
  infant: 'Infant',
};

const ZONE_LABEL: Record<SeatZone, string> = {
  first: 'First Class',
  business: 'Business Class',
  premium: 'Premium Economy',
  economy: 'Economy',
};

const TAB_ORDER: SeatZone[] = ['business', 'premium', 'economy'];
const KIND_RANK: Record<Seat['kind'], number> = { window: 0, aisle: 1, middle: 2 };

interface PopupState {
  seat: Seat;
  left: number;
  top: number;
  below: boolean;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export default function SeatSelection() {
  const { search, searchId, offer, seats, setSeats, passengers } = useBooking();
  const navigate = useNavigate();
  const reduced = useReducedMotion() ?? false;

  const [activeSegment, setActiveSegment] = useState(0);
  const [activePassenger, setActivePassenger] = useState(0);
  const [activeZone, setActiveZone] = useState<SeatZone | null>(null);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [popupDesktop, setPopupDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 640px)').matches : true,
  );
  const mapCardRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const segments = useMemo(() => offer?.legs.flatMap((l) => l.segments) ?? [], [offer]);
  const paxTotal = search.passengers.adult + search.passengers.child + search.passengers.infant;

  const seatMapsQuery = useQuery({
    queryKey: ['seat-maps', searchId, offer?.id, paxTotal],
    queryFn: () =>
      Promise.all(
        segments.map((s) => flightsApi.seatMap(searchId!, offer!.id, s.id, paxTotal)),
      ),
    enabled: !!searchId && !!offer && segments.length > 0,
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const onChange = () => setPopupDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!popup) return;
    const close = () => setPopup(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (popupRef.current?.contains(t)) return;
      if (t.closest('[data-seat]')) return;
      close();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [popup]);

  if (!searchId || !offer) {
    return <Navigate to="/search" replace />;
  }

  const passengerCount = Math.max(1, paxTotal);
  const passengerList: Array<{ type: PassengerType; name?: string }> = Array.from(
    { length: passengerCount },
    (_, i) => {
      const p = passengers[i];
      return p
        ? { type: p.type, name: `${p.firstName} ${p.lastName}`.trim() || undefined }
        : { type: (['adult', 'child', 'infant'] as PassengerType[])[i] ?? 'adult' };
    },
  );

  const segment = segments[Math.min(activeSegment, segments.length - 1)];
  const currentMap: SeatMapType | undefined =
    seatMapsQuery.data?.[Math.min(activeSegment, segments.length - 1)];
  const mapsReady = (seatMapsQuery.data?.length ?? 0) === segments.length;

  function seatFor(passengerIndex: number, segmentId: string): SelectedSeat | undefined {
    return seats.find((s) => s.passengerIndex === passengerIndex && s.segmentId === segmentId);
  }

  const remainingIdx = passengerList
    .map((_, i) => i)
    .filter((i) => segments.some((seg) => !seatFor(i, seg.id)));
  const seatedCount = passengerCount - remainingIdx.length;
  const allSeated = remainingIdx.length === 0;
  const seatCharges = seats.reduce((sum, s) => sum + s.price, 0);

  function zoneTotal(zone: SeatZone): number {
    if (!currentMap) return 0;
    return currentMap.seats.filter((s) => s.zone === zone).length;
  }

  function zoneFree(zone: SeatZone): number {
    if (!currentMap || !segment) return 0;
    const taken = new Set(seats.filter((s) => s.segmentId === segment.id).map((s) => s.seatId));
    return currentMap.seats.filter(
      (s) => s.zone === zone && s.state === 'available' && !taken.has(s.id),
    ).length;
  }

  const tabZones: SeatZone[] = currentMap?.seats.some((s) => s.zone === 'first')
    ? ['first', ...TAB_ORDER]
    : TAB_ORDER;
  const defaultZone = tabZones.find((z) => zoneTotal(z) > 0) ?? 'economy';
  const zone: SeatZone =
    activeZone && zoneTotal(activeZone) > 0 ? activeZone : defaultZone;
  const maxRows = currentMap
    ? Math.max(1, ...currentMap.seats.map((s) => s.row))
    : 18;

  const ownerOf = (seat: Seat): SelectedSeat | undefined =>
    segment ? seats.find((s) => s.segmentId === segment.id && s.seatId === seat.id) : undefined;

  function openPopup(seat: Seat, anchor: HTMLElement) {
    const card = mapCardRef.current;
    if (!card) {
      setPopup({ seat, left: 0, top: 0, below: false });
      return;
    }
    const cr = card.getBoundingClientRect();
    const ar = anchor.getBoundingClientRect();
    const cx = ar.left - cr.left + ar.width / 2;
    const top = ar.top - cr.top;
    const half = Math.min(145, cr.width / 2);
    setPopup({ seat, left: clamp(cx, half, Math.max(half, cr.width - half)), top, below: top < 210 });
  }

  function handleSeatClick(seat: Seat, anchor: HTMLElement) {
    if (popup?.seat.id === seat.id) {
      setPopup(null);
      return;
    }
    openPopup(seat, anchor);
  }

  function assignFromPopup() {
    if (!popup || !segment) return;
    const seat = popup.seat;
    const owner = ownerOf(seat);
    if (owner && owner.passengerIndex !== activePassenger) return;
    const withoutCurrent = seats.filter(
      (s) => !(s.segmentId === segment.id && s.passengerIndex === activePassenger),
    );
    const next: SelectedSeat = {
      segmentId: segment.id,
      passengerIndex: activePassenger,
      seatId: seat.id,
      label: seat.label,
      price: seat.price,
      zone: seat.zone,
    };
    setSeats([...withoutCurrent, next]);
  }

  function deselectFromPopup() {
    if (!popup || !segment) return;
    setSeats(
      seats.filter(
        (s) =>
          !(
            s.segmentId === segment.id &&
            s.seatId === popup.seat.id &&
            s.passengerIndex === activePassenger
          ),
      ),
    );
  }

  function autoAssign() {
    const maps = seatMapsQuery.data;
    if (!maps) return;
    const next: SelectedSeat[] = [...seats];
    for (let pi = 0; pi < passengerCount; pi++) {
      for (let si = 0; si < segments.length; si++) {
        const seg = segments[si];
        if (next.some((s) => s.passengerIndex === pi && s.segmentId === seg.id)) continue;
        const map = maps[si];
        if (!map) continue;
        const taken = new Set(next.filter((s) => s.segmentId === seg.id).map((s) => s.seatId));
        const pick = map.seats
          .filter((s) => s.state === 'available' && !taken.has(s.id))
          .sort((a, b) => a.row - b.row || KIND_RANK[a.kind] - KIND_RANK[b.kind])[0];
        if (pick) {
          next.push({
            segmentId: seg.id,
            passengerIndex: pi,
            seatId: pick.id,
            label: pick.label,
            price: pick.price,
            zone: pick.zone,
          });
        }
      }
    }
    setSeats(next);
    setPopup(null);
  }

  function pickZone(next: SeatZone) {
    setActiveZone(next);
    setPopup(null);
    mapCardRef.current?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  function goContinue() {
    if (!allSeated) return;
    setPopup(null);
    navigate('/passenger-details');
  }

  function skipSeats() {
    setPopup(null);
    navigate('/passenger-details');
  }

  function resetSelection() {
    setSeats([]);
    setPopup(null);
  }

  const popupOwner = popup ? ownerOf(popup.seat) : undefined;
  const popupOwnerName =
    popupOwner !== undefined
      ? passengerList[popupOwner.passengerIndex]?.name ??
        `${TYPE_LABEL[passengerList[popupOwner.passengerIndex]?.type ?? 'adult']} ${
          popupOwner.passengerIndex + 1
        }`
      : undefined;
  const popupIsMine = popupOwner?.passengerIndex === activePassenger;
  const activePassengerName =
    passengerList[activePassenger]?.name ??
    `${TYPE_LABEL[passengerList[activePassenger]?.type ?? 'adult']} ${activePassenger + 1}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-40 sm:px-6 lg:px-8 lg:pb-10">
      {/* Step header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            Step 2 of 4 · Seat selection
          </p>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            Choose where everyone sits
          </h1>
          <p className="mt-1 text-sm text-muted">
            {offer.fareBrand} · {pluralize(passengerCount, 'passenger')} · prices shown per seat
            are added to your fare.
          </p>
        </div>
        <button onClick={() => navigate('/flight/' + offer.id)} className="btn-ghost h-9 px-3 text-[13px]">
          ← Flight details
        </button>
      </div>

      {/* Honesty notice */}
      <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-line bg-canvas p-3.5 text-xs leading-relaxed text-muted">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
        Seat availability comes from the demo provider and is re-verified by the server when you
        quote and pay — occupied seats cannot be selected.
      </div>

      {/* 3D aircraft viewer */}
      <div className="card mb-5 overflow-hidden border-white/10 bg-[#0a141c]/70 backdrop-blur-xl">
        <AircraftViewer
          windowRows={maxRows}
          highlightZone={mapsReady ? zone : null}
          reduced={reduced}
          className="h-[300px] sm:h-[380px] lg:h-[430px]"
        />
      </div>

      {/* Cabin section tabs */}
      {mapsReady && currentMap && (
        <div className="card mb-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-white/10 bg-[#0a141c]/70 p-3 backdrop-blur-xl sm:p-4">
          <span className="pl-1 text-[11px] font-bold uppercase tracking-wider text-muted">
            Sections
          </span>
          <div className="flex flex-1 gap-2 overflow-x-auto" role="tablist" aria-label="Cabin sections">
            {tabZones.map((z) => {
              const total = zoneTotal(z);
              const free = zoneFree(z);
              const isActive = zone === z;
              const off = total === 0;
              return (
                <button
                  key={z}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  disabled={off}
                  onClick={() => pickZone(z)}
                  title={off ? 'Not offered on this flight' : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-bold transition',
                    isActive
                      ? 'border-brand bg-brand text-navy shadow-[0_0_18px_rgba(230,255,25,0.3)]'
                      : off
                        ? 'cursor-not-allowed border-line bg-surface text-muted/45'
                        : 'border-line bg-surface text-muted hover:border-brand/50 hover:text-ink',
                  )}
                >
                  {ZONE_LABEL[z]}
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-extrabold',
                      isActive
                        ? 'bg-navy/15 text-navy'
                        : off
                          ? 'bg-canvas text-muted/60'
                          : 'bg-brand-soft text-brand-dark',
                    )}
                  >
                    {off ? 'Not on this flight' : `${free} free`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          {/* Segment tabs */}
          {segments.length > 1 && (
            <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Flight segments">
              {segments.map((s, i) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={i === activeSegment}
                  onClick={() => {
                    setActiveSegment(i);
                    setPopup(null);
                  }}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition',
                    i === activeSegment
                      ? 'border-brand bg-brand-soft text-brand-dark'
                      : 'border-line bg-surface text-muted hover:text-ink',
                  )}
                >
                  <Plane className="h-3.5 w-3.5" aria-hidden />
                  {s.from.iata} → {s.to.iata}
                </button>
              ))}
            </div>
          )}

          {/* Passenger chips */}
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink">Selecting seats for</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {passengerList.map((p, i) => {
                const chosen = segments.map((seg) => seatFor(i, seg.id)).filter(Boolean);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setActivePassenger(i);
                      setPopup(null);
                    }}
                    aria-pressed={i === activePassenger}
                    className={cn(
                      'flex shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2 text-left transition',
                      i === activePassenger
                        ? 'border-brand bg-brand-soft shadow-[0_0_16px_rgba(230,255,25,0.18)]'
                        : 'border-line bg-surface hover:border-brand/40',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold',
                        i === activePassenger ? 'bg-brand text-navy' : 'bg-surface text-muted',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block max-w-36 truncate text-[13px] font-semibold text-ink">
                        {p.name ?? `${TYPE_LABEL[p.type]} ${i + 1}`}
                      </span>
                      <span className="block text-[11px] text-muted">
                        {TYPE_LABEL[p.type]} ·{' '}
                        {chosen.length > 0
                          ? chosen.map((c) => c!.label).join(', ')
                          : 'No seat yet'}
                      </span>
                    </span>
                    {chosen.length > 0 && (
                      <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seat map card */}
          <div
            ref={mapCardRef}
            className="card relative scroll-mt-24 border-white/10 bg-[#0a141c]/80 p-4 backdrop-blur-xl sm:p-5"
          >
            {seatMapsQuery.isPending && (
              <div className="space-y-3" aria-label="Loading seat map">
                <Skeleton className="h-5 w-44" />
                <div className="flex justify-center gap-2">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-10 rounded-lg" />
                  ))}
                </div>
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            )}

            {seatMapsQuery.isError && (
              <ErrorState
                title="Seat map unavailable"
                description={errorMessage(seatMapsQuery.error)}
                onRetry={() => seatMapsQuery.refetch()}
              />
            )}

            {mapsReady && currentMap && segment && (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-bold text-ink">
                    <Plane className="h-4 w-4 text-brand" aria-hidden />
                    {currentMap.aircraft} · {segment.flightNumber}
                    <span className="rounded-full border border-brand/40 bg-brand-soft px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-brand-dark">
                      {ZONE_LABEL[zone]}
                    </span>
                  </p>
                  <SeatLegend />
                </div>
                <SeatMap
                  map={currentMap}
                  zone={zone}
                  selected={seats}
                  activePassenger={activePassenger}
                  onSeatClick={handleSeatClick}
                />

                {/* Seat info popup */}
                {popup && (
                  <div
                    ref={popupRef}
                    role="dialog"
                    aria-label={`Seat ${popup.seat.label} details`}
                    className={cn(
                      'z-40 w-[268px] rounded-2xl border border-white/10 bg-[#0a141c]/95 p-4 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.85)] backdrop-blur-xl',
                      popupDesktop
                        ? popup.below
                          ? 'absolute -translate-x-1/2 translate-y-3'
                          : 'absolute -translate-x-1/2 -translate-y-[calc(100%+12px)]'
                        : 'fixed inset-x-3 bottom-24',
                    )}
                    style={popupDesktop ? { left: popup.left, top: popup.top } : undefined}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-lg font-extrabold leading-none text-ink">
                          {popup.seat.label}
                        </p>
                        <p className="mt-1.5 text-[11px] text-muted">
                          Row {popup.seat.row} · {ZONE_LABEL[popup.seat.zone]}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                          {popup.seat.kind}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPopup(null)}
                          aria-label="Close seat info"
                          className="rounded p-1 text-muted transition hover:text-ink"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 rounded-xl border border-line bg-canvas/80 p-2.5 text-[12px]">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted">Seat</span>
                        <span className="font-semibold text-ink">{popup.seat.label}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted">Row</span>
                        <span className="font-semibold text-ink">{popup.seat.row}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted">Position</span>
                        <span className="font-semibold capitalize text-ink">
                          {popup.seat.kind}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted">Legroom</span>
                        <span
                          className={cn(
                            'font-semibold',
                            popup.seat.legroom === 'extra' ? 'text-[#c4b5fd]' : 'text-ink',
                          )}
                        >
                          {popup.seat.legroom === 'extra' ? 'Extra legroom' : 'Standard'}
                        </span>
                      </div>
                      {popup.seat.nearExit && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted">Row type</span>
                          <span className="font-semibold text-[#f97316]">Emergency exit</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-2">
                        <span className="text-muted">Category</span>
                        <span className="font-semibold text-ink">
                          {ZONE_LABEL[popup.seat.zone]}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted">Seat charge</span>
                        <span className="font-semibold text-brand-dark">
                          {popup.seat.price > 0
                            ? `+${formatMoney(popup.seat.price, currentMap.currency)}`
                            : 'Included'}
                        </span>
                      </div>
                    </div>

                    <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
                      {popup.seat.state === 'occupied'
                        ? 'This seat is already booked.'
                        : popup.seat.state === 'unavailable'
                          ? 'This seat cannot be booked.'
                          : popupOwner && !popupIsMine
                            ? `Assigned to ${popupOwnerName}.`
                            : popupIsMine
                              ? `Currently assigned to ${activePassengerName}.`
                              : `Assigning to ${activePassengerName}.`}
                    </p>

                    {popupIsMine ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        className="mt-3"
                        onClick={deselectFromPopup}
                      >
                        Deselect seat
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        fullWidth
                        className="mt-3"
                        disabled={
                          popup.seat.state !== 'available' ||
                          (popupOwner !== undefined && !popupIsMine)
                        }
                        onClick={assignFromPopup}
                      >
                        Select seat
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Booking summary */}
        <aside className="min-w-0">
          <div className="card sticky top-20 space-y-4 border-white/10 bg-[#0a141c]/85 p-5 backdrop-blur-xl">
            <div>
              <h2 className="text-sm font-bold text-ink">Booking summary</h2>
              <p className="mt-0.5 text-xs text-muted">One seat per passenger, per flight.</p>
            </div>

            <ul className="space-y-2.5">
              {passengerList.map((p, i) => (
                <li key={i} className="rounded-xl border border-line bg-canvas/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-ink">
                      <User className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                      <span className="truncate">{p.name ?? `${TYPE_LABEL[p.type]} ${i + 1}`}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-muted">{TYPE_LABEL[p.type]}</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {segments.map((s) => {
                      const seat = seatFor(i, s.id);
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-2 text-[11px]"
                        >
                          <span className="text-muted">
                            {s.from.iata}→{s.to.iata}
                          </span>
                          {seat ? (
                            <span className="truncate font-semibold text-brand-dark">
                              {seat.label} · {ZONE_LABEL[seat.zone]} ·{' '}
                              {seat.price > 0 ? formatMoney(seat.price) : 'Included'}
                            </span>
                          ) : (
                            <span className="text-muted/60">Not assigned</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Seat charges</span>
                <span className="font-bold text-ink">{formatMoney(seatCharges)}</span>
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                {allSeated
                  ? 'Every passenger has a seat on every flight.'
                  : `${seatedCount} of ${passengerCount} passengers seated.`}
              </p>
              {!allSeated && remainingIdx.length > 0 && (
                <p className="mt-1 text-[11px] text-muted">
                  Remaining:{' '}
                  <span className="text-ink">
                    {remainingIdx
                      .map(
                        (i) =>
                          passengerList[i].name ??
                          `${TYPE_LABEL[passengerList[i].type]} ${i + 1}`,
                      )
                      .slice(0, 3)
                      .join(', ')}
                    {remainingIdx.length > 3 ? '…' : ''}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Button
                variant="secondary"
                fullWidth
                size="sm"
                icon={<WandSparkles className="h-4 w-4" />}
                disabled={!mapsReady || allSeated}
                onClick={autoAssign}
              >
                Auto-assign seats
              </Button>

              {seats.length > 0 && (
                <button
                  onClick={resetSelection}
                  className="inline-flex w-full items-center justify-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-error"
                >
                  <X className="h-3.5 w-3.5" /> Reset selection
                </button>
              )}
            </div>

            <div className="hidden gap-2 lg:flex">
              <button
                onClick={() => navigate(`/flight/${offer.id}`)}
                className="btn-secondary flex-1"
              >
                Back
              </button>
              <Button onClick={goContinue} disabled={!allSeated} className="flex-1">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <button
              onClick={skipSeats}
              className="hidden w-full text-center text-[13px] font-medium text-muted transition hover:text-ink lg:block"
            >
              Skip seat selection
            </button>
            <p className="text-center text-[11px] text-muted lg:hidden">
              {allSeated
                ? `${pluralize(seats.length, 'seat')} selected.`
                : 'Assign every seat to continue, or skip.'}
            </p>
          </div>
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">{formatMoney(seatCharges)} in seats</p>
            <p className="truncate text-[11px] text-muted">
              {allSeated
                ? `${pluralize(seats.length, 'seat')} selected`
                : `${remainingIdx.length} ${remainingIdx.length === 1 ? 'passenger' : 'passengers'} still need seats`}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={skipSeats}>
            Skip
          </Button>
          <Button onClick={goContinue} disabled={!allSeated} className="shrink-0">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

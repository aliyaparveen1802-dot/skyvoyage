import type { Seat, SeatMap as SeatMapType, SeatSection, SeatZone, SelectedSeat } from '@/types';
import { cn } from '@/utils/cn';
import { formatMoney } from '@/utils/format';

interface Props {
  map: SeatMapType;
  zone: SeatZone;
  selected: SelectedSeat[];
  activePassenger: number;
  onSeatClick: (seat: Seat, anchor: HTMLElement) => void;
}

interface LayoutGroup {
  letters: string[];
}

function parseLayout(layout: string): LayoutGroup[] {
  return layout.split('-').map((part) => ({ letters: 'ABCDEFHIJKL'.slice(0, Number(part)).split('') }));
}

const LEGEND_ITEMS: Array<{ label: string; swatch: string; dot?: string }> = [
  { label: 'Available', swatch: 'bg-[#151e0b] border-[#5a6b1e]' },
  { label: 'Selected', swatch: 'bg-brand border-brand shadow-[0_0_10px_rgba(230,255,25,0.5)]' },
  { label: 'Occupied', swatch: 'bg-[#232b31] border-[#2f3941]' },
  { label: 'Extra Legroom', swatch: 'bg-[#8b5cf6]/25 border-[#8b5cf6]', dot: 'bg-[#8b5cf6]' },
  { label: 'Emergency Exit', swatch: 'bg-[#f97316]/20 border-[#f97316]', dot: 'bg-[#f97316]' },
  { label: 'Unavailable', swatch: 'bg-[#151c22] border-dashed border-[#3a444c]' },
];

export function SeatLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[11px] text-muted" aria-label="Seat legend">
      {LEGEND_ITEMS.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-1.5">
          <span className={cn('relative h-3.5 w-3.5 rounded-[4px] border', it.swatch)} aria-hidden>
            {it.dot && (
              <span className={cn('absolute -left-0.5 -top-0.5 h-1.5 w-1.5 rounded-full', it.dot)} />
            )}
          </span>
          {it.label}
        </li>
      ))}
    </ul>
  );
}

type KindMark = 'window-left' | 'window-right' | 'aisle-left' | 'aisle-right' | null;

interface RowSection {
  section: SeatSection;
  seats: Seat[];
}

/** Split a zone's seats into the zone's sections by sequential row counts. */
function splitSections(map: SeatMapType, zone: SeatZone): RowSection[] {
  const zoneSeats = map.seats.filter((s) => s.zone === zone);
  const sections = map.sections.filter((s) => s.zone === zone);
  const sortedRows = [...new Set(zoneSeats.map((s) => s.row))].sort((a, b) => a - b);
  let cursor = 0;
  return sections.map((section) => {
    const rowSet = new Set(sortedRows.slice(cursor, cursor + section.rows));
    cursor += section.rows;
    return { section, seats: zoneSeats.filter((s) => rowSet.has(s.row)) };
  });
}

export function SeatMap({ map, zone, selected, activePassenger, onSeatClick }: Props) {
  const owners = new Map<string, number>();
  for (const s of selected) {
    if (s.segmentId === map.segmentId) owners.set(s.seatId, s.passengerIndex);
  }

  const sections = splitSections(map, zone);

  return (
    <div className="space-y-6">
      {sections.map(({ section, seats }) => (
        <Section
          key={section.title}
          section={section}
          seats={seats}
          owners={owners}
          activePassenger={activePassenger}
          currency={map.currency}
          onSeatClick={onSeatClick}
        />
      ))}
      <p className="sr-only">
        Seat selection for passenger {activePassenger + 1}. Use Tab and Enter to open a seat.
      </p>
    </div>
  );
}

function Section({
  section,
  seats,
  owners,
  activePassenger,
  currency,
  onSeatClick,
}: {
  section: SeatSection;
  seats: Seat[];
  owners: Map<string, number>;
  activePassenger: number;
  currency: string;
  onSeatClick: (seat: Seat, anchor: HTMLElement) => void;
}) {
  const groups = parseLayout(section.layout);
  const byRow = new Map<number, Seat[]>();
  for (const s of seats) {
    const row = byRow.get(s.row) ?? [];
    row.push(s);
    byRow.set(s.row, row);
  }
  const rows = [...byRow.entries()].sort((a, b) => a[0] - b[0]);
  const maxPrice = seats.reduce((max, s) => Math.max(max, s.price), 0);

  function markFor(groupIndex: number, letterIndex: number): KindMark {
    const isLeftEdge = groupIndex === 0 && letterIndex === 0;
    const isRightEdge =
      groupIndex === groups.length - 1 && letterIndex === groups[groupIndex].letters.length - 1;
    const aisleRight = groupIndex < groups.length - 1 && letterIndex === groups[groupIndex].letters.length - 1;
    const aisleLeft = groupIndex > 0 && letterIndex === 0;
    if (isLeftEdge) return 'window-left';
    if (isRightEdge) return 'window-right';
    if (aisleRight) return 'aisle-right';
    if (aisleLeft) return 'aisle-left';
    return null;
  }

  return (
    <section aria-label={`${section.title} cabin`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-bold text-ink">{section.title}</h3>
        <span className="text-[11px] text-muted">
          {section.layout} · {section.seatsPerRow} per row
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-canvas/70 p-3">
        <div className="mx-auto w-fit space-y-1.5">
          {/* column letters — top */}
          <div className="flex items-center gap-1" aria-hidden>
            <span className="w-7" />
            {groups.map((g, gi) => (
              <div key={gi} className={cn('flex gap-1.5', gi > 0 && 'ml-4')}>
                {g.letters.map((l) => (
                  <span
                    key={l}
                    className="flex h-5 w-10 items-center justify-center text-[10px] font-bold text-muted"
                  >
                    {l}
                  </span>
                ))}
              </div>
            ))}
            <span className="w-11" />
          </div>

          {rows.map(([rowNum, rowSeats]) => {
            const isExit = rowSeats.some((s) => s.nearExit);
            return (
              <div key={rowNum} className={cn('flex items-center gap-1', isExit && 'pt-1')}>
                <span
                  className="w-7 pr-1.5 text-right text-[11px] font-semibold text-muted"
                  aria-hidden
                >
                  {rowNum}
                </span>
                {groups.map((g, gi) => (
                  <div key={gi} className={cn('flex gap-1.5', gi > 0 && 'ml-4')}>
                    {g.letters.map((letter, li) => {
                      const label = `${rowNum}${letter}`;
                      const seat = rowSeats.find((s) => s.label === label);
                      if (!seat) {
                        return (
                          <span
                            key={letter}
                            className="h-10 w-10 rounded-lg sm:h-11 sm:w-11"
                            aria-hidden
                          />
                        );
                      }
                      return (
                        <SeatButton
                          key={seat.id}
                          seat={seat}
                          owner={owners.get(seat.id)}
                          activePassenger={activePassenger}
                          mark={markFor(gi, li)}
                          currency={currency}
                          onClick={onSeatClick}
                        />
                      );
                    })}
                  </div>
                ))}
                <span
                  className={cn(
                    'w-11 text-center text-[9px] font-black uppercase tracking-wide',
                    isExit ? 'text-[#f97316]' : 'text-transparent',
                  )}
                  aria-hidden
                >
                  {isExit ? 'Exit' : '·'}
                </span>
              </div>
            );
          })}

          {/* column letters — bottom */}
          <div className="flex items-center gap-1 pt-0.5" aria-hidden>
            <span className="w-7" />
            {groups.map((g, gi) => (
              <div key={gi} className={cn('flex gap-1.5', gi > 0 && 'ml-4')}>
                {g.letters.map((l) => (
                  <span
                    key={l}
                    className="flex h-5 w-10 items-center justify-center text-[10px] font-bold text-muted"
                  >
                    {l}
                  </span>
                ))}
              </div>
            ))}
            <span className="w-11" />
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-[11px] text-muted">
          White edge = window · faint edge = aisle · {section.title}
        </p>
        <p className="text-[11px] text-muted">
          {maxPrice > 0 ? `${formatMoney(maxPrice, currency)} highest charge` : 'All seats included'}
        </p>
      </div>
    </section>
  );
}

function SeatButton({
  seat,
  owner,
  activePassenger,
  mark,
  currency,
  onClick,
}: {
  seat: Seat;
  owner: number | undefined;
  activePassenger: number;
  mark: KindMark;
  currency: string;
  onClick: (seat: Seat, anchor: HTMLElement) => void;
}) {
  const isMine = owner !== undefined && owner === activePassenger;
  const takenByOther = owner !== undefined && owner !== activePassenger;
  const occupied = seat.state === 'occupied';
  const blocked = seat.state === 'unavailable';
  const notSelectable = takenByOther || occupied || blocked;

  const kindWord = seat.kind === 'window' ? 'window' : seat.kind === 'aisle' ? 'aisle' : 'middle';
  const description = [
    `Seat ${seat.label}`,
    `${kindWord} seat`,
    `row ${seat.row}`,
    seat.nearExit ? 'emergency exit row' : null,
    seat.legroom === 'extra' ? 'extra legroom' : null,
    seat.price > 0 ? `adds ${formatMoney(seat.price, currency)}` : 'no extra charge',
    isMine ? 'selected by you' : takenByOther ? 'assigned to another passenger' : null,
    occupied ? 'already booked' : null,
    blocked ? 'unavailable' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <button
      type="button"
      data-seat={seat.id}
      onClick={(e) => onClick(seat, e.currentTarget)}
      aria-disabled={notSelectable || undefined}
      aria-pressed={isMine}
      aria-label={description}
      title={description}
      className={cn(
        'relative flex h-10 w-10 items-center justify-center rounded-[10px] border text-[10px] font-bold transition duration-150 sm:h-11 sm:w-11',
        isMine &&
          'border-[#e6ff19] bg-brand text-navy shadow-[0_0_18px_rgba(230,255,25,0.5)] ring-2 ring-[#e6ff19]/30',
        !isMine && takenByOther && 'cursor-not-allowed border-[#2f3941] bg-[#232b31] text-muted/55',
        !isMine && !takenByOther && occupied && 'cursor-not-allowed border-[#2f3941] bg-[#232b31] text-[#5f6a73]',
        !isMine && !takenByOther && blocked && 'cursor-not-allowed border-dashed border-[#3a444c] bg-[#151c22] text-muted/50',
        !isMine &&
          !takenByOther &&
          !occupied &&
          !blocked &&
          'border-[#4a5a1c] bg-[#151e0b] text-[#c9e600] hover:border-brand hover:bg-brand-soft hover:text-brand hover:shadow-[0_0_12px_rgba(230,255,25,0.28)] focus-visible:border-brand',
      )}
    >
      {seat.label}

      {/* category markers */}
      {!isMine && seat.nearExit && (
        <span
          className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-[#f97316]"
          aria-hidden
        />
      )}
      {!isMine && !seat.nearExit && seat.legroom === 'extra' && (
        <span
          className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-[#8b5cf6]"
          aria-hidden
        />
      )}

      {/* window / aisle edge marks */}
      {(mark === 'window-left' || mark === 'aisle-left') && (
        <span
          className={cn(
            'absolute left-[3px] top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full',
            mark === 'window-left' ? 'bg-white/85' : 'bg-white/35',
          )}
          aria-hidden
        />
      )}
      {(mark === 'window-right' || mark === 'aisle-right') && (
        <span
          className={cn(
            'absolute right-[3px] top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full',
            mark === 'window-right' ? 'bg-white/85' : 'bg-white/35',
          )}
          aria-hidden
        />
      )}
    </button>
  );
}

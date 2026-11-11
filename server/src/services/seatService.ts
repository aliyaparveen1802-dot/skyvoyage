import type { CabinClass, FlightSegment, Seat, SeatKind, SeatMap, SeatSection } from '../types.js';
import { store } from '../database/store.js';
import { Rng } from '../utils/prng.js';
import { USD_TO_INR } from '../utils/currency.js';

interface SectionRange {
  title: string;
  from: number;
  to: number;
}

interface SeatLayout {
  rows: number;
  letters: string[];
  kinds: Record<string, SeatKind>;
  layout: string;
  exitRows: number[];
  sections: SectionRange[];
}

const LAYOUTS: Record<CabinClass, SeatLayout> = {
  economy: {
    rows: 28,
    letters: ['A', 'B', 'C', 'D', 'E', 'F'],
    kinds: { A: 'window', B: 'middle', C: 'aisle', D: 'aisle', E: 'middle', F: 'window' },
    layout: '3-3',
    exitRows: [12, 13],
    sections: [
      { title: 'Economy · Rows 1–12', from: 1, to: 12 },
      { title: 'Economy · Rows 13–28', from: 13, to: 28 },
    ],
  },
  premium: {
    rows: 4,
    letters: ['A', 'B', 'C', 'D', 'E', 'F'],
    kinds: { A: 'window', B: 'aisle', C: 'aisle', D: 'middle', E: 'aisle', F: 'window' },
    layout: '2-3-1',
    exitRows: [],
    sections: [{ title: 'Premium Economy · Rows 1–4', from: 1, to: 4 }],
  },
  business: {
    rows: 8,
    letters: ['A', 'B', 'C', 'D'],
    kinds: { A: 'window', B: 'aisle', C: 'aisle', D: 'window' },
    layout: '1-2-1',
    exitRows: [],
    sections: [{ title: 'Business · Rows 1–8', from: 1, to: 8 }],
  },
  first: {
    rows: 3,
    letters: ['A', 'B', 'C', 'D'],
    kinds: { A: 'window', B: 'aisle', C: 'aisle', D: 'window' },
    layout: '1-2-1',
    exitRows: [],
    sections: [{ title: 'First · Rows 1–3', from: 1, to: 3 }],
  },
};

const OCCUPANCY_RATE: Record<CabinClass, number> = {
  economy: 0.35,
  premium: 0.15,
  business: 0.15,
  first: 0.15,
};

function seatPrice(cabin: CabinClass, kind: SeatKind, nearExit: boolean, longHaul: boolean): number {
  let price = 0;
  if (cabin === 'premium') price = 12;
  else if (cabin === 'economy') price = kind === 'middle' ? 0 : 8;
  if (nearExit && cabin === 'economy') price += 18;
  if (longHaul) price *= 1.4;
  return Math.round(price * USD_TO_INR);
}

function holdIsActive(segmentId: string, seatId: string): boolean {
  const hold = store.holdForSeat(segmentId, seatId);
  return !!hold && hold.expiresAt > Date.now();
}

export function buildSeatMap(segment: FlightSegment): SeatMap {
  const cabin = segment.cabin;
  const layout = LAYOUTS[cabin];
  const rng = new Rng(`seats:${segment.id}`);
  const longHaul = segment.durationMin > 360;
  const seats: Seat[] = [];

  for (let row = 1; row <= layout.rows; row++) {
    for (const letter of layout.letters) {
      const id = `${row}${letter}`;
      const kind = layout.kinds[letter];
      const nearExit = layout.exitRows.includes(row);
      const roll = rng.float();
      let state: Seat['state'] = 'available';
      if (roll < 0.015) state = 'unavailable';
      else if (roll < 0.015 + OCCUPANCY_RATE[cabin]) state = 'occupied';
      if (state === 'available' && store.isSeatBooked(segment.id, id)) state = 'occupied';
      if (state === 'available' && holdIsActive(segment.id, id)) state = 'occupied';
      const legroom: Seat['legroom'] =
        cabin === 'first' || cabin === 'business' || nearExit ? 'extra' : 'standard';
      seats.push({
        id,
        label: id,
        row,
        kind,
        zone: cabin,
        state,
        price: seatPrice(cabin, kind, nearExit, longHaul),
        legroom,
        nearExit,
      });
    }
  }

  const sections: SeatSection[] = layout.sections.map((range) => ({
    zone: cabin,
    title: range.title,
    rows: range.to - range.from + 1,
    seatsPerRow: layout.letters.length,
    layout: layout.layout,
  }));

  return {
    flightId: segment.flightNumber,
    segmentId: segment.id,
    aircraft: segment.aircraft,
    currency: 'INR',
    sections,
    seats,
    source: 'mock',
  };
}

export function findSeat(segment: FlightSegment, seatId: string): Seat | undefined {
  return buildSeatMap(segment).seats.find((seat) => seat.id === seatId);
}

export function isSeatSelectable(segment: FlightSegment, seatId: string): boolean {
  const seat = findSeat(segment, seatId);
  if (!seat) return false;
  if (seat.state !== 'available') return false;
  if (store.isSeatBooked(segment.id, seatId)) return false;
  if (holdIsActive(segment.id, seatId)) return false;
  return true;
}

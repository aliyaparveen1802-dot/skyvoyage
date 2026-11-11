import type {
  GuideResponse,
  JourneyProgress,
  JourneyStage,
  JourneyStageId,
} from '../types.js';
import { AIRPORT_BY_IATA, GUIDE_INSTRUCTIONS, GENERIC_INSTRUCTIONS, STAGE_META } from '../database/seed.js';
import { bookingByReference, store, type StoredBooking, type UserRecord } from '../database/store.js';
import { notFound, unprocessable } from '../utils/errors.js';
import { nowIso } from '../utils/time.js';

const POSITIONING_LIMITATION = 'Indoor positioning is unavailable — follow terminal signage.';
const DEMO_VALUES_LIMITATION = 'Counter and gate values are demo values assigned by the mock provider.';

const LIMITATIONS = [
  'Live indoor positioning is not available in this build; directions rely on terminal signage.',
  'Counter and gate values are demo values assigned by the mock provider.',
];

interface BookingContext {
  booking: StoredBooking;
  terminal: string;
  gate: string;
  counter: string;
  boardingAt: string;
  flightNumber: string;
  international: boolean;
}

function resolveBooking(
  user: UserRecord | undefined,
  airportIata: string,
  bookingReference?: string,
): BookingContext | null {
  if (!user || !bookingReference) return null;
  const record = bookingByReference(bookingReference);
  if (!record || record.userId !== user.id || record.booking.status !== 'confirmed') return null;
  const firstSegment = record.booking.offer.legs[0].segments[0];
  if (firstSegment.from.iata !== airportIata) return null;
  const origin = AIRPORT_BY_IATA.get(firstSegment.from.iata);
  const destination = AIRPORT_BY_IATA.get(firstSegment.to.iata);
  const international = !(
    origin !== undefined && destination !== undefined && origin.country === destination.country
  );
  return {
    booking: record,
    terminal: record.terminal,
    gate: record.gate,
    counter: record.counter,
    boardingAt: firstSegment.departureAt,
    flightNumber: firstSegment.flightNumber,
    international,
  };
}

function stageLocation(
  stageId: JourneyStageId,
  airportTerminals: string[],
  context: BookingContext | null,
): { location: string | null; source: JourneyStage['source']; limitation?: string } {
  const terminal = context?.terminal ?? airportTerminals[0] ?? null;
  switch (stageId) {
    case 'arrival':
      return { location: 'Departures kerb', source: 'airport_data' };
    case 'terminal':
      return context
        ? { location: `Terminal ${context.terminal}`, source: 'booking', limitation: DEMO_VALUES_LIMITATION }
        : { location: null, source: 'airport_data' };
    case 'entrance':
      return { location: 'Departures entrance', source: 'signage', limitation: POSITIONING_LIMITATION };
    case 'checkin':
      return context
        ? { location: `Counter ${context.counter}`, source: 'booking', limitation: DEMO_VALUES_LIMITATION }
        : { location: null, source: 'airport_data' };
    case 'baggage':
      return context
        ? { location: `Baggage drop ${context.counter}`, source: 'booking', limitation: DEMO_VALUES_LIMITATION }
        : { location: null, source: 'airport_data' };
    case 'security':
      return {
        location: `Follow 'Departures' signs to Security Screening${terminal ? ` — Terminal ${terminal}` : ''}`,
        source: 'signage',
        limitation: POSITIONING_LIMITATION,
      };
    case 'immigration':
      return {
        location: `Follow signs to Immigration${terminal ? ` — Terminal ${terminal}` : ''}`,
        source: 'signage',
        limitation: POSITIONING_LIMITATION,
      };
    case 'gate':
      return context
        ? { location: `Gate ${context.gate}`, source: 'booking', limitation: DEMO_VALUES_LIMITATION }
        : { location: null, source: 'signage', limitation: POSITIONING_LIMITATION };
    case 'queue':
      return context
        ? { location: `Gate ${context.gate} seating area`, source: 'booking', limitation: DEMO_VALUES_LIMITATION }
        : { location: null, source: 'signage', limitation: POSITIONING_LIMITATION };
    case 'boarding':
      return context
        ? { location: `Gate ${context.gate}`, source: 'booking', limitation: DEMO_VALUES_LIMITATION }
        : { location: null, source: 'signage', limitation: POSITIONING_LIMITATION };
    default:
      return { location: null, source: 'airport_data' };
  }
}

function buildStages(airportIata: string, context: BookingContext | null): JourneyStage[] {
  const airport = AIRPORT_BY_IATA.get(airportIata);
  const instructions = GUIDE_INSTRUCTIONS[airportIata] ?? GENERIC_INSTRUCTIONS;
  return STAGE_META.map((meta) => {
    const placement = stageLocation(meta.id, airport?.terminals ?? [], context);
    const isOptional =
      meta.id === 'immigration' ? (context ? !context.international : true) : meta.isOptional;
    return {
      id: meta.id,
      order: meta.order,
      title: meta.title,
      task: meta.task,
      instructions: instructions[meta.id] ?? GENERIC_INSTRUCTIONS[meta.id],
      location: placement.location,
      estimatedMinutes: meta.estimatedMinutes,
      isOptional,
      source: placement.source,
      ...(placement.limitation ? { limitation: placement.limitation } : {}),
    };
  });
}

function progressKey(userId: string, bookingId: string, airport: string): string {
  return `${userId}|${bookingId}|${airport}`;
}

export function buildGuide(
  user: UserRecord | undefined,
  airportIata: string,
  bookingReference?: string,
): GuideResponse {
  const airport = AIRPORT_BY_IATA.get(airportIata);
  if (!airport) {
    throw notFound('airport_not_found', 'We don\'t have guide data for that airport yet.');
  }
  const context = resolveBooking(user, airportIata, bookingReference);
  const progress =
    user && context
      ? store.journeyProgress.get(progressKey(user.id, context.booking.booking.id, airportIata)) ?? null
      : null;

  return {
    airport: {
      iata: airport.iata,
      name: airport.name,
      city: airport.city,
      terminals: airport.terminals,
    },
    terminal: context?.terminal ?? null,
    bookingReference: context?.booking.booking.reference ?? null,
    flightNumber: context?.flightNumber ?? null,
    gate: context?.gate ?? null,
    counter: context?.counter ?? null,
    boardingAt: context?.boardingAt ?? null,
    stages: buildStages(airportIata, context),
    progress,
    limitations: LIMITATIONS,
    source: 'mock',
  };
}

export function updateProgress(
  user: UserRecord,
  input: { bookingReference: string; airport: string; stageId: JourneyStageId; done: boolean },
): { progress: JourneyProgress } {
  const airport = AIRPORT_BY_IATA.get(input.airport);
  if (!airport) {
    throw notFound('airport_not_found', 'We don\'t have guide data for that airport yet.');
  }
  const record = bookingByReference(input.bookingReference);
  if (!record || record.userId !== user.id) {
    throw notFound('booking_not_found', 'We could not find that booking.');
  }
  const validStage = STAGE_META.some((meta) => meta.id === input.stageId);
  if (!validStage) {
    throw unprocessable('unknown_stage', 'That journey stage does not exist.');
  }

  const key = progressKey(user.id, record.booking.id, input.airport);
  const existing = store.journeyProgress.get(key);
  const completed = new Set<JourneyStageId>(existing?.completed ?? []);
  if (input.done) completed.add(input.stageId);
  else completed.delete(input.stageId);
  if (completed.size > STAGE_META.length) {
    throw unprocessable('progress_overflow', 'Progress cannot exceed the number of stages.');
  }

  const progress: JourneyProgress = {
    bookingId: record.booking.id,
    airport: input.airport,
    terminal: record.terminal,
    completed: STAGE_META.filter((meta) => completed.has(meta.id)).map((meta) => meta.id),
    updatedAt: nowIso(),
  };
  store.journeyProgress.set(key, progress);
  return { progress };
}

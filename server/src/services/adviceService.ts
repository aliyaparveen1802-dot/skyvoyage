import type { WaitingAdvice } from '../types.js';
import { AIRPORT_BY_IATA, FACILITY_WALK_SOURCE_M } from '../database/seed.js';
import { generateAdvice } from '../integrations/aiProvider.js';
import { notFound } from '../utils/errors.js';
import { formatClock, minutesBetween, nowIso } from '../utils/time.js';
import { listFacilities } from './facilityService.js';

const RETURN_GATE_BUFFER_MIN = 20;
const DEFAULT_WALK_SOURCE_M = 600;

export interface WaitingAdviceInput {
  airport: string;
  terminal: string;
  boardingAt: string;
  gate?: string | null;
  bookingReference?: string;
}

export async function waitingAdvice(input: WaitingAdviceInput): Promise<WaitingAdvice> {
  const airport = AIRPORT_BY_IATA.get(input.airport);
  if (!airport) {
    throw notFound('airport_not_found', 'We don\'t have data for that airport yet.');
  }

  const availableMinutes = Math.max(0, minutesBetween(nowIso(), input.boardingAt));
  const walkSourceM = FACILITY_WALK_SOURCE_M[input.airport] ?? DEFAULT_WALK_SOURCE_M;
  const walkMinutes = Math.round(walkSourceM / 70);
  const bufferMinutes = RETURN_GATE_BUFFER_MIN + walkMinutes;
  const usableMinutes = Math.max(0, availableMinutes - bufferMinutes);
  const facilities = listFacilities(input.airport);
  const boardingLocal = formatClock(input.boardingAt, airport.timezone);
  const gate = input.gate ?? null;

  const generation = await generateAdvice({
    airport: input.airport,
    terminal: input.terminal,
    boardingAt: input.boardingAt,
    boardingLocal,
    gate,
    availableMinutes,
    bufferMinutes,
    usableMinutes,
    facilities,
  });

  return {
    source: generation.source,
    model: generation.model,
    airport: input.airport,
    terminal: input.terminal,
    availableMinutes,
    bufferMinutes,
    usableMinutes,
    boardingAt: input.boardingAt,
    gate,
    recommendations: generation.recommendations,
    safetyNote: generation.safetyNote,
  };
}

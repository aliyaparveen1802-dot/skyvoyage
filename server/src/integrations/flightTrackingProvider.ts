import type { FlightTracking, TrackingStatus, TrackingUpdate } from '../types.js';
import { AIRLINE_BY_CODE, AIRPORT_BY_IATA, BELT_POOL, DEMO_SCHEDULE, GATE_POOL } from '../database/seed.js';
import { store } from '../database/store.js';
import { greatCirclePath, interpolateAlongPath } from '../utils/geo.js';
import { Rng, hashSeed } from '../utils/prng.js';
import { isoWithOffset, todayUtc, wallClockToUtcMs } from '../utils/time.js';

export interface FlightTrackingProvider {
  trackByFlight(flightNumber: string, date?: string): FlightTracking | null;
}

interface ResolvedFlight {
  flightNumber: string;
  airlineCode: string;
  from: string;
  to: string;
  depLocal: string;
  durationMin: number;
  date: string;
}

function normalizeFlightNumber(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, ' ');
  const match = /^([A-Z0-9]{2})\s?(\d{1,4})$/.exec(cleaned);
  if (!match) return null;
  return `${match[1]} ${match[2]}`;
}

function resolveFlight(rawFlight: string, date?: string): ResolvedFlight | null {
  const normalized = normalizeFlightNumber(rawFlight);
  if (!normalized) return null;
  const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayUtc();

  const demo = DEMO_SCHEDULE.find((flight) => flight.flightNumber === normalized);
  if (demo) {
    return { ...demo, flightNumber: normalized, date: targetDate };
  }

  for (const search of store.searches.values()) {
    for (const offer of search.offers) {
      for (const leg of offer.legs) {
        for (const segment of leg.segments) {
          if (segment.flightNumber === normalized) {
            return {
              flightNumber: normalized,
              airlineCode: segment.airlineCode,
              from: segment.from.iata,
              to: segment.to.iata,
              depLocal: segment.departureAt.slice(11, 16),
              durationMin: segment.durationMin,
              date: segment.departureAt.slice(0, 10),
            };
          }
        }
      }
    }
  }

  const fallback = DEMO_SCHEDULE[hashSeed(`route:${normalized}`) % DEMO_SCHEDULE.length];
  return { ...fallback, flightNumber: normalized, date: targetDate };
}

function statusFor(
  now: number,
  departureAt: number,
  arrivalAt: number,
  delayMin: number,
): { status: TrackingStatus; progress: number } {
  const estimatedDeparture = departureAt + delayMin * 60_000;
  const estimatedArrival = arrivalAt + delayMin * 60_000;
  const duration = estimatedArrival - estimatedDeparture;
  if (now < estimatedDeparture) {
    if (delayMin > 0) return { status: 'delayed', progress: 0 };
    if (now >= estimatedDeparture - 60 * 60_000) return { status: 'boarding', progress: 0 };
    return { status: 'scheduled', progress: 0 };
  }
  if (now >= estimatedArrival) return { status: 'landed', progress: 100 };
  const progress = Math.round(((now - estimatedDeparture) / duration) * 100);
  if (progress < 5) return { status: 'departed', progress };
  if (progress >= 92) return { status: 'landing', progress };
  return { status: 'enroute', progress };
}

export class MockFlightTrackingProvider implements FlightTrackingProvider {
  trackByFlight(rawFlight: string, date?: string): FlightTracking | null {
    const resolved = resolveFlight(rawFlight, date);
    if (!resolved) return null;
    const origin = AIRPORT_BY_IATA.get(resolved.from);
    const destination = AIRPORT_BY_IATA.get(resolved.to);
    if (!origin || !destination) return null;

    const rng = new Rng(`tracking:${resolved.flightNumber}:${resolved.date}`);
    const departureAt = wallClockToUtcMs(`${resolved.date}T${resolved.depLocal}:00`, origin.timezone);
    const scheduledArrival = departureAt + resolved.durationMin * 60_000;
    const delayMin = rng.chance(0.3) ? rng.int(10, 45) : 0;
    const estimatedDeparture = departureAt + delayMin * 60_000;
    const estimatedArrival = scheduledArrival + delayMin * 60_000;
    const now = Date.now();
    const { status, progress } = statusFor(now, departureAt, scheduledArrival, delayMin);

    const gate = rng.chance(0.75) ? rng.pick(GATE_POOL) : null;
    const terminal = rng.pick(origin.terminals);
    const airline = AIRLINE_BY_CODE.get(resolved.airlineCode);
    const route = greatCirclePath(
      { lat: origin.lat, lng: origin.lng },
      { lat: destination.lat, lng: destination.lng },
      24,
    );
    const airborne = status === 'departed' || status === 'enroute' || status === 'landing';
    const aircraftPosition = airborne ? interpolateAlongPath(route, progress / 100) : null;

    const updates: TrackingUpdate[] = [
      { at: isoWithOffset(departureAt - 180 * 60_000, origin.timezone), status: 'scheduled', message: 'Flight scheduled' },
    ];
    if (gate) {
      updates.push({
        at: isoWithOffset(departureAt - 120 * 60_000, origin.timezone),
        status: 'scheduled',
        message: `Gate ${gate} assigned — Demo gate assignment`,
      });
    }
    updates.push({
      at: isoWithOffset(estimatedDeparture - 40 * 60_000, origin.timezone),
      status: 'boarding',
      message: 'Boarding started',
    });
    updates.push({
      at: isoWithOffset(estimatedDeparture, origin.timezone),
      status: 'departed',
      message: `Departed ${origin.city} (${origin.iata})`,
    });
    for (let hours = 2; hours * 3_600_000 < resolved.durationMin * 60_000; hours += 2) {
      updates.push({
        at: isoWithOffset(estimatedDeparture + hours * 3_600_000, origin.timezone),
        status: 'enroute',
        message: `Position update at +${hours}h (simulated)`,
      });
    }
    updates.push({
      at: isoWithOffset(estimatedArrival, destination.timezone),
      status: 'landed',
      message: `Landed ${destination.city} (${destination.iata})`,
    });

    const visibleUpdates = updates.filter((update, index) => index === 0 || Date.parse(update.at) <= now);

    const tracking: FlightTracking = {
      flightId: `trk_${hashSeed(`${resolved.flightNumber}:${resolved.date}`).toString(16)}`,
      flightNumber: resolved.flightNumber,
      airlineName: airline?.name ?? resolved.airlineCode,
      status,
      source: 'mock',
      live: false,
      scheduledDeparture: isoWithOffset(departureAt, origin.timezone),
      scheduledArrival: isoWithOffset(scheduledArrival, destination.timezone),
      gate,
      terminal,
      progress,
      aircraftPosition,
      origin: {
        iata: origin.iata,
        city: origin.city,
        name: origin.name,
        timezone: origin.timezone,
      },
      destination: {
        iata: destination.iata,
        city: destination.city,
        name: destination.name,
        timezone: destination.timezone,
      },
      route,
      updates: visibleUpdates,
    };

    if (delayMin > 0) {
      tracking.delayMin = delayMin;
      tracking.estimatedDeparture = isoWithOffset(estimatedDeparture, origin.timezone);
      tracking.estimatedArrival = isoWithOffset(estimatedArrival, destination.timezone);
    }
    if (status === 'landed') {
      tracking.baggageBelt = BELT_POOL[hashSeed(`belt:${resolved.flightNumber}`) % BELT_POOL.length];
    }
    return tracking;
  }
}

export function getFlightTrackingProvider(): FlightTrackingProvider {
  const configured = process.env.FLIGHT_TRACKING_PROVIDER;
  if (configured && configured !== 'mock') {
    throw new Error(`Unsupported flight tracking provider: ${configured}`);
  }
  return new MockFlightTrackingProvider();
}

import type {
  CabinClass,
  FlightLeg,
  FlightOffer,
  FlightSearchQuery,
  FlightSegment,
  PriceBreakdown,
} from '../types.js';
import { AIRCRAFT_MODELS, AIRLINE_BY_CODE, AIRLINES, AIRPORT_BY_IATA, HUB_IATAS } from '../database/seed.js';
import { haversineKm } from '../utils/geo.js';
import { Rng, hashSeed } from '../utils/prng.js';
import { USD_TO_INR } from '../utils/currency.js';
import { daysBetween, isWeekend, isoWithOffset, todayUtc, wallClockToUtcMs } from '../utils/time.js';

const CABIN_MULTIPLIER: Record<CabinClass, number> = {
  economy: 1,
  premium: 1.55,
  business: 3.1,
  first: 5.2,
};

const CHECKED_KG: Record<CabinClass, number> = {
  economy: 15,
  premium: 20,
  business: 20,
  first: 20,
};

export interface FlightSearchProvider {
  search(query: FlightSearchQuery): { offers: FlightOffer[]; generatedAt: string };
}

function airportRef(iata: string) {
  const airport = AIRPORT_BY_IATA.get(iata);
  if (!airport) throw new Error(`Unknown airport ${iata}`);
  return { iata: airport.iata, city: airport.city, name: airport.name, timezone: airport.timezone };
}

function distanceKm(fromIata: string, toIata: string): number {
  const from = AIRPORT_BY_IATA.get(fromIata);
  const to = AIRPORT_BY_IATA.get(toIata);
  if (!from || !to) return 1500;
  return haversineKm({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng });
}

function cruiseDurationMin(fromIata: string, toIata: string): number {
  return 40 + Math.round((distanceKm(fromIata, toIata) / 800) * 60);
}

function airlineFactor(code: string): number {
  return 0.9 + (hashSeed(`airline:${code}`) % 26) / 100;
}

function segmentId(flightNumber: string, from: string, to: string, date: string, index: number): string {
  return `seg_${hashSeed(`${flightNumber}|${from}|${to}|${date}|${index}`).toString(16)}`;
}

function buildSegment(
  rng: Rng,
  fromIata: string,
  toIata: string,
  date: string,
  airlineCode: string,
  depMinutes: number,
  cabin: CabinClass,
  index: number,
): FlightSegment {
  const airline = AIRLINE_BY_CODE.get(airlineCode) ?? AIRLINES[0];
  const from = airportRef(fromIata);
  const to = airportRef(toIata);
  const flightNumber = `${airline.code} ${rng.int(100, 999)}`;
  let durationMin = cruiseDurationMin(fromIata, toIata);
  const stopAirports: FlightSegment['stopAirports'] = [];
  let stops = 0;
  if (rng.chance(0.12)) {
    const hub = rng.pick(HUB_IATAS.filter((code) => code !== fromIata && code !== toIata));
    stops = 1;
    durationMin += 75;
    stopAirports.push(airportRef(hub));
  }
  const departureAt = wallClockToUtcMs(
    `${date}T${String(Math.floor(depMinutes / 60)).padStart(2, '0')}:${String(depMinutes % 60).padStart(2, '0')}:00`,
    from.timezone,
  );
  const arrivalAt = departureAt + durationMin * 60_000;
  const aircraft = rng.pick(AIRCRAFT_MODELS);
  return {
    id: segmentId(flightNumber, fromIata, toIata, date, index),
    airlineCode: airline.code,
    airlineName: airline.name,
    flightNumber,
    from,
    to,
    departureAt: isoWithOffset(departureAt, from.timezone),
    arrivalAt: isoWithOffset(arrivalAt, to.timezone),
    durationMin,
    stops,
    stopAirports,
    aircraft,
    baggage: { cabinKg: 7, checkedKg: CHECKED_KG[cabin] },
    cabin,
    source: 'mock',
  };
}

function buildLeg(
  rng: Rng,
  legQuery: { from: string; to: string; date: string },
  cabin: CabinClass,
  airlineCode: string,
  label: string,
  index: number,
): FlightLeg {
  const connection = rng.chance(0.42) ? rng.pick(HUB_IATAS.filter((h) => h !== legQuery.from && h !== legQuery.to)) : null;
  const depMinutes = rng.int(5, 22) * 60 + rng.pick([0, 15, 30, 45]);
  const segments: FlightSegment[] = [];
  if (!connection) {
    segments.push(buildSegment(rng, legQuery.from, legQuery.to, legQuery.date, airlineCode, depMinutes, cabin, index));
  } else {
    const first = buildSegment(rng, legQuery.from, connection, legQuery.date, airlineCode, depMinutes, cabin, index);
    segments.push(first);
    const layover = rng.int(70, 170);
    const arrivalWallMs = Date.parse(`${first.arrivalAt.slice(0, 19)}Z`);
    const secondWall = new Date(arrivalWallMs + layover * 60_000).toISOString();
    const secondDate = secondWall.slice(0, 10);
    const secondMinutes = Number(secondWall.slice(11, 13)) * 60 + Number(secondWall.slice(14, 16));
    segments.push(
      buildSegment(rng, connection, legQuery.to, secondDate, airlineCode, secondMinutes, cabin, index + 1000),
    );
  }
  const firstDep = Date.parse(segments[0].departureAt);
  const lastArr = Date.parse(segments[segments.length - 1].arrivalAt);
  const technicalStops = segments.reduce((sum, segment) => sum + segment.stops, 0);
  return {
    id: `leg_${hashSeed(`${legQuery.from}${legQuery.to}${legQuery.date}${index}`).toString(16)}`,
    label,
    segments,
    durationMin: Math.round((lastArr - firstDep) / 60_000),
    stops: technicalStops + segments.length - 1,
  };
}

function fareBrand(cabin: CabinClass, refundable: boolean): string {
  if (cabin === 'first') return 'First Suite';
  if (cabin === 'business') return refundable ? 'Business Flex' : 'Business Saver';
  if (cabin === 'premium') return refundable ? 'Premium Flex' : 'Premium Saver';
  return refundable ? 'Economy Flex' : 'Economy Saver';
}

function legLabel(tripType: FlightSearchQuery['tripType'], index: number): string {
  if (tripType === 'oneway') return 'Outbound';
  if (tripType === 'roundtrip') return index === 0 ? 'Outbound' : 'Return';
  return `Leg ${index + 1}`;
}

function offerPrice(
  legs: FlightLeg[],
  cabin: CabinClass,
  airlineCode: string,
  firstDate: string,
  rng: Rng,
): PriceBreakdown {
  const totalKm = legs.reduce(
    (sum, leg) =>
      sum + leg.segments.reduce((inner, segment) => inner + distanceKm(segment.from.iata, segment.to.iata), 0),
    0,
  );
  let base = (40 + totalKm * 0.055) * CABIN_MULTIPLIER[cabin] * airlineFactor(airlineCode);
  if (isWeekend(firstDate)) base *= 1.12;
  const daysOut = daysBetween(todayUtc(), firstDate);
  if (daysOut > 60) base *= 0.9;
  else if (daysOut > 30) base *= 0.95;
  if (legs.some((leg) => leg.segments.length > 1)) base *= 0.94;
  base = Math.max(18, base + rng.int(-6, 6));
  const inrBase = Math.round(base * USD_TO_INR);
  const taxes = Math.round(inrBase * 0.12);
  const fees = Math.round(inrBase * 0.05 + 14 * USD_TO_INR);
  return {
    base: inrBase,
    taxes,
    fees,
    seats: 0,
    baggage: 0,
    addons: 0,
    total: inrBase + taxes + fees,
    currency: 'INR',
  };
}

export function generateOffers(query: FlightSearchQuery): FlightOffer[] {
  const seed = `${query.tripType}|${query.cabin}|${query.legs
    .map((leg) => `${leg.from}-${leg.to}-${leg.date}`)
    .join('|')}`;
  const count = 6 + (hashSeed(seed) % 5);
  const offers: FlightOffer[] = [];
  for (let i = 0; i < count; i++) {
    const rng = new Rng(`${seed}#${i}`);
    const airline = rng.pick(AIRLINES);
    const refundableRoll = rng.chance(0.35);
    const legs = query.legs.map((legQuery, legIndex) =>
      buildLeg(rng, legQuery, query.cabin, airline.code, legLabel(query.tripType, legIndex), legIndex + i * 17),
    );
    const price = offerPrice(legs, query.cabin, airline.code, query.legs[0].date, rng);
    const durationMin = legs.reduce((sum, leg) => sum + leg.durationMin, 0);
    const stops = legs.reduce((sum, leg) => sum + leg.stops, 0);
    const seatsLeft = rng.chance(0.6) ? rng.int(1, 9) : undefined;
    offers.push({
      id: `off_${hashSeed(`${seed}#${i}#offer`).toString(16)}`,
      legs,
      durationMin,
      stops,
      price,
      ...(seatsLeft !== undefined ? { seatsLeft } : {}),
      fareBrand: fareBrand(query.cabin, refundableRoll),
      refundable: refundableRoll || query.cabin === 'business' || query.cabin === 'first',
      source: 'mock',
      estimated: true,
      score: 0,
    });
  }
  const maxPrice = Math.max(...offers.map((offer) => offer.price.total));
  const maxDuration = Math.max(...offers.map((offer) => offer.durationMin));
  for (const offer of offers) {
    const pricePart = maxPrice > 0 ? 1 - offer.price.total / maxPrice : 1;
    const durationPart = maxDuration > 0 ? 1 - offer.durationMin / maxDuration : 1;
    offer.score = Math.round(100 * (0.65 * pricePart + 0.35 * durationPart));
  }
  offers.sort((a, b) => b.score - a.score);
  return offers;
}

export class MockFlightSearchProvider implements FlightSearchProvider {
  search(query: FlightSearchQuery): { offers: FlightOffer[]; generatedAt: string } {
    return { offers: generateOffers(query), generatedAt: new Date().toISOString() };
  }
}

export function cheapestPriceForRoute(from: string, to: string, date: string, cabin: CabinClass): number | null {
  const airport = AIRPORT_BY_IATA.get(from);
  if (!airport || !AIRPORT_BY_IATA.has(to)) return null;
  const offers = generateOffers({
    tripType: 'oneway',
    legs: [{ from, to, date }],
    passengers: { adult: 1, child: 0, infant: 0 },
    cabin,
  });
  if (offers.length === 0) return null;
  return Math.min(...offers.map((offer) => offer.price.total));
}

export function getFlightSearchProvider(): FlightSearchProvider {
  const configured = process.env.FLIGHT_SEARCH_PROVIDER;
  if (configured && configured !== 'mock') {
    throw new Error(`Unsupported flight search provider: ${configured}`);
  }
  return new MockFlightSearchProvider();
}

import type { Airport, CabinClass, FlightOffer, FlightSearchQuery, FlightSegment, PriceCalendarDay } from '../types.js';
import { AIRPORTS, AIRPORT_BY_IATA, POPULAR_AIRPORTS } from '../database/seed.js';
import { SEARCH_TTL_MS, store, type StoredSearch } from '../database/store.js';
import {
  cheapestPriceForRoute,
  generateOffers,
} from '../integrations/flightSearchProvider.js';
import { notFound, unprocessable } from '../utils/errors.js';
import { randomId } from '../utils/reference.js';
import { monthDays, nowIso } from '../utils/time.js';

export interface SearchResult {
  searchId: string;
  offers: FlightOffer[];
  source: 'mock';
  estimated: true;
  generatedAt: string;
}

export function createSearch(query: FlightSearchQuery, userId: string | null): SearchResult {
  for (const leg of query.legs) {
    if (!AIRPORT_BY_IATA.has(leg.from)) {
      throw unprocessable('unknown_airport', `We don't have data for airport ${leg.from}.`);
    }
    if (!AIRPORT_BY_IATA.has(leg.to)) {
      throw unprocessable('unknown_airport', `We don't have data for airport ${leg.to}.`);
    }
  }
  const offers = generateOffers(query);
  const searchId = randomId('srch');
  const record: StoredSearch = {
    id: searchId,
    query,
    offers,
    userId,
    createdAt: nowIso(),
    expiresAt: Date.now() + SEARCH_TTL_MS,
  };
  store.searches.set(searchId, record);
  return {
    searchId,
    offers,
    source: 'mock',
    estimated: true,
    generatedAt: record.createdAt,
  };
}

const SEARCH_MISSING_MESSAGE =
  'This search has expired or could not be found. Please run a new search to see fresh fares.';

export function getSearch(searchId: string): StoredSearch {
  const search = store.searches.get(searchId);
  if (!search || search.expiresAt <= Date.now()) {
    throw notFound('search_not_found', SEARCH_MISSING_MESSAGE);
  }
  return search;
}

export function getOffer(searchId: string, offerId: string): { search: StoredSearch; offer: FlightOffer } {
  const search = getSearch(searchId);
  const offer = search.offers.find((candidate) => candidate.id === offerId);
  if (!offer) throw notFound('offer_not_found', SEARCH_MISSING_MESSAGE);
  return { search, offer };
}

export function getSegment(searchId: string, offerId: string, segmentId: string): FlightSegment {
  const { offer } = getOffer(searchId, offerId);
  for (const leg of offer.legs) {
    const segment = leg.segments.find((candidate) => candidate.id === segmentId);
    if (segment) return segment;
  }
  throw notFound('segment_not_found', 'That flight segment is no longer part of this search.');
}

export function priceCalendar(from: string, to: string, month: string, cabin: CabinClass): PriceCalendarDay[] {
  if (!AIRPORT_BY_IATA.has(from) || !AIRPORT_BY_IATA.has(to)) {
    throw unprocessable('unknown_airport', 'One of the airports in this calendar request is unknown.');
  }
  return monthDays(month).map((date) => {
    const price = cheapestPriceForRoute(from, to, date, cabin);
    const available = price !== null && (hashAvailable(date, from, to) % 10) !== 0;
    return {
      date,
      price: price ?? 0,
      currency: 'INR',
      available,
    };
  });
}

function hashAvailable(date: string, from: string, to: string): number {
  let h = 0;
  const input = `${date}${from}${to}`;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function searchAirports(q?: string): Airport[] {
  const query = (q ?? '').trim().toLowerCase();
  if (!query) {
    return POPULAR_AIRPORTS.map((iata) => AIRPORT_BY_IATA.get(iata))
      .filter((airport): airport is NonNullable<typeof airport> => !!airport)
      .slice(0, 12)
      .map(toAirport);
  }
  return AIRPORTS.filter((airport) => {
    const haystack = [airport.iata, airport.city, airport.country, airport.name]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  })
    .slice(0, 12)
    .map(toAirport);
}

function toAirport(airport: (typeof AIRPORTS)[number]): Airport {
  return {
    iata: airport.iata,
    name: airport.name,
    city: airport.city,
    country: airport.country,
    timezone: airport.timezone,
    terminals: airport.terminals,
  };
}

import type { AirportFacility, FacilityCategory } from '../types.js';
import { AIRPORT_BY_IATA, FACILITY_SEEDS } from '../database/seed.js';
import { Rng } from '../utils/prng.js';
import { notFound } from '../utils/errors.js';
import { isOpenAt } from '../utils/time.js';
import { toInr } from '../utils/currency.js';

const WALK_SPEED_M_PER_MIN = 70;

function facilityId(airport: string, name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${airport.toLowerCase()}-${slug}`;
}

export function buildFacilities(airportIata: string): AirportFacility[] {
  const airport = AIRPORT_BY_IATA.get(airportIata);
  const seeds = FACILITY_SEEDS[airportIata];
  if (!airport || !seeds) return [];
  return seeds.map((seed) => {
    const id = facilityId(airportIata, seed.name);
    const rng = new Rng(`facility:${id}`);
    const distanceM = 60 + (rng.int(0, 1740));
    return {
      id,
      airport: airportIata,
      name: seed.name,
      category: seed.category,
      terminal: seed.terminal,
      location: seed.location,
      description: seed.description,
      priceMin: toInr(seed.priceMin),
      currency: 'INR',
      openingHours: seed.openingHours,
      openNow: isOpenAt(seed.openingHours, airport.timezone),
      distanceM,
      walkMin: Math.round(distanceM / WALK_SPEED_M_PER_MIN),
      bookingSupported: seed.bookingSupported,
      rating: Math.round((3.8 + rng.int(0, 11) / 10) * 10) / 10,
    };
  });
}

export function listFacilities(
  airportIata: string,
  category?: FacilityCategory | 'all',
  q?: string,
): AirportFacility[] {
  if (!AIRPORT_BY_IATA.has(airportIata)) {
    throw notFound('airport_not_found', 'We don\'t have facility data for that airport yet.');
  }
  let facilities = buildFacilities(airportIata);
  if (category && category !== 'all') {
    facilities = facilities.filter((facility) => facility.category === category);
  }
  const query = (q ?? '').trim().toLowerCase();
  if (query) {
    facilities = facilities.filter((facility) =>
      [facility.name, facility.description, facility.location].join(' ').toLowerCase().includes(query),
    );
  }
  return facilities;
}

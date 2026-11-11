export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export const APP_NAME = 'SkyVoyage';

export const CURRENCY = 'INR';

export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'] as const;

export const CABINS = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium', label: 'Premium Economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First' },
] as const;

export const TRIP_TYPES = [
  { value: 'oneway', label: 'One way' },
  { value: 'roundtrip', label: 'Round trip' },
  { value: 'multicity', label: 'Multi-city' },
] as const;

export const PASSENGER_LABELS: Record<string, string> = {
  adult: 'Adults',
  child: 'Children',
  infant: 'Infants',
};

export const PASSENGER_HINTS: Record<string, string> = {
  adult: '12+ years',
  child: '2–11 years',
  infant: 'Under 2 years',
};

export const FACILITY_CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'lounge', label: 'Lounges' },
  { value: 'dining', label: 'Dining' },
  { value: 'hotel', label: 'Hotels & rest' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'worship', label: 'Prayer rooms' },
  { value: 'services', label: 'Services' },
  { value: 'medical', label: 'Medical' },
] as const;

export const AIRPORTS_WITH_GUIDE = ['MAA', 'DEL', 'DXB', 'SIN', 'LHR'];

export const ONBOARDING_SLIDES = [
  {
    title: 'Discover flights worldwide',
    body: 'Search hundreds of routes across global airlines and compare every option in one clean view.',
    icon: 'search',
  },
  {
    title: 'Compare prices and pick your seat',
    body: 'Transparent fare breakdowns, a price calendar and an interactive seat map before you pay.',
    icon: 'seat',
  },
  {
    title: 'Smart airport navigation',
    body: 'Step-by-step guidance from the arrivals kerb to your gate — terminal, counter, security and more.',
    icon: 'navigation',
  },
  {
    title: 'Track flights and get alerts',
    body: 'Live status, gate changes, delays and boarding calls delivered to your notification centre.',
    icon: 'radar',
  },
  {
    title: 'Explore the airport while you wait',
    body: 'Lounges, dining, hotels and shops — plus an AI assistant that respects your boarding time.',
    icon: 'sparkles',
  },
] as const;

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  booking_confirmed: 'Booking confirmed',
  checkin_available: 'Check-in open',
  checkin_reminder: 'Check-in reminder',
  gate_assigned: 'Gate assigned',
  gate_changed: 'Gate changed',
  boarding_started: 'Boarding started',
  final_call: 'Final boarding call',
  flight_delayed: 'Flight delayed',
  flight_cancelled: 'Flight cancelled',
  flight_landed: 'Flight landed',
  baggage_updated: 'Baggage updated',
};

/** Base walking speed used across the app, in metres per minute. */
export const WALK_SPEED_M_PER_MIN = 70;

/** Safe buffer before boarding starts the AI assistant must protect. */
export const RETURN_GATE_BUFFER_MIN = 20;

export interface Destination {
  city: string;
  country: string;
  iata: string;
  blurb: string;
  fromPrice: number;
  tone: string;
}

export const POPULAR_DESTINATIONS: Destination[] = [
  {
    city: 'Dubai',
    country: 'United Arab Emirates',
    iata: 'DXB',
    blurb: 'Desert skyline, gold souks and beach clubs',
    fromPrice: 34200,
    tone: 'from-amber-500/85 to-rose-700/85',
  },
  {
    city: 'Singapore',
    country: 'Singapore',
    iata: 'SIN',
    blurb: 'Gardens, hawker centres and flawless transit',
    fromPrice: 32200,
    tone: 'from-emerald-500/85 to-teal-700/85',
  },
  {
    city: 'London',
    country: 'United Kingdom',
    iata: 'LHR',
    blurb: 'Royal landmarks and world-class museums',
    fromPrice: 41200,
    tone: 'from-sky-500/85 to-indigo-700/85',
  },
  {
    city: 'Paris',
    country: 'France',
    iata: 'CDG',
    blurb: 'Art, cuisine and timeless boulevards',
    fromPrice: 38800,
    tone: 'from-violet-500/85 to-fuchsia-700/85',
  },
  {
    city: 'Tokyo',
    country: 'Japan',
    iata: 'NRT',
    blurb: 'Neon nights, shrines and Michelin ramen',
    fromPrice: 53200,
    tone: 'from-rose-500/85 to-red-700/85',
  },
  {
    city: 'Bangkok',
    country: 'Thailand',
    iata: 'BKK',
    blurb: 'Temples, street food and river ferries',
    fromPrice: 25300,
    tone: 'from-yellow-500/85 to-orange-700/85',
  },
  {
    city: 'Istanbul',
    country: 'Türkiye',
    iata: 'IST',
    blurb: 'Where Europe meets Asia over the Bosphorus',
    fromPrice: 29500,
    tone: 'from-cyan-500/85 to-blue-700/85',
  },
  {
    city: 'New York',
    country: 'United States',
    iata: 'JFK',
    blurb: 'Skylines, Broadway and borough food scenes',
    fromPrice: 48700,
    tone: 'from-slate-500/85 to-navy',
  },
];

export const PROMOTIONS = [
  {
    title: 'Early-bird fares to the Gulf',
    body: 'Plan 30+ days ahead and demo fares drop by up to 14% on MAA–DXB routes.',
    tag: 'Limited demo offer',
    tone: 'bg-navy text-white',
  },
  {
    title: 'Seat sale: extra legroom',
    body: 'Exit-row seats are shown at a reduced estimate during this demo campaign.',
    tag: 'Demo campaign',
    tone: 'bg-brand-soft text-brand-dark',
  },
  {
    title: 'Bundle & save on baggage',
    body: 'Add 10 kg of extra baggage in the booking flow and watch the price update instantly.',
    tag: 'Always on',
    tone: 'bg-success-soft text-success',
  },
] as const;

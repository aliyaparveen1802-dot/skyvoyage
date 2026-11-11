import type { Airline, Airport, FacilityCategory, JourneyStageId } from '../types.js';

export interface AirportRecord extends Airport {
  lat: number;
  lng: number;
}

export interface DemoFlight {
  flightNumber: string;
  airlineCode: string;
  from: string;
  to: string;
  depLocal: string;
  durationMin: number;
}

export interface FacilitySeed {
  name: string;
  category: FacilityCategory;
  terminal: string;
  location: string;
  description: string;
  priceMin: number;
  openingHours: string;
  bookingSupported: boolean;
}

export const AIRPORTS: AirportRecord[] = [
  { iata: 'MAA', name: 'Chennai International Airport', city: 'Chennai', country: 'India', timezone: 'Asia/Kolkata', terminals: ['T1', 'T2'], lat: 12.9941, lng: 80.1709 },
  { iata: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi', country: 'India', timezone: 'Asia/Kolkata', terminals: ['T1', 'T2', 'T3'], lat: 28.5562, lng: 77.1 },
  { iata: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata', terminals: ['T1', 'T2'], lat: 19.0896, lng: 72.8656 },
  { iata: 'BLR', name: 'Kempegowda International Airport', city: 'Bengaluru', country: 'India', timezone: 'Asia/Kolkata', terminals: ['T1', 'T2'], lat: 13.1986, lng: 77.7066 },
  { iata: 'HYD', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad', country: 'India', timezone: 'Asia/Kolkata', terminals: ['T1', 'T2'], lat: 17.2403, lng: 78.4294 },
  { iata: 'CCU', name: 'Netaji Subhas Chandra Bose International Airport', city: 'Kolkata', country: 'India', timezone: 'Asia/Kolkata', terminals: ['T1', 'T2'], lat: 22.6547, lng: 88.4467 },
  { iata: 'COK', name: 'Cochin International Airport', city: 'Kochi', country: 'India', timezone: 'Asia/Kolkata', terminals: ['T1', 'T2'], lat: 9.9477, lng: 76.2733 },
  { iata: 'GOI', name: 'Goa International Airport', city: 'Goa', country: 'India', timezone: 'Asia/Kolkata', terminals: ['T1'], lat: 15.3808, lng: 73.8314 },
  { iata: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates', timezone: 'Asia/Dubai', terminals: ['T1', 'T3'], lat: 25.2532, lng: 55.3657 },
  { iata: 'AUH', name: 'Zayed International Airport', city: 'Abu Dhabi', country: 'United Arab Emirates', timezone: 'Asia/Dubai', terminals: ['T1', 'T2'], lat: 24.433, lng: 54.6511 },
  { iata: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar', timezone: 'Asia/Qatar', terminals: ['T1'], lat: 25.2731, lng: 51.6081 },
  { iata: 'KWI', name: 'Kuwait International Airport', city: 'Kuwait City', country: 'Kuwait', timezone: 'Asia/Kuwait', terminals: ['T1', 'T2'], lat: 29.2266, lng: 47.9689 },
  { iata: 'RUH', name: 'King Khalid International Airport', city: 'Riyadh', country: 'Saudi Arabia', timezone: 'Asia/Riyadh', terminals: ['T1', 'T2'], lat: 24.9576, lng: 46.6988 },
  { iata: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', timezone: 'Europe/Istanbul', terminals: ['T1'], lat: 41.2753, lng: 28.7519 },
  { iata: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', terminals: ['T1', 'T2', 'T3', 'T4'], lat: 1.3644, lng: 103.9915 },
  { iata: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', timezone: 'Asia/Bangkok', terminals: ['T1', 'T2'], lat: 13.69, lng: 100.7501 },
  { iata: 'KUL', name: 'Kuala Lumpur International Airport', city: 'Kuala Lumpur', country: 'Malaysia', timezone: 'Asia/Kuala_Lumpur', terminals: ['T1', 'T2'], lat: 2.7456, lng: 101.7099 },
  { iata: 'CGK', name: 'Soekarno-Hatta International Airport', city: 'Jakarta', country: 'Indonesia', timezone: 'Asia/Jakarta', terminals: ['T1', 'T2', 'T3'], lat: -6.1256, lng: 106.6559 },
  { iata: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom', timezone: 'Europe/London', terminals: ['T2', 'T3', 'T4', 'T5'], lat: 51.47, lng: -0.4543 },
  { iata: 'CDG', name: 'Paris Charles de Gaulle Airport', city: 'Paris', country: 'France', timezone: 'Europe/Paris', terminals: ['T1', 'T2', 'T3'], lat: 49.0097, lng: 2.5479 },
  { iata: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', timezone: 'Europe/Amsterdam', terminals: ['T1', 'T2', 'T3'], lat: 52.3105, lng: 4.7683 },
  { iata: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', timezone: 'Europe/Berlin', terminals: ['T1', 'T2'], lat: 50.0379, lng: 8.5622 },
  { iata: 'MAD', name: 'Adolfo Suárez Madrid–Barajas Airport', city: 'Madrid', country: 'Spain', timezone: 'Europe/Madrid', terminals: ['T1', 'T2', 'T4'], lat: 40.4719, lng: -3.5626 },
  { iata: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland', timezone: 'Europe/Zurich', terminals: ['T1', 'T2'], lat: 47.4647, lng: 8.5492 },
  { iata: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States', timezone: 'America/New_York', terminals: ['T1', 'T4', 'T5', 'T7', 'T8'], lat: 40.6413, lng: -73.7781 },
  { iata: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States', timezone: 'America/Los_Angeles', terminals: ['T1', 'T2', 'T4', 'T6', 'TBIT'], lat: 33.9416, lng: -118.4085 },
  { iata: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'United States', timezone: 'America/Los_Angeles', terminals: ['T1', 'T2', 'T3', 'TI'], lat: 37.6213, lng: -122.379 },
  { iata: 'ORD', name: "O'Hare International Airport", city: 'Chicago', country: 'United States', timezone: 'America/Chicago', terminals: ['T1', 'T2', 'T3', 'T5'], lat: 41.9742, lng: -87.9073 },
  { iata: 'ATL', name: 'Hartsfield–Jackson Atlanta International Airport', city: 'Atlanta', country: 'United States', timezone: 'America/New_York', terminals: ['T', 'A', 'B', 'C', 'D'], lat: 33.6407, lng: -84.4277 },
  { iata: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada', timezone: 'America/Toronto', terminals: ['T1', 'T2', 'T3'], lat: 43.6777, lng: -79.6248 },
  { iata: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada', timezone: 'America/Vancouver', terminals: ['T1', 'T2'], lat: 49.1967, lng: -123.1815 },
  { iata: 'MEX', name: 'Mexico City International Airport', city: 'Mexico City', country: 'Mexico', timezone: 'America/Mexico_City', terminals: ['T1', 'T2'], lat: 19.4363, lng: -99.0721 },
  { iata: 'GRU', name: 'São Paulo/Guarulhos International Airport', city: 'São Paulo', country: 'Brazil', timezone: 'America/Sao_Paulo', terminals: ['T1', 'T2', 'T3'], lat: -23.4356, lng: -46.4731 },
  { iata: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', terminals: ['T1', 'T2', 'T3'], lat: -33.9399, lng: 151.1753 },
  { iata: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia', timezone: 'Australia/Melbourne', terminals: ['T1', 'T2', 'T3'], lat: -37.669, lng: 144.841 },
  { iata: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong', timezone: 'Asia/Hong_Kong', terminals: ['T1', 'T2'], lat: 22.308, lng: 113.9185 },
  { iata: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', terminals: ['T1', 'T2'], lat: 35.772, lng: 140.3929 },
  { iata: 'HND', name: 'Tokyo Haneda Airport', city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', terminals: ['T1', 'T2', 'T3'], lat: 35.5494, lng: 139.7798 },
  { iata: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul', terminals: ['T1', 'T2'], lat: 37.4602, lng: 126.4407 },
  { iata: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China', timezone: 'Asia/Shanghai', terminals: ['T1', 'T2', 'T3'], lat: 40.0799, lng: 116.6031 },
  { iata: 'PVG', name: 'Shanghai Pudong International Airport', city: 'Shanghai', country: 'China', timezone: 'Asia/Shanghai', terminals: ['T1', 'T2'], lat: 31.1443, lng: 121.8083 },
  { iata: 'JNB', name: 'O. R. Tambo International Airport', city: 'Johannesburg', country: 'South Africa', timezone: 'Africa/Johannesburg', terminals: ['T1', 'T2'], lat: -26.1392, lng: 28.246 },
  { iata: 'CAI', name: 'Cairo International Airport', city: 'Cairo', country: 'Egypt', timezone: 'Africa/Cairo', terminals: ['T1', 'T2', 'T3'], lat: 30.1219, lng: 31.4056 },
  { iata: 'NBO', name: 'Jomo Kenyatta International Airport', city: 'Nairobi', country: 'Kenya', timezone: 'Africa/Nairobi', terminals: ['T1', 'T2'], lat: -1.3192, lng: 36.9278 },
];

export const AIRPORT_BY_IATA: Map<string, AirportRecord> = new Map(
  AIRPORTS.map((airport) => [airport.iata, airport]),
);

export const AIRLINES: Airline[] = [
  { code: 'EK', name: 'Emirates', color: '#D71921' },
  { code: 'AI', name: 'Air India', color: '#C41E3A' },
  { code: '6E', name: 'IndiGo', color: '#1B3F8B' },
  { code: 'SG', name: 'SpiceJet', color: '#E31837' },
  { code: 'SQ', name: 'Singapore Airlines', color: '#F9A01B' },
  { code: 'QF', name: 'Qantas', color: '#E0001B' },
  { code: 'BA', name: 'British Airways', color: '#1D4487' },
  { code: 'LH', name: 'Lufthansa', color: '#05164D' },
  { code: 'AF', name: 'Air France', color: '#002157' },
  { code: 'KL', name: 'KLM', color: '#00A1DE' },
  { code: 'TK', name: 'Turkish Airlines', color: '#C70A0B' },
  { code: 'QR', name: 'Qatar Airways', color: '#5C0632' },
  { code: 'EY', name: 'Etihad Airways', color: '#B48A35' },
  { code: 'CX', name: 'Cathay Pacific', color: '#006564' },
  { code: 'NH', name: 'All Nippon Airways', color: '#13448F' },
  { code: 'JL', name: 'Japan Airlines', color: '#C8102E' },
  { code: 'UA', name: 'United Airlines', color: '#005DAA' },
  { code: 'DL', name: 'Delta Air Lines', color: '#003263' },
];

export const AIRLINE_BY_CODE: Map<string, Airline> = new Map(
  AIRLINES.map((airline) => [airline.code, airline]),
);

export const AIRCRAFT_MODELS = [
  'Airbus A320neo',
  'Airbus A321neo',
  'Boeing 737 MAX 8',
  'Boeing 787-9',
  'Airbus A350-900',
  'Boeing 777-300ER',
  'Boeing 777-200LR',
  'Airbus A380-800',
];

export const HUB_IATAS = ['DXB', 'DOH', 'SIN', 'DEL', 'IST', 'FRA', 'AUH', 'BKK'];

export const POPULAR_AIRPORTS = ['DXB', 'LHR', 'DEL', 'SIN', 'MAA', 'BOM', 'JFK', 'CDG', 'AMS', 'FRA', 'HKG', 'SYD'];

export const GUIDE_AIRPORTS = ['MAA', 'DEL', 'DXB', 'SIN', 'LHR'];

export const DEMO_SCHEDULE: DemoFlight[] = [
  { flightNumber: 'EK 505', airlineCode: 'EK', from: 'MAA', to: 'DXB', depLocal: '08:45', durationMin: 230 },
  { flightNumber: 'EK 506', airlineCode: 'EK', from: 'DXB', to: 'MAA', depLocal: '21:30', durationMin: 205 },
  { flightNumber: 'AI 302', airlineCode: 'AI', from: 'MAA', to: 'DEL', depLocal: '06:15', durationMin: 175 },
  { flightNumber: 'AI 303', airlineCode: 'AI', from: 'DEL', to: 'MAA', depLocal: '18:40', durationMin: 170 },
  { flightNumber: 'SQ 322', airlineCode: 'SQ', from: 'SIN', to: 'DEL', depLocal: '12:20', durationMin: 280 },
  { flightNumber: 'EK 412', airlineCode: 'EK', from: 'DXB', to: 'SIN', depLocal: '03:30', durationMin: 440 },
  { flightNumber: 'BA 118', airlineCode: 'BA', from: 'LHR', to: 'JFK', depLocal: '14:05', durationMin: 470 },
  { flightNumber: 'QR 501', airlineCode: 'QR', from: 'DOH', to: 'DEL', depLocal: '01:40', durationMin: 245 },
  { flightNumber: 'EK 305', airlineCode: 'EK', from: 'DXB', to: 'LHR', depLocal: '07:50', durationMin: 420 },
  { flightNumber: 'AI 318', airlineCode: 'AI', from: 'BOM', to: 'DXB', depLocal: '22:10', durationMin: 165 },
  { flightNumber: 'SQ 306', airlineCode: 'SQ', from: 'SIN', to: 'LHR', depLocal: '23:55', durationMin: 855 },
];

export const GATE_POOL = ['A3', 'A7', 'B4', 'B12', 'C9', 'C2', 'D6', 'E15', 'F8'];
export const COUNTER_POOL = ['A12', 'B12', 'C4', 'D8', 'E2', 'F6'];
export const BELT_POOL = ['B3', 'C7', 'D2', 'A5', 'E1'];

export const FACILITY_WALK_SOURCE_M: Record<string, number> = {
  MAA: 450,
  DEL: 700,
  DXB: 900,
  SIN: 800,
  LHR: 750,
};

export const FACILITY_SEEDS: Record<string, FacilitySeed[]> = {
  MAA: [
    { name: 'Tirusulam Transit Hotel', category: 'hotel', terminal: 'T1', location: 'Airside, near Gate 12', description: 'Compact airside rooms for short layovers with shower access.', priceMin: 45, openingHours: '00:00–24:00', bookingSupported: true },
    { name: 'NapPod Sleeping Pods', category: 'hotel', terminal: 'T1', location: 'Departures level, near the food court', description: 'Private reclining pods rented by the hour for a quick rest.', priceMin: 18, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'Chola Lounge', category: 'lounge', terminal: 'T1', location: 'Airside, Level 2 near Gate 8', description: 'Quiet lounge with hot buffet, Wi-Fi and shower suites.', priceMin: 32, openingHours: '05:00–23:00', bookingSupported: true },
    { name: 'Airside Lounge T2', category: 'lounge', terminal: 'T2', location: 'Airside, near Gate 24', description: 'Comfortable seating, snacks and flight monitors.', priceMin: 28, openingHours: '06:00–23:00', bookingSupported: true },
    { name: 'Nehru Plaza Food Court', category: 'dining', terminal: 'T1', location: 'Landside, Level 1', description: 'Multi-vendor food court serving South Indian classics and quick bites.', priceMin: 6, openingHours: '05:30–23:30', bookingSupported: false },
    { name: 'Chettinad Kitchen', category: 'dining', terminal: 'T1', location: 'Airside, near Gate 6', description: 'Sit-down restaurant with Chettinad curries and filter coffee.', priceMin: 12, openingHours: '07:00–22:00', bookingSupported: false },
    { name: 'South Indian Coffee House', category: 'dining', terminal: 'T2', location: 'Departures, near Check-in Row D', description: 'Fast counter for idli, dosa and freshly brewed filter coffee.', priceMin: 4, openingHours: '05:00–23:00', bookingSupported: false },
    { name: 'SkyDuty Free', category: 'shopping', terminal: 'T1', location: 'Airside, Central Hall', description: 'Duty-free spirits, fragrance and Tamil Nadu souvenirs.', priceMin: 5, openingHours: '05:30–23:00', bookingSupported: false },
    { name: 'Silk & Spice Souvenirs', category: 'shopping', terminal: 'T2', location: 'Airside, near Gate 22', description: 'Kanchipuram silk, spices and miniatures to take home.', priceMin: 8, openingHours: '06:00–22:00', bookingSupported: false },
    { name: 'Marina Spa & Massage', category: 'wellness', terminal: 'T1', location: 'Airside, Level 2', description: 'Massage and reflexology treatments booked by the half hour.', priceMin: 35, openingHours: '08:00–22:00', bookingSupported: true },
    { name: 'Multi-faith Prayer Room', category: 'worship', terminal: 'T1', location: 'Landside, Level 1 opposite Check-in Row A', description: 'Quiet prayer space open to all faiths with ablution facilities.', priceMin: 0, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'HDFC ATM Concourse', category: 'services', terminal: 'T1', location: 'Arrivals, Baggage Hall', description: 'Cash dispensers supporting major international cards.', priceMin: 0, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'ForexBureau Exchange', category: 'services', terminal: 'T1', location: 'Arrivals, Exit 3', description: 'Currency counter for INR and major foreign currencies.', priceMin: 0, openingHours: '06:00–22:00', bookingSupported: false },
    { name: 'Charging Bar T1', category: 'services', terminal: 'T1', location: 'Airside, near Gate 10', description: 'Seating with universal power outlets and USB-C points.', priceMin: 0, openingHours: '05:00–23:00', bookingSupported: false },
    { name: 'Airport Medical Clinic', category: 'medical', terminal: 'T1', location: 'Landside, Level 1 near Entry 2', description: 'Doctor-staffed clinic for minor illness and travel jabs.', priceMin: 0, openingHours: '00:00–24:00', bookingSupported: false },
  ],
  DEL: [
    { name: 'Palm Transit Hotel', category: 'hotel', terminal: 'T3', location: 'Airside, near Gate 36', description: 'Day-use rooms and showers for long international connections.', priceMin: 50, openingHours: '00:00–24:00', bookingSupported: true },
    { name: 'Snooze Pods T3', category: 'hotel', terminal: 'T3', location: 'Landside, near Entry 4', description: 'Rechargeable sleep pods with privacy curtains and lockers.', priceMin: 15, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'Yatri Lounge', category: 'lounge', terminal: 'T3', location: 'Airside, near Gate 36', description: 'Buffet, barista coffee and quiet work pods before departure.', priceMin: 30, openingHours: '05:00–23:00', bookingSupported: true },
    { name: 'Airside Lounge T1', category: 'lounge', terminal: 'T1', location: 'Airside, near Gate 18', description: 'Compact lounge with snacks and flight boards.', priceMin: 25, openingHours: '06:00–22:00', bookingSupported: true },
    { name: 'Rajdhani Food Court', category: 'dining', terminal: 'T3', location: 'Landside, Level 1', description: 'North Indian thalis, chaat and tandoor counter.', priceMin: 7, openingHours: '05:00–23:30', bookingSupported: false },
    { name: 'Chai Point', category: 'dining', terminal: 'T1', location: 'Departures, near Check-in Row C', description: 'Masala chai, sandwiches and quick breakfast plates.', priceMin: 3, openingHours: '05:30–22:30', bookingSupported: false },
    { name: 'Yatri Bhojan Hall', category: 'dining', terminal: 'T2', location: 'Airside, near Gate 12', description: 'Vegetarian thali hall with unlimited refills at lunch.', priceMin: 9, openingHours: '06:00–23:00', bookingSupported: false },
    { name: 'Duty Free Plaza', category: 'shopping', terminal: 'T3', location: 'Airside, Central Hall', description: 'Spirits, confectionery and Indian handicrafts duty free.', priceMin: 5, openingHours: '05:30–23:00', bookingSupported: false },
    { name: 'Crafts of India', category: 'shopping', terminal: 'T2', location: 'Airside, near Gate 8', description: 'Handloom, brassware and miniatures from across India.', priceMin: 6, openingHours: '07:00–22:00', bookingSupported: false },
    { name: 'Spa at T3', category: 'wellness', terminal: 'T3', location: 'Airside, Level 2', description: 'Ayurvedic massage and foot therapy by appointment.', priceMin: 40, openingHours: '08:00–22:00', bookingSupported: true },
    { name: 'Prayer Hall T3', category: 'worship', terminal: 'T3', location: 'Landside, Level 1', description: 'Separate spaces for prayer with washing facilities.', priceMin: 0, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'SBI ATM Concourse', category: 'services', terminal: 'T3', location: 'Arrivals, Baggage Hall', description: 'ATMs dispensing INR for major card networks.', priceMin: 0, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'Currency Exchange Desk', category: 'services', terminal: 'T1', location: 'Arrivals, Exit 2', description: 'Counter exchange for USD, EUR, GBP and AED.', priceMin: 0, openingHours: '06:00–22:00', bookingSupported: false },
    { name: 'Charging Stations T3', category: 'services', terminal: 'T3', location: 'Airside, near Gate 40', description: 'Power lockers and universal sockets along the concourse.', priceMin: 0, openingHours: '05:00–23:00', bookingSupported: false },
    { name: 'Information Desk T1', category: 'services', terminal: 'T1', location: 'Landside, near Entry 1', description: 'Staffed desk for transfers, lost property and special assistance.', priceMin: 0, openingHours: '06:00–22:00', bookingSupported: false },
    { name: 'Medical Clinic T3', category: 'medical', terminal: 'T3', location: 'Landside, Level 1', description: '24-hour clinic with doctor on call and pharmacy counter.', priceMin: 0, openingHours: '00:00–24:00', bookingSupported: false },
  ],
  DXB: [
    { name: 'DXB Transit Hotel', category: 'hotel', terminal: 'T3', location: 'Airside, Concourse B', description: 'Cabins by the hour with shower packs for long connections.', priceMin: 60, openingHours: '00:00–24:00', bookingSupported: true },
    { name: 'Snooze Pods Concourse A', category: 'hotel', terminal: 'T1', location: 'Airside, near Gate A12', description: 'Privacy pods with reading light and charging point.', priceMin: 20, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'Concourse B Lounge', category: 'lounge', terminal: 'T3', location: 'Airside, Concourse B near Gate B15', description: 'Full-service lounge with hot dishes, showers and quiet zones.', priceMin: 45, openingHours: '00:00–24:00', bookingSupported: true },
    { name: 'Oasis Lounge T1', category: 'lounge', terminal: 'T1', location: 'Airside, near Gate 12', description: 'Calm seating, snacks and beverages with runway views.', priceMin: 35, openingHours: '05:00–23:00', bookingSupported: true },
    { name: 'Global Village Food Court', category: 'dining', terminal: 'T3', location: 'Airside, Concourse A', description: 'International counters from Levantine grill to Asian noodles.', priceMin: 10, openingHours: '05:00–24:00', bookingSupported: false },
    { name: 'Arabic Coffee House', category: 'dining', terminal: 'T1', location: 'Landside, near Entry 3', description: 'Cardamom coffee, dates and light mezze plates.', priceMin: 5, openingHours: '06:00–23:00', bookingSupported: false },
    { name: 'Mezze & Grill', category: 'dining', terminal: 'T3', location: 'Airside, near Gate B7', description: 'Sit-down grill with shawarma platters and fresh juices.', priceMin: 18, openingHours: '07:00–23:00', bookingSupported: false },
    { name: 'Duty Free Mega Store', category: 'shopping', terminal: 'T3', location: 'Airside, Concourse B', description: 'Spirits, electronics and gold at duty-free pricing.', priceMin: 5, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'Perfume Souq', category: 'shopping', terminal: 'T1', location: 'Airside, near Gate 8', description: 'Oud, amber and designer fragrances with gift wrapping.', priceMin: 8, openingHours: '06:00–23:00', bookingSupported: false },
    { name: 'Spa Concourse B', category: 'wellness', terminal: 'T3', location: 'Airside, Concourse B', description: 'Massages, facials and sleep treatments by the hour.', priceMin: 50, openingHours: '06:00–23:00', bookingSupported: true },
    { name: 'Musalla Prayer Room', category: 'worship', terminal: 'T1', location: 'Landside, Level 1', description: 'Prayer hall with separate spaces and ablution facilities.', priceMin: 0, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'ATM Concourse A', category: 'services', terminal: 'T1', location: 'Airside, near Gate A8', description: 'Dirham dispensers for international card networks.', priceMin: 0, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'Currency Exchange T3', category: 'services', terminal: 'T3', location: 'Arrivals, Exit 2', description: '24-hour counter exchange across major currencies.', priceMin: 0, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'Charging Bar T3', category: 'services', terminal: 'T3', location: 'Airside, near Gate B7', description: 'Bar-style seating with universal sockets and USB-C.', priceMin: 0, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'Airport Medical Centre', category: 'medical', terminal: 'T1', location: 'Landside, near Entry 2', description: 'Clinic with doctor on duty and vaccination room.', priceMin: 0, openingHours: '00:00–24:00', bookingSupported: false },
  ],
  SIN: [
    { name: 'SIN Transit Hotel', category: 'hotel', terminal: 'T1', location: 'Airside, near Gate D36', description: 'Day rooms with shower and nap access for connections.', priceMin: 55, openingHours: '00:00–24:00', bookingSupported: true },
    { name: 'Sleeping Pods T2', category: 'hotel', terminal: 'T2', location: 'Airside, near Gate E14', description: 'Soundproof pods with blanket, locker and reading light.', priceMin: 22, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'Orchid Lounge', category: 'lounge', terminal: 'T1', location: 'Airside, near Gate D32', description: 'Garden-themed lounge with local dishes and shower suites.', priceMin: 38, openingHours: '00:00–24:00', bookingSupported: true },
    { name: 'Airside Lounge T3', category: 'lounge', terminal: 'T3', location: 'Airside, near Gate A16', description: 'Buffet, nap area and flight boards with runway views.', priceMin: 34, openingHours: '05:00–23:00', bookingSupported: true },
    { name: 'Hawker Street Food Court', category: 'dining', terminal: 'T3', location: 'Airside, near Gate A12', description: 'Hawker-style stalls for chicken rice, laksa and kaya toast.', priceMin: 8, openingHours: '06:00–24:00', bookingSupported: false },
    { name: 'Kopi & Kaya Cafe', category: 'dining', terminal: 'T1', location: 'Landside, near the Departure Hall', description: 'Traditional kopi, kaya toast and soft-boiled eggs.', priceMin: 4, openingHours: '06:30–22:00', bookingSupported: false },
    { name: 'Nasi Lemak Kitchen', category: 'dining', terminal: 'T2', location: 'Airside, near Gate E20', description: 'Sit-down counter for nasi lemak, satay and fresh juices.', priceMin: 9, openingHours: '07:00–23:00', bookingSupported: false },
    { name: 'Duty Free T3', category: 'shopping', terminal: 'T3', location: 'Airside, Central', description: 'Perfumes, liquor and chocolates at duty-free prices.', priceMin: 5, openingHours: '06:00–23:30', bookingSupported: false },
    { name: 'Lion City Souvenirs', category: 'shopping', terminal: 'T1', location: 'Airside, near Gate D24', description: 'Merlion gifts, orchid keepsakes and local snacks.', priceMin: 7, openingHours: '07:00–22:00', bookingSupported: false },
    { name: 'Wellness Spa T3', category: 'wellness', terminal: 'T3', location: 'Airside, near Gate A18', description: 'Aromatherapy massages and express facials.', priceMin: 45, openingHours: '08:00–22:00', bookingSupported: true },
    { name: 'Prayer Room T2', category: 'worship', terminal: 'T2', location: 'Landside, Level 1', description: 'Multi-faith room with ablution area and qibla marker.', priceMin: 0, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'ATM T1', category: 'services', terminal: 'T1', location: 'Arrivals, Exit A', description: 'ATMs dispensing SGD for major card networks.', priceMin: 0, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'Currency Exchange T2', category: 'services', terminal: 'T2', location: 'Arrivals, Baggage Hall', description: 'Counter exchange across Asian and global currencies.', priceMin: 0, openingHours: '06:00–23:00', bookingSupported: false },
    { name: 'Charging Bar T3', category: 'services', terminal: 'T3', location: 'Airside, near Gate A10', description: 'Recharge seating with universal outlets and lockers.', priceMin: 0, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'Medical Clinic T1', category: 'medical', terminal: 'T1', location: 'Landside, Level 1', description: 'Clinic with nurse on duty and pharmacy nearby.', priceMin: 0, openingHours: '00:00–24:00', bookingSupported: false },
  ],
  LHR: [
    { name: 'Heathrow Transit Hotel', category: 'hotel', terminal: 'T3', location: 'Airside, near Gate 5', description: 'Day rooms and showers for connecting passengers.', priceMin: 55, openingHours: '00:00–24:00', bookingSupported: true },
    { name: 'Snooze Pods T5', category: 'hotel', terminal: 'T5', location: 'Airside, near Gate B36', description: 'Compact pods with privacy blind and charging point.', priceMin: 20, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'Aurora Lounge', category: 'lounge', terminal: 'T5', location: 'Airside, near Gate B15', description: 'Full buffet, bar and shower suites with runway views.', priceMin: 40, openingHours: '05:00–22:30', bookingSupported: true },
    { name: 'Airside Lounge T2', category: 'lounge', terminal: 'T2', location: 'Airside, near Gate B38', description: 'Hot snacks, quiet booths and fast Wi-Fi.', priceMin: 32, openingHours: '05:00–22:00', bookingSupported: true },
    { name: 'Heathrow Market Hall', category: 'dining', terminal: 'T2', location: 'Landside, Departures', description: 'Market stalls for pies, sushi and barista coffee.', priceMin: 9, openingHours: '05:00–22:00', bookingSupported: false },
    { name: 'British Bakehouse Cafe', category: 'dining', terminal: 'T3', location: 'Airside, near Gate 12', description: 'Scones, sandwiches and afternoon tea plates.', priceMin: 6, openingHours: '05:30–21:30', bookingSupported: false },
    { name: 'Terminal 5 Food Court', category: 'dining', terminal: 'T5', location: 'Airside, near Gate B12', description: 'Fish and chips, ramen and salad bars under one roof.', priceMin: 11, openingHours: '05:00–23:00', bookingSupported: false },
    { name: 'Duty Free T5', category: 'shopping', terminal: 'T5', location: 'Airside, Central', description: 'Whisky, cosmetics and British confectionery duty free.', priceMin: 5, openingHours: '05:00–22:00', bookingSupported: false },
    { name: 'London Souvenirs', category: 'shopping', terminal: 'T2', location: 'Airside, near Gate 22', description: 'Union Jack gifts, tea tins and London memorabilia.', priceMin: 8, openingHours: '06:00–21:30', bookingSupported: false },
    { name: 'Spa T3', category: 'wellness', terminal: 'T3', location: 'Airside, near Gate 18', description: 'Massages, manicures and relaxation loungers.', priceMin: 42, openingHours: '07:00–21:00', bookingSupported: true },
    { name: 'Interfaith Chapel T3', category: 'worship', terminal: 'T3', location: 'Landside, Level 1', description: 'Chapel and prayer room open to all faiths.', priceMin: 0, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'ATM T5', category: 'services', terminal: 'T5', location: 'Arrivals, Baggage Hall', description: 'Pound sterling dispensers for major cards.', priceMin: 0, openingHours: '00:00–24:00', bookingSupported: false },
    { name: 'Currency Exchange T3', category: 'services', terminal: 'T3', location: 'Arrivals, Exit B', description: 'Bureau de change for GBP, EUR and USD.', priceMin: 0, openingHours: '05:00–22:00', bookingSupported: false },
    { name: 'Charging Bar T2', category: 'services', terminal: 'T2', location: 'Airside, near Gate B36', description: 'Counter seating with UK and USB sockets.', priceMin: 0, openingHours: '05:00–22:00', bookingSupported: false },
    { name: 'Medical Centre T5', category: 'medical', terminal: 'T5', location: 'Landside, Departures', description: 'Nurse-led centre with pharmacy and first aid.', priceMin: 0, openingHours: '06:00–22:00', bookingSupported: false },
  ],
};

export interface StageMeta {
  id: JourneyStageId;
  order: number;
  title: string;
  task: string;
  estimatedMinutes: number;
  isOptional: boolean;
}

export const STAGE_META: StageMeta[] = [
  { id: 'arrival', order: 1, title: 'Arrive at the airport', task: 'Reach your terminal and drop off your ride.', estimatedMinutes: 12, isOptional: false },
  { id: 'terminal', order: 2, title: 'Find your terminal', task: 'Locate the correct terminal building.', estimatedMinutes: 8, isOptional: false },
  { id: 'entrance', order: 3, title: 'Enter the terminal', task: 'Pass the entrance screening point.', estimatedMinutes: 5, isOptional: false },
  { id: 'checkin', order: 4, title: 'Check in', task: 'Check in and get your boarding pass.', estimatedMinutes: 15, isOptional: false },
  { id: 'baggage', order: 5, title: 'Drop your baggage', task: 'Hand over checked bags at the counter.', estimatedMinutes: 10, isOptional: false },
  { id: 'security', order: 6, title: 'Security screening', task: 'Clear the security checkpoint.', estimatedMinutes: 15, isOptional: false },
  { id: 'immigration', order: 7, title: 'Immigration', task: 'Clear passport control for outbound flights.', estimatedMinutes: 18, isOptional: false },
  { id: 'gate', order: 8, title: 'Head to your gate', task: 'Walk to the assigned departure gate.', estimatedMinutes: 8, isOptional: false },
  { id: 'queue', order: 9, title: 'Wait at the gate', task: 'Wait near the gate for boarding.', estimatedMinutes: 10, isOptional: true },
  { id: 'boarding', order: 10, title: 'Board the aircraft', task: 'Board when your group is called.', estimatedMinutes: 6, isOptional: false },
];

export const GUIDE_INSTRUCTIONS: Record<string, Record<string, string[]>> = {
  MAA: {
    arrival: ['Arrive at Chennai International Airport at least 3 hours before an international departure and 2 hours before a domestic flight.', 'Drop-off is on the Departures kerb outside your terminal — autos and cabs can only stop briefly.', 'Keep your booking reference and photo ID ready for the first check.'],
    terminal: ['Your terminal is shown in the guide — T1 handles most international carriers while T2 serves domestic airlines.', 'Follow the blue Departures signs from the kerb; the walk to the check-in hall is about 5 minutes.', 'A covered walkway connects the terminals if you need to switch.'],
    entrance: ['Enter through the Departures entrance with your ticket and passport ready for the first document check.', 'Bags go through an X-ray scanner at the door, so keep laptops and liquids easy to reach.', 'Free trolleys are available just outside the entrance.'],
    checkin: ["Proceed to your airline's check-in row — counters open 3 hours before international departures.", 'Keep your passport, visa and booking reference handy; the agent will print your boarding pass here.', 'Baggage drop closes 60 minutes before international departures, so watch the clock.'],
    baggage: ['Tagged baggage goes on the conveyor at the check-in counter — keep the stub until you collect your bags.', 'Items over 32 kg must be repacked, and lithium battery banks must travel in your cabin bag.', 'Oversize items are dropped at the adjacent bulky-baggage desk.'],
    security: ["Follow 'Departures' signs to Security Screening — Terminal 1.", 'Remove laptops, belts and liquids into the trays before your turn at the X-ray machine.', 'Screening queues are longest between 06:00 and 09:00, so keep documents accessible while you wait.'],
    immigration: ['After security, follow signs to Immigration — Passport Control for outbound passengers.', 'Present your passport and boarding pass at the booth; e-gates are available for eligible passports.', 'Wait behind the yellow line until you are called forward.'],
    gate: ['Your gate is shown when the airline assigns it — walk from immigration toward the gate numbers overhead.', 'Airport maps are posted after immigration; the walk to most gates takes 8–12 minutes.', 'Re-check the departure screens near the gate in case the gate has changed.'],
    queue: ['Find a seat in the gate seating area and keep an eye on the departure screens.', 'Boarding usually starts 40 minutes before departure; queues form by zone group.', 'Toilets and water fountains are signed just behind the seating area.'],
    boarding: ['Have your boarding pass and passport out when your group is called.', 'Walk down the jet bridge and stow your cabin bag overhead or under the seat in front.', 'Crew will direct you to your row; aisle seats should let others pass before you settle in.'],
  },
  DEL: {
    arrival: ['Reach Indira Gandhi International Airport at least 3 hours before international departures.', 'Terminal drop-off is on the elevated Departures forecourt — the kerb lane moves quickly but security outside is strict.', 'Keep ID visible; the first document check happens before you enter the building.'],
    terminal: ['T1 serves domestic low-cost carriers, T2 some domestic flights, and T3 is the main international terminal.', "Follow 'Departures' signage from the kerb; transfers between terminals use the free airport shuttle or the Metro link.", 'Indoor walkways are signposted — allow 15 minutes between T1 and T3.'],
    entrance: ['Enter through the nearest Departures gate and queue for the X-ray and document check.', 'Keep hand baggage light; trolleys are available but must leave the tray area clear.', 'Assistance desks near the entrance help with wheelchair or special-needs requests.'],
    checkin: ["Go to your airline's check-in row — international counters open 48 hours prior and close 60 minutes before departure.", 'Have your passport, visa and booking reference ready; web check-in boarding passes can be scanned directly.', 'Bag drop closes 45 minutes before departure for international flights.'],
    baggage: ['Attach the baggage tag the agent prints and keep the receipt until arrival.', 'Batteries, power banks and loose lithium cells must stay in your cabin baggage.', 'Fragile or odd-size items go to the oversize counter next to the main belts.'],
    security: ["Follow 'Departures' signs to Security Screening — Terminal 3.", 'Laptops and liquids come out into separate trays; remove belts and jackets for the scanner.', 'Peak queues hit 07:00–10:00 — keep your boarding pass in hand while you wait.'],
    immigration: ['Proceed to Immigration — Passport Control after security for outbound passengers.', 'Present passport and boarding pass together; the officer may ask about your destination and return date.', 'Stand behind the marked line and wait for the counter to be free.'],
    gate: ['Overhead screens show your gate — follow the numbered concourse signs once immigration is cleared.', 'T3 concourses are long; use the moving walkways to save time.', 'Confirm the flight on the gate screen before sitting down.'],
    queue: ['Take a seat near your gate and monitor the screens for boarding announcements.', 'Boarding groups are called in order; form the queue only when your group appears.', 'Cafés and restrooms are located behind the seating rows.'],
    boarding: ['Line up with your boarding pass and passport ready when your group is called.', 'Crew scan your pass at the aircraft door and direct you to your seat.', 'Store cabin bags promptly so the aisle clears quickly.'],
  },
  DXB: {
    arrival: ['Aim to arrive 3 hours before international departures from Dubai International.', 'Drop-off is at the Departures forecourt of your terminal — T1 for most carriers, T3 for Emirates.', 'Cabs may pause briefly at the kerb; taxis and the Metro both connect the terminals.'],
    terminal: ['T1 and T3 are connected by the Airport Metro and free inter-terminal buses.', "Follow the 'Departures' signs from the kerb to the check-in hall; the walk is indoors and air-conditioned.", 'Terminal maps are posted every few hundred metres along the concourse.'],
    entrance: ['At the entrance your cabin bags are scanned and your passport may be checked against the flight list.', 'Have your boarding pass ready on your phone or printed.', 'Trolleys are freely available and porter service is offered near the entry doors.'],
    checkin: ['Check-in counters open 3 hours before departure and close 60 minutes prior for international flights.', 'Present your passport; some carriers accept mobile boarding passes for bag drop only.', "Bags must weigh under the fare's allowance — extra kilos are charged at the counter."],
    baggage: ['Hand your bags at the counter belt and keep the claim tag.', 'Power banks must be in cabin baggage and under 100 Wh.', 'Oversize and sports equipment drop is signed from the main hall.'],
    security: ["Follow 'Departures' signs to Security Screening — Terminal 3.", 'Laptops and liquids go into trays; shoes and belts may need removing.', 'After screening you enter the duty-free area — keep your boarding pass visible.'],
    immigration: ['Continue to Immigration — Passport Control for outbound travellers.', 'Present your passport at the e-gate or staffed booth; visas are checked for your destination.', 'Wait behind the floor markings until invited forward.'],
    gate: ['Your gate number appears on the screens after immigration — follow the A/B/C concourse signs.', 'Terminal 3 is vast; the train to Concourse A/B takes about 5 minutes.', 'Double-check the gate screen for any last-minute changes.'],
    queue: ['Relax in the gate seating area and watch the screens for your boarding group.', 'Boarding normally starts 45 minutes before departure.', 'Shops and cafés near the gate are a short walk — return when your group is called.'],
    boarding: ['Have passport and boarding pass ready at the gate desk.', 'Crew scan your pass and you descend the jet bridge to the aircraft.', 'Store cabin luggage quickly and take your assigned seat.'],
  },
  SIN: {
    arrival: ['Reach Changi Airport at least 3 hours before your international flight.', "Drop-off is at your terminal's Departures kerb — terminals are linked by free shuttle and the Skytrain.", 'Terminal 4 passengers should use the dedicated coach or car drop-off zone.'],
    terminal: ['Terminal assignment is shown in your guide; T1, T2 and T3 are a short Skytrain ride apart.', "Follow 'Departures' signs from the kerb — the walk to check-in is indoors and well signed.", 'Transit between terminals takes about 10–15 minutes including security.'],
    entrance: ['Enter the Departures hall and queue for the cabin-baggage scan at the door.', 'Boarding passes can be scanned at the automated gates.', 'Trolleys are free and available at every entrance.'],
    checkin: ["Proceed to your airline's check-in row; counters open 48 hours ahead and close 60 minutes before departure.", 'Self-service kiosks print bag tags if you prefer to drop at the belt.', 'Keep passport and any visa documents ready for inspection.'],
    baggage: ['Attach the bag tag at the kiosk or counter and drop the bag on the belt.', 'Power banks stay with you in the cabin; checked power banks will be removed.', 'Oversize luggage drops at the adjacent counter, signposted from the hall.'],
    security: ["Follow 'Departures' signs to Security Screening — Terminal 1.", 'Place laptops and liquids in trays and remove belts before the scanner.', 'Queue times are posted on screens near the entrance to screening.'],
    immigration: ['Clear Immigration — Passport Control after screening for outbound passengers.', 'Use the automated lanes if your passport is eligible, otherwise join the staffed counters.', 'Have your boarding pass and passport open and ready.'],
    gate: ['Check the screen for your gate and follow the numbered signs along the concourse.', 'Skytrains serve the far gates — boards show which platform to take.', 'Re-confirm your flight number on the gate screen when you arrive.'],
    queue: ['Take a seat near the gate; boarding groups appear on the screen.', "Changi's shops and gardens are signposted a short walk away — stay within hearing of announcements.", 'Return to the gate as soon as your group is called.'],
    boarding: ['Line up when your group is called with passport and boarding pass ready.', 'Crew scan your documents at the door and direct you to your row.', 'Settle quickly and stow your bag so boarding stays on schedule.'],
  },
  LHR: {
    arrival: ['Aim to arrive 3 hours before long-haul departures from Heathrow.', 'Drop-off is on the Departures forecourt of your terminal; the Elizabeth line and Piccadilly line serve the airport.', 'Terminal 5 passengers should follow signs to the correct check-in zone from the kerb.'],
    terminal: ['Your terminal is shown in the guide — T2, T3, T4 and T5 are connected by the free Heathrow Express and Tube link.', "Follow 'Departures' signs to the check-in hall; indoor walks between zones are clearly numbered.", 'Allow 20 minutes to change terminals at peak times.'],
    entrance: ['Enter through the Departures doors and queue for the initial cabin-baggage scan.', 'Staff may check your boarding pass and passport before you reach check-in.', 'Trolleys cost £1 (coin or card) and are returned at the exit.'],
    checkin: ["Go to your airline's check-in zone — long-haul counters close 60 minutes before departure.", 'Use the self-service kiosks to print bag tags if your airline offers them.', 'Keep passport, visa and booking reference in hand for the agent.'],
    baggage: ['Drop tagged bags at the belt; the stub is your proof of check-in.', 'Lithium battery banks are cabin-baggage only and must not be checked in.', 'Oversize and sports equipment go to the adjacent drop point.'],
    security: ["Follow 'Departures' signs to Security Screening — Terminal 5.", 'Laptops and liquids into trays; remove belts, jackets and heavy footwear.', 'Fast-track lanes are available if your fare includes them — check your boarding pass.'],
    immigration: ['After screening, follow signs to Immigration — Passport Control for outbound passengers.', 'Present passport and boarding pass; e-gates are available for eligible nationalities.', 'Wait behind the marked line until the booth is free.'],
    gate: ['Your gate is displayed on the screens; follow the A–Z concourse signs to reach it.', 'The Terminal 5 train takes you to the satellite gates — allow 10 minutes for the transfer.', 'Re-check the gate screen before you sit down.'],
    queue: ['Settle in the gate seating area and watch for your boarding group on the screen.', 'Boarding usually starts 45 minutes before departure.', 'Toilets and cafés are signed behind the seating rows.'],
    boarding: ['Line up with boarding pass and passport ready when your group is called.', 'Crew scan your pass at the aircraft door and point you to your row.', 'Stow cabin bags promptly to keep the aisle clear.'],
  },
};

export const GENERIC_INSTRUCTIONS: Record<string, string[]> = {
  arrival: ['Arrive at the airport at least 2–3 hours before your departure.', 'Use the kerbside drop-off for your terminal and keep your booking reference handy.', 'Allow extra time during peak travel hours.'],
  terminal: ['Check your terminal on the airport screens and follow the signs from the kerb.', 'Transfer shuttles and walkways connect terminals when they are separate buildings.', 'Allow 10–20 minutes for an inter-terminal transfer.'],
  entrance: ['Enter through the Departures doors and queue for the cabin-baggage scan.', 'Keep your passport and boarding pass ready for the first check.', 'Trolleys are available at the entrance.'],
  checkin: ["Proceed to your airline's check-in row — counters typically close 60 minutes before departure.", 'Have passport, visa and booking reference ready for the agent.', 'Self-service kiosks can print bag tags where available.'],
  baggage: ['Attach the printed bag tag and drop your bag on the conveyor.', 'Power banks and lithium batteries must stay in your cabin bag.', 'Oversize items go to the adjacent drop counter.'],
  security: ["Follow 'Departures' signs to Security Screening.", 'Place laptops and liquids in trays and remove belts before the scanner.', 'Queues are longest at peak morning hours.'],
  immigration: ['Follow signs to Immigration — Passport Control for outbound passengers.', 'Present your passport and boarding pass together at the booth.', 'Wait behind the marked line until you are called forward.'],
  gate: ['Check the screens for your gate number and follow the concourse signs.', 'Allow extra time for long walks or a train to a satellite pier.', 'Re-confirm your flight on the gate screen when you arrive.'],
  queue: ['Take a seat near your gate and watch the screens for boarding calls.', 'Boarding groups are called in order — form the queue when yours appears.', 'Toilets and cafés are signposted behind the seating area.'],
  boarding: ['Line up with your boarding pass and passport ready when your group is called.', 'Crew scan your pass at the aircraft door and direct you to your seat.', 'Stow cabin bags promptly so the aisle clears quickly.'],
};

export type DataSource = 'mock' | 'live';

export type CabinClass = 'economy' | 'premium' | 'business' | 'first';

export type TripType = 'oneway' | 'roundtrip' | 'multicity';

export type PassengerType = 'adult' | 'child' | 'infant';

export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
  terminals: string[];
}

export interface AirportRef {
  iata: string;
  city: string;
  name: string;
  timezone: string;
}

export interface Airline {
  code: string;
  name: string;
  color: string;
}

export interface BaggageAllowance {
  cabinKg: number;
  checkedKg: number;
}

export interface FlightSegment {
  id: string;
  airlineCode: string;
  airlineName: string;
  flightNumber: string;
  from: AirportRef;
  to: AirportRef;
  departureAt: string;
  arrivalAt: string;
  durationMin: number;
  stops: number;
  stopAirports: AirportRef[];
  aircraft: string;
  baggage: BaggageAllowance;
  cabin: CabinClass;
  source: DataSource;
}

export interface FlightLeg {
  id: string;
  label: string;
  segments: FlightSegment[];
  durationMin: number;
  stops: number;
}

export interface PriceBreakdown {
  base: number;
  taxes: number;
  fees: number;
  seats: number;
  baggage: number;
  addons: number;
  total: number;
  currency: string;
}

export interface FlightOffer {
  id: string;
  legs: FlightLeg[];
  durationMin: number;
  stops: number;
  price: PriceBreakdown;
  seatsLeft?: number;
  fareBrand: string;
  refundable: boolean;
  source: DataSource;
  estimated: boolean;
  score: number;
}

export interface SearchPassengers {
  adult: number;
  child: number;
  infant: number;
}

export interface FlightSearchQuery {
  tripType: TripType;
  legs: Array<{
    from: string;
    to: string;
    date: string;
  }>;
  passengers: SearchPassengers;
  cabin: CabinClass;
}

export interface PriceCalendarDay {
  date: string;
  price: number;
  currency: string;
  available: boolean;
}

export type SeatKind = 'window' | 'middle' | 'aisle';
export type SeatState = 'available' | 'occupied' | 'unavailable' | 'selected';
export type SeatZone = 'first' | 'business' | 'premium' | 'economy';

export interface Seat {
  id: string;
  label: string;
  row: number;
  kind: SeatKind;
  zone: SeatZone;
  state: Exclude<SeatState, 'selected'>;
  price: number;
  legroom: 'standard' | 'extra';
  nearExit: boolean;
}

export interface SeatSection {
  zone: SeatZone;
  title: string;
  rows: number;
  seatsPerRow: number;
  layout: string;
}

export interface SeatMap {
  flightId: string;
  segmentId: string;
  aircraft: string;
  currency: string;
  sections: SeatSection[];
  seats: Seat[];
  source: DataSource;
}

export interface SelectedSeat {
  segmentId: string;
  passengerIndex: number;
  seatId: string;
  label: string;
  price: number;
  zone: SeatZone;
}

export interface PassengerInput {
  type: PassengerType;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  passportNumber?: string;
  passportExpiry?: string;
  nationality?: string;
  email?: string;
  phone?: string;
}

export interface AddonsSelection {
  extraBaggageKg: number;
  seatSelection: boolean;
  meal: 'none' | 'standard' | 'vegetarian' | 'vegan' | 'halal' | 'kosher';
  specialAssistance: 'none' | 'wheelchair' | 'visual' | 'hearing' | 'medical';
  priorityBoarding: boolean;
  travelInsurance: boolean;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';

export interface BookingPassenger {
  id: string;
  type: PassengerType;
  firstName: string;
  lastName: string;
  seatLabels: string[];
  boardingPassIssued: boolean;
}

export interface Booking {
  id: string;
  reference: string;
  status: BookingStatus;
  createdAt: string;
  tripType: TripType;
  cabin: CabinClass;
  passengers: BookingPassenger[];
  offer: FlightOffer;
  seats: SelectedSeat[];
  addons: AddonsSelection;
  price: PriceBreakdown;
  payment: {
    status: PaymentStatus;
    method: string;
    transactionId?: string;
    paidAt?: string;
  };
  checkInOpensAt?: string;
}

export interface QuoteResponse {
  quoteId: string;
  offer: FlightOffer;
  price: PriceBreakdown;
  seats: SelectedSeat[];
  expiresAt: string;
  source: DataSource;
}

export interface BoardingPass {
  id: string;
  bookingReference: string;
  passengerName: string;
  flightNumber: string;
  airlineName: string;
  from: string;
  to: string;
  seat: string;
  gate: string | null;
  terminal: string | null;
  boardingAt: string;
  departureAt: string;
  group: string;
  qrPayload: string;
}

export type JourneyStageId =
  | 'arrival'
  | 'terminal'
  | 'entrance'
  | 'checkin'
  | 'baggage'
  | 'security'
  | 'immigration'
  | 'gate'
  | 'queue'
  | 'boarding';

export interface JourneyStage {
  id: JourneyStageId;
  order: number;
  title: string;
  task: string;
  instructions: string[];
  location: string | null;
  estimatedMinutes: number;
  isOptional: boolean;
  source: 'booking' | 'airport_data' | 'signage';
  limitation?: string;
}

export interface JourneyProgress {
  bookingId: string;
  airport: string;
  terminal: string | null;
  completed: JourneyStageId[];
  updatedAt: string;
}

export interface GuideResponse {
  airport: { iata: string; name: string; city: string; terminals: string[] };
  terminal: string | null;
  bookingReference: string | null;
  flightNumber: string | null;
  gate: string | null;
  counter: string | null;
  boardingAt: string | null;
  stages: JourneyStage[];
  progress: JourneyProgress | null;
  limitations: string[];
  source: 'mock' | 'live';
}

export type FacilityCategory =
  | 'hotel'
  | 'lounge'
  | 'dining'
  | 'shopping'
  | 'wellness'
  | 'worship'
  | 'services'
  | 'medical';

export interface AirportFacility {
  id: string;
  airport: string;
  name: string;
  category: FacilityCategory;
  terminal: string;
  location: string;
  description: string;
  priceMin?: number;
  currency: string;
  openingHours: string;
  openNow: boolean;
  distanceM?: number;
  walkMin?: number;
  bookingSupported: boolean;
  rating?: number;
}

export type TrackingStatus =
  | 'scheduled'
  | 'boarding'
  | 'departed'
  | 'enroute'
  | 'landing'
  | 'landed'
  | 'delayed'
  | 'cancelled';

export interface TrackingUpdate {
  at: string;
  status: TrackingStatus;
  message: string;
}

export interface FlightTracking {
  flightId: string;
  flightNumber: string;
  airlineName: string;
  status: TrackingStatus;
  source: DataSource;
  live: boolean;
  scheduledDeparture: string;
  scheduledArrival: string;
  estimatedDeparture?: string;
  estimatedArrival?: string;
  gate?: string | null;
  terminal?: string | null;
  baggageBelt?: string | null;
  delayMin?: number;
  progress: number;
  aircraftPosition?: { lat: number; lng: number } | null;
  origin: AirportRef;
  destination: AirportRef;
  route: Array<{ lat: number; lng: number }>;
  updates: TrackingUpdate[];
}

export type NotificationType =
  | 'booking_confirmed'
  | 'checkin_available'
  | 'checkin_reminder'
  | 'gate_assigned'
  | 'gate_changed'
  | 'boarding_started'
  | 'final_call'
  | 'flight_delayed'
  | 'flight_cancelled'
  | 'flight_landed'
  | 'baggage_updated';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  href?: string;
}

export interface NotificationPreferences {
  push: boolean;
  email: boolean;
  gateChanges: boolean;
  boarding: boolean;
  delays: boolean;
  promotions: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface UserPreferences {
  currency: string;
  language: string;
  cabin: CabinClass;
  distanceUnit: 'km' | 'mi';
  accessibility: {
    reduceMotion: boolean;
    largeText: boolean;
    highContrast: boolean;
    voiceInstructions: boolean;
  };
  notifications: NotificationPreferences;
  favouriteAirlines: string[];
}

export interface SavedPassenger {
  id: string;
  type: PassengerType;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  passportNumber?: string;
  nationality?: string;
}

export interface SavedFlight {
  id: string;
  offerId: string;
  flightNumber: string;
  routeLabel: string;
  departureAt: string;
  price: number;
  currency: string;
  createdAt: string;
}

export interface AiRecommendation {
  id: string;
  facilityId?: string;
  title: string;
  reason: string;
  category: FacilityCategory | 'transit';
  minutesNeeded: number;
  returnBufferMinutes: number;
  priceLabel?: string;
}

export interface WaitingAdvice {
  source: DataSource;
  model: string;
  airport: string;
  terminal: string;
  availableMinutes: number;
  bufferMinutes: number;
  usableMinutes: number;
  boardingAt: string;
  gate: string | null;
  recommendations: AiRecommendation[];
  safetyNote: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

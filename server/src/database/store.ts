import type {
  AddonsSelection,
  AppNotification,
  Booking,
  FlightOffer,
  FlightSearchQuery,
  JourneyProgress,
  NotificationPreferences,
  PassengerInput,
  PriceBreakdown,
  SavedFlight,
  SavedPassenger,
  SelectedSeat,
  User,
  UserPreferences,
} from '../types.js';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  preferences: UserPreferences;
  passengers: SavedPassenger[];
}

export interface StoredSearch {
  id: string;
  query: FlightSearchQuery;
  offers: FlightOffer[];
  userId: string | null;
  createdAt: string;
  expiresAt: number;
}

export interface StoredQuote {
  id: string;
  userId: string;
  searchId: string;
  offerId: string;
  offer: FlightOffer;
  seats: SelectedSeat[];
  price: PriceBreakdown;
  addons: AddonsSelection;
  passengers: PassengerInput[];
  tripType: FlightSearchQuery['tripType'];
  createdAt: string;
  expiresAt: number;
}

export interface SeatHold {
  quoteId: string;
  expiresAt: number;
}

export interface StoredBooking {
  booking: Booking;
  userId: string;
  gate: string;
  terminal: string;
  counter: string;
}

export interface OutboxMessage {
  id: string;
  to: string;
  subject: string;
  body: string;
  kind: string;
  createdAt: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  push: true,
  email: true,
  gateChanges: true,
  boarding: true,
  delays: true,
  promotions: false,
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  currency: 'INR',
  language: 'en',
  cabin: 'economy',
  distanceUnit: 'km',
  accessibility: {
    reduceMotion: false,
    largeText: false,
    highContrast: false,
    voiceInstructions: true,
  },
  notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES },
  favouriteAirlines: [],
};

export const SEARCH_TTL_MS = 30 * 60_000;
export const QUOTE_TTL_MS = 10 * 60_000;

class Store {
  readonly users = new Map<string, UserRecord>();
  readonly usersByEmail = new Map<string, string>();
  readonly searches = new Map<string, StoredSearch>();
  readonly quotes = new Map<string, StoredQuote>();
  readonly seatHolds = new Map<string, SeatHold>();
  readonly bookedSeats = new Map<string, Set<string>>();
  readonly bookings = new Map<string, StoredBooking>();
  readonly bookingsByUser = new Map<string, Set<string>>();
  readonly savedFlights = new Map<string, SavedFlight[]>();
  readonly notifications = new Map<string, AppNotification[]>();
  readonly journeyProgress = new Map<string, JourneyProgress>();
  readonly outbox: OutboxMessage[] = [];

  sweepExpired(now = Date.now()): void {
    for (const [searchId, search] of this.searches) {
      if (search.expiresAt <= now) this.searches.delete(searchId);
    }
    for (const [quoteId, quote] of this.quotes) {
      if (quote.expiresAt <= now) {
        this.quotes.delete(quoteId);
        this.releaseHoldsForQuote(quoteId);
      }
    }
    for (const [key, hold] of this.seatHolds) {
      if (hold.expiresAt <= now) this.seatHolds.delete(key);
    }
  }

  releaseHoldsForQuote(quoteId: string): void {
    for (const [key, hold] of this.seatHolds) {
      if (hold.quoteId === quoteId) this.seatHolds.delete(key);
    }
  }

  releaseHoldsForUser(userId: string): void {
    for (const [key, hold] of this.seatHolds) {
      const quote = this.quotes.get(hold.quoteId);
      if (quote && quote.userId === userId) this.seatHolds.delete(key);
    }
  }

  commitHoldsForQuote(quoteId: string): void {
    for (const [key, hold] of this.seatHolds) {
      if (hold.quoteId !== quoteId) continue;
      const separator = key.indexOf(':');
      const segmentId = key.slice(0, separator);
      const seatId = key.slice(separator + 1);
      let seats = this.bookedSeats.get(segmentId);
      if (!seats) {
        seats = new Set<string>();
        this.bookedSeats.set(segmentId, seats);
      }
      seats.add(seatId);
      this.seatHolds.delete(key);
    }
  }

  releaseSeats(seats: SelectedSeat[]): void {
    for (const seat of seats) {
      this.bookedSeats.get(seat.segmentId)?.delete(seat.seatId);
    }
  }

  isSeatBooked(segmentId: string, seatId: string): boolean {
    return this.bookedSeats.get(segmentId)?.has(seatId) ?? false;
  }

  holdForSeat(segmentId: string, seatId: string): SeatHold | undefined {
    return this.seatHolds.get(`${segmentId}:${seatId}`);
  }

  setHold(segmentId: string, seatId: string, hold: SeatHold): void {
    this.seatHolds.set(`${segmentId}:${seatId}`, hold);
  }
}

export const store = new Store();

setInterval(() => {
  store.sweepExpired();
}, 60_000).unref();

export function toPublicUser(record: UserRecord): User {
  return {
    id: record.id,
    email: record.email,
    firstName: record.firstName,
    lastName: record.lastName,
    createdAt: record.createdAt,
  };
}

export function findUserByEmail(email: string): UserRecord | undefined {
  const id = store.usersByEmail.get(email.trim().toLowerCase());
  return id ? store.users.get(id) : undefined;
}

export function notificationsFor(userId: string): AppNotification[] {
  return store.notifications.get(userId) ?? [];
}

export function pushNotification(userId: string, notification: AppNotification): void {
  const list = store.notifications.get(userId) ?? [];
  list.unshift(notification);
  store.notifications.set(userId, list);
}

export function bookingByReference(reference: string): StoredBooking | undefined {
  return store.bookings.get(reference.toUpperCase());
}

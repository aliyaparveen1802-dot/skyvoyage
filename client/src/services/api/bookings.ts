import { apiFetch } from './client';
import type {
  AddonsSelection,
  Booking,
  FlightSearchQuery,
  PassengerInput,
  QuoteResponse,
} from '@/types';

export interface SeatSelectionInput {
  segmentId: string;
  passengerIndex: number;
  seatId: string;
}

export interface QuoteRequest {
  searchId: string;
  offerId: string;
  seats: SeatSelectionInput[];
  addons: AddonsSelection;
  passengers: PassengerInput[];
}

export interface ConfirmPaymentRequest {
  method: 'card' | 'wallet';
  card?: {
    number: string;
    name: string;
    expiry: string;
    cvc: string;
  };
}

export interface ConfirmPaymentResponse {
  booking: Booking;
  verification: {
    verified: boolean;
    verifiedBy: string;
    provider: string;
    note: string;
  };
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

export const bookingsApi = {
  quote: (input: QuoteRequest) => apiFetch<QuoteResponse>('/bookings/quote', { method: 'POST', body: input }),

  confirmPayment: (quoteId: string, input: ConfirmPaymentRequest) =>
    apiFetch<ConfirmPaymentResponse>(`/bookings/${quoteId}/confirm-payment`, {
      method: 'POST',
      body: input,
    }),

  list: () => apiFetch<{ bookings: Booking[] }>('/bookings'),

  get: (reference: string) => apiFetch<{ booking: Booking }>(`/bookings/${reference}`),

  boardingPasses: (reference: string) =>
    apiFetch<{ passes: BoardingPass[] }>(`/bookings/${reference}/boarding-passes`),

  cancel: (reference: string) =>
    apiFetch<{ booking: Booking }>(`/bookings/${reference}/cancel`, { method: 'POST' }),

  emailTicket: (reference: string) =>
    apiFetch<{ ok: boolean; message: string; queuedTo: string }>(
      `/bookings/${reference}/email-ticket`,
      { method: 'POST' },
    ),

  calendarEvents: (reference: string) =>
    apiFetch<{
      events: Array<{ title: string; start: string; end: string; location: string; description: string }>;
    }>(`/bookings/${reference}/calendar-events`),
};

export type { FlightSearchQuery, AddonsSelection, PassengerInput };

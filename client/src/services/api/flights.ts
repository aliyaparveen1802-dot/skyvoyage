import { apiFetch } from './client';
import type {
  Airport,
  FlightOffer,
  FlightSearchQuery,
  PriceCalendarDay,
  SeatMap,
} from '@/types';

export interface SearchResult {
  searchId: string;
  offers: FlightOffer[];
  source: 'mock' | 'live';
  estimated: boolean;
  generatedAt: string;
}

export interface OfferDetail {
  offer: FlightOffer;
  searchId: string;
}

export const flightsApi = {
  search: (query: FlightSearchQuery) =>
    apiFetch<SearchResult>('/flights/search', { method: 'POST', body: query }),

  offerDetail: (searchId: string, offerId: string) =>
    apiFetch<OfferDetail>(`/flights/search/${searchId}/offers/${offerId}`),

  seatMap: (searchId: string, offerId: string, segmentId: string, passengers: number) =>
    apiFetch<SeatMap>(`/flights/search/${searchId}/offers/${offerId}/segments/${segmentId}/seats`, {
      query: { passengers },
    }),

  priceCalendar: (params: { from: string; to: string; month: string; cabin: string }) =>
    apiFetch<{ days: PriceCalendarDay[]; source: 'mock' | 'live'; estimated: boolean }>(
      '/flights/calendar',
      { method: 'POST', body: params },
    ),

  autocomplete: (q: string) =>
    apiFetch<{ airports: Airport[] }>('/airports', { query: { q } }),
};

import { apiFetch } from './client';
import type {
  AppNotification,
  FlightTracking,
  NotificationPreferences,
  SavedFlight,
} from '@/types';

export const tripsApi = {
  tracking: (flightNumber: string, date?: string) =>
    apiFetch<FlightTracking>('/tracking/flight', { query: { flight: flightNumber, date } }),

  trackingForBooking: (reference: string) =>
    apiFetch<FlightTracking | null>('/tracking/booking', { query: { reference } }),

  notifications: () => apiFetch<{ notifications: AppNotification[]; unread: number }>('/notifications'),

  markRead: (id: string) => apiFetch<{ unread: number }>(`/notifications/${id}/read`, { method: 'POST' }),

  markAllRead: () => apiFetch<{ unread: number }>('/notifications/read-all', { method: 'POST' }),

  notificationPreferences: () => apiFetch<{ preferences: NotificationPreferences }>('/notifications/preferences'),

  updateNotificationPreferences: (preferences: NotificationPreferences) =>
    apiFetch<{ preferences: NotificationPreferences }>('/notifications/preferences', {
      method: 'PUT',
      body: preferences,
    }),

  savedFlights: () => apiFetch<{ flights: SavedFlight[] }>('/saved-flights'),

  saveFlight: (input: { searchId: string; offerId: string }) =>
    apiFetch<{ flights: SavedFlight[]; saved: SavedFlight }>('/saved-flights', {
      method: 'POST',
      body: input,
    }),

  removeSavedFlight: (id: string) =>
    apiFetch<{ flights: SavedFlight[] }>(`/saved-flights/${id}`, { method: 'DELETE' }),

  outbox: () =>
    apiFetch<{
      messages: Array<{
        id: string;
        to: string;
        subject: string;
        body: string;
        kind: string;
        createdAt: string;
      }>;
      note: string;
    }>('/dev/outbox'),
};

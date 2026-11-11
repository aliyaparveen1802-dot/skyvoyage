import { apiFetch } from './client';
import type { AirportFacility, JourneyStage, JourneyProgress, WaitingAdvice } from '@/types';

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

export const airportsApi = {
  guide: (params: { airport: string; bookingReference?: string }) =>
    apiFetch<GuideResponse>('/airport/guide', { query: params }),

  completeStage: (input: { bookingReference: string; airport: string; stageId: string; done: boolean }) =>
    apiFetch<{ progress: JourneyProgress }>('/airport/guide/progress', { method: 'POST', body: input }),

  facilities: (params: { airport: string; category?: string; q?: string }) =>
    apiFetch<{ facilities: AirportFacility[]; source: 'mock' | 'live'; currency: string }>('/airport/facilities', {
      query: params,
    }),

  waitingAdvice: (input: {
    airport: string;
    terminal: string;
    boardingAt: string;
    gate: string | null;
    bookingReference?: string;
  }) => apiFetch<WaitingAdvice>('/ai/waiting-advice', { method: 'POST', body: input }),
};

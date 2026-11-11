import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { airportsApi, type GuideResponse } from '@/services/api/airport';
import { tripsApi } from '@/services/api/trips';
import type { WaitingAdvice } from '@/types';

export function useAirportGuide(params: { airport: string; bookingReference?: string }) {
  return useQuery({
    queryKey: ['guide', params.airport, params.bookingReference ?? null],
    queryFn: (): Promise<GuideResponse> => airportsApi.guide(params),
    enabled: !!params.airport,
    staleTime: 60_000,
  });
}

export function useCompleteStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: airportsApi.completeStage,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['guide', vars.airport] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useFacilities(params: { airport: string; category?: string; q?: string }) {
  return useQuery({
    queryKey: ['facilities', params.airport, params.category ?? 'all', params.q ?? ''],
    queryFn: () => airportsApi.facilities(params),
    enabled: !!params.airport,
    staleTime: 5 * 60_000,
  });
}

export function useWaitingAdvice() {
  return useMutation({
    mutationFn: (input: {
      airport: string;
      terminal: string;
      boardingAt: string;
      gate: string | null;
      bookingReference?: string;
    }): Promise<WaitingAdvice> => airportsApi.waitingAdvice(input),
  });
}

export function useTracking(flightNumber: string | undefined, date?: string) {
  return useQuery({
    queryKey: ['tracking', flightNumber, date ?? null],
    queryFn: () => tripsApi.tracking(flightNumber!, date),
    enabled: !!flightNumber,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useBookingTracking(reference: string | undefined) {
  return useQuery({
    queryKey: ['tracking', 'booking', reference],
    queryFn: () => tripsApi.trackingForBooking(reference!),
    enabled: !!reference,
    refetchInterval: 60_000,
  });
}

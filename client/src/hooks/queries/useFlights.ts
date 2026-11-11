import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { flightsApi, type SearchResult } from '@/services/api/flights';
import type { FlightSearchQuery } from '@/types';

export function useFlightSearch() {
  const qc = useQueryClient();
  return useMutation<SearchResult, Error, FlightSearchQuery>({
    mutationFn: flightsApi.search,
    onSuccess: (data) => {
      qc.setQueryData(['search', data.searchId], data);
    },
  });
}

export function usePriceCalendar(params: { from: string; to: string; month: string; cabin: string } | null) {
  return useQuery({
    queryKey: ['calendar', params],
    queryFn: () => flightsApi.priceCalendar(params!),
    enabled: !!params && !!params.from && !!params.to && !!params.month,
    staleTime: 5 * 60_000,
  });
}

export function useAirportAutocomplete(query: string) {
  return useQuery({
    queryKey: ['airports', query],
    queryFn: () => flightsApi.autocomplete(query),
    enabled: true,
    staleTime: 10 * 60_000,
    placeholderData: (prev) => prev,
  });
}

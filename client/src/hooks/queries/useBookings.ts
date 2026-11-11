import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bookingsApi,
  type ConfirmPaymentRequest,
  type QuoteRequest,
} from '@/services/api/bookings';
import { useAuth } from '@/context/AuthContext';

export function useCreateQuote() {
  return useMutation({
    mutationFn: (input: QuoteRequest) => bookingsApi.quote(input),
  });
}

export function useConfirmPayment(quoteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ConfirmPaymentRequest) => bookingsApi.confirmPayment(quoteId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useBookings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['bookings'],
    queryFn: bookingsApi.list,
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useBooking(reference: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['bookings', reference],
    queryFn: () => bookingsApi.get(reference!),
    enabled: !!reference && !!user,
  });
}

export function useBoardingPasses(reference: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['bookings', reference, 'boarding-passes'],
    queryFn: () => bookingsApi.boardingPasses(reference!),
    enabled: !!reference && !!user,
  });
}

export function useEmailTicket(reference: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => bookingsApi.emailTicket(reference!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useCalendarEvents(reference: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['bookings', reference, 'calendar-events'],
    queryFn: () => bookingsApi.calendarEvents(reference!),
    enabled: !!reference && !!user,
    staleTime: 5 * 60_000,
  });
}

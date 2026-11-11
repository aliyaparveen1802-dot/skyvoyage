import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/services/api/auth';
import { tripsApi } from '@/services/api/trips';
import { useAuth } from '@/context/AuthContext';

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile'],
    queryFn: authApi.me,
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => qc.setQueryData(['profile'], data),
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.updatePreferences,
    onSuccess: (data) => {
      qc.setQueryData(['profile'], data);
      qc.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
    },
  });
}

export function useAddPassenger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.addPassenger,
    onSuccess: (data) => qc.setQueryData(['profile'], data),
  });
}

export function useRemovePassenger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.removePassenger,
    onSuccess: (data) => qc.setQueryData(['profile'], data),
  });
}

export function useSavedFlights() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['saved-flights'],
    queryFn: tripsApi.savedFlights,
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useSaveFlight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tripsApi.saveFlight,
    onSuccess: (data) => qc.setQueryData(['saved-flights'], { flights: data.flights }),
  });
}

export function useRemoveSavedFlight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tripsApi.removeSavedFlight,
    onSuccess: (data) => qc.setQueryData(['saved-flights'], { flights: data.flights }),
  });
}

export function useOutbox() {
  return useQuery({
    queryKey: ['outbox'],
    queryFn: tripsApi.outbox,
    staleTime: 10_000,
  });
}

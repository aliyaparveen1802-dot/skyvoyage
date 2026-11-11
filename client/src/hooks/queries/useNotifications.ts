import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripsApi } from '@/services/api/trips';
import { useAuth } from '@/context/AuthContext';

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications'],
    queryFn: tripsApi.notifications,
    enabled: !!user,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/** Lightweight badge query — shares cache with the full list. */
export function useNotificationsUnread() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications'],
    queryFn: tripsApi.notifications,
    enabled: !!user,
    staleTime: 30_000,
    select: (data) => ({ unread: data.unread }),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tripsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tripsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: tripsApi.notificationPreferences,
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tripsApi.updateNotificationPreferences,
    onSuccess: (data) => {
      qc.setQueryData(['notifications', 'preferences'], data);
    },
  });
}

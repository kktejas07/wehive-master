import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { api, ApiError } from '@/core/api/client';
import type { AppNotification } from '../model/types';

export function useNotificationsViewModel() {
  const qc = useQueryClient();

  const query = useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: ({ signal }) => api<AppNotification[]>('/notifications', { signal }),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const markRead = useMutation<void, ApiError, string>({
    mutationFn: (id) => api<void>(`/notifications/${id}/read`, { method: 'PATCH', body: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation<void, ApiError, void>({
    mutationFn: () => api<void>('/notifications/read-all', { method: 'POST', body: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading: query.isPending,
    error: query.error instanceof ApiError ? query.error.message : (query.error ? String(query.error) : null),
    refetch: query.refetch,
    markRead: markRead.mutateAsync,
    markAllRead: markAllRead.mutateAsync,
  };
}

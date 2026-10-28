import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { api, ApiError } from '@/core/api/client';

import type { UserProfile } from '../model/types';

interface ProfileUpdate { name?: string; phone?: string; }

export type { UserProfile };

export function useProfileViewModel() {
  const qc = useQueryClient();

  const query = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: ({ signal }) => api<UserProfile>('/users/me/profile', { signal }),
  });

  const updateMutation = useMutation<UserProfile, ApiError, ProfileUpdate>({
    mutationFn: (data) => api<UserProfile>('/users/me', { method: 'PATCH', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });

  return {
    profile: query.data ?? null,
    loading: query.isPending,
    error: query.error instanceof ApiError ? query.error.message : (query.error ? String(query.error) : null),
    refetch: query.refetch,
    update: updateMutation.mutateAsync,
    updating: updateMutation.isPending,
    updateError: updateMutation.error?.message ?? null,
  };
}

import { useQuery } from '@tanstack/react-query';

import { trackingApi } from '../model/tracking-api';

export function useMyApplications() {
  const query = useQuery({
    queryKey: ['applications', 'my'],
    queryFn: () => trackingApi.myApplications(),
  });

  return {
    applications: query.data ?? [],
    loading: query.isPending,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

import { useQuery } from '@tanstack/react-query';

import { trackingApi } from '../model/tracking-api';

export function useTracking(id: string) {
  const query = useQuery({
    queryKey: ['track', id],
    queryFn: () => trackingApi.track(id),
    enabled: !!id,
    retry: false,
  });

  return {
    app: query.data ?? null,
    loading: query.isPending,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}

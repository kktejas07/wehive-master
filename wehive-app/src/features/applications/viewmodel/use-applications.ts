import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { applicationsApi } from '../model/applications-api';
import type { ApplicationStatus } from '../model/types';

export function useApplicationsViewModel() {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | undefined>();

  const query = useQuery({
    queryKey: ['applications', statusFilter],
    queryFn: () => applicationsApi.list(1, statusFilter),
  });

  const urgent = (query.data?.items ?? []).filter(
    (a) => a.status === 'docs_pending' || a.status === 'payment_pending',
  );

  return {
    applications: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    loading: query.isPending,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    refreshing: query.isRefetching,
    statusFilter,
    setStatusFilter,
    urgentCount: urgent.length,
  };
}

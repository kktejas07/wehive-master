import { useQuery } from '@tanstack/react-query';

import { paymentsApi } from '../model/payments-api';

export function usePaymentsViewModel() {
  const query = useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentsApi.list(),
  });

  const totalPaid =
    query.data?.items
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount_inr, 0) ?? 0;

  return {
    payments: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    totalPaid,
    loading: query.isPending,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

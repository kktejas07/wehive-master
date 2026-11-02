import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { visaCheckerApi } from '../model/visa-checker';

export function useVisaChecker() {
  const [query, setQuery] = useState('');

  const requirements = useQuery({
    queryKey: ['visa-requirements'],
    queryFn: ({ signal }) => visaCheckerApi.requirements(signal),
    staleTime: 30 * 60_000,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = requirements.data ?? [];
    return q ? list.filter((r) => r.country.toLowerCase().includes(q)) : list;
  }, [requirements.data, query]);

  const sherpa = useMutation({
    mutationFn: ({ destination, nationality }: { destination: string; nationality: string }) =>
      visaCheckerApi.sherpaTrip(destination, nationality),
  });

  return {
    query, setQuery, items: filtered,
    loading: requirements.isPending,
    error: requirements.error ? (requirements.error as Error).message : null,
    refreshing: requirements.isRefetching,
    refresh: () => requirements.refetch(),
    checkTrip: sherpa.mutate,
    tripResult: sherpa.data ?? null,
    tripLoading: sherpa.isPending,
    tripError: sherpa.error ? (sherpa.error as Error).message : null,
  };
}

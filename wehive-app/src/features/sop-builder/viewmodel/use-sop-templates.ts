import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { sopApi, type PersonaliseInput } from '../model/sop-api';

export function useSopTemplates() {
  const [country, setCountry] = useState<string | undefined>();
  const [programType, setProgramType] = useState<string | undefined>();

  const templates = useQuery({
    queryKey: ['sop-templates', country, programType],
    queryFn: ({ signal }) => sopApi.list({ country, program_type: programType }, signal),
    staleTime: 10 * 60_000,
  });

  const filters = useQuery({
    queryKey: ['sop-filters'],
    queryFn: ({ signal }) => sopApi.filters(signal),
    staleTime: 30 * 60_000,
  });

  return {
    items: templates.data ?? [],
    loading: templates.isPending,
    error: templates.error ? (templates.error as Error).message : null,
    refreshing: templates.isRefetching,
    refresh: () => templates.refetch(),
    filters: filters.data ?? null,
    country, setCountry,
    programType, setProgramType,
  };
}

export function useSopDetail(id: string) {
  const detail = useQuery({
    queryKey: ['sop-template', id],
    queryFn: () => sopApi.get(id),
    enabled: !!id,
  });

  return {
    template: detail.data ?? null,
    loading: detail.isPending,
    error: detail.error ? (detail.error as Error).message : null,
  };
}

export function useSopPersonalise() {
  const mutation = useMutation({
    mutationFn: (input: PersonaliseInput) => sopApi.personalise(input),
  });

  return {
    generate: mutation.mutate,
    result: mutation.data ?? null,
    loading: mutation.isPending,
    error: mutation.error ? (mutation.error as Error).message : null,
    reset: mutation.reset,
  };
}

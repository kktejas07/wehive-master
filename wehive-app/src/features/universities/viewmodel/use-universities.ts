import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { universitiesApi, type University } from '@/features/universities/model/universities';

export function useUniversities(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const q = useQuery({
    queryKey: ['universities', debounced, country],
    queryFn: ({ signal }) =>
      universitiesApi.list({ q: debounced || undefined, country: country ?? undefined, limit: 100, sort_by: 'rank' }, signal),
    staleTime: 10 * 60_000,
  });

  const countries = useQuery({
    queryKey: ['university-countries'],
    queryFn: () => universitiesApi.countries(),
    staleTime: 30 * 60_000,
  });

  const items = useMemo(() =>
    (q.data ?? []).map((u: University) => ({
      id: u.id,
      name: u.name,
      country: u.country_name ?? u.country,
      flag: u.flag ?? '',
      rank: u.qs_rank ?? u.rank ?? null,
      tuition: u.tuition_usd ? `$${u.tuition_usd.toLocaleString('en-US')}` : null,
      courses: u.courses?.length ?? 0,
    })),
    [q.data],
  );

  return {
    query, setQuery, country, setCountry, items,
    countries: countries.data ?? [],
    loading: q.isPending, error: q.error ? (q.error as Error).message : null,
    refreshing: q.isRefetching, refresh: () => q.refetch(),
  };
}

export type UniversityRow = ReturnType<typeof useUniversities>['items'][number];

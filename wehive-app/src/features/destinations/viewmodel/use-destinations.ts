import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { destinationsApi, requirementBadge, sortForBrowsing, type Requirement } from '@/features/destinations/model/destinations';

export type DestinationFilter = 'all' | 'easy' | 'evisa' | 'visa';

const FILTERS: Record<DestinationFilter, Requirement[] | null> = {
  all: null,
  easy: ['visa_free', 'on_arrival'],
  evisa: ['evisa', 'evisa_or_on_arrival'],
  visa: ['visa'],
};

/** ViewModel: searchable, filterable destination list. */
export function useDestinations(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [filter, setFilter] = useState<DestinationFilter>('all');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const q = useQuery({
    queryKey: ['destinations', debounced],
    queryFn: ({ signal }) => destinationsApi.list(debounced || undefined, signal),
    staleTime: 10 * 60_000,
  });

  const items = useMemo(() => {
    const allowed = FILTERS[filter];
    const list = sortForBrowsing(q.data ?? []);
    return (allowed ? list.filter((c) => c.processing && allowed.includes(c.processing.requirement)) : list).map((c) => ({
      id: c.id,
      name: c.name,
      flag: c.flag ?? '',
      badge: requirementBadge(c.processing),
      time: c.processing?.time?.short ?? null,
      basis: c.processing?.time?.basis ?? null,
    }));
  }, [q.data, filter]);

  return {
    query, setQuery, filter, setFilter, items,
    loading: q.isPending, error: q.error ? (q.error as Error).message : null,
    refreshing: q.isRefetching, refresh: () => q.refetch(),
  };
}

export type DestinationRow = ReturnType<typeof useDestinations>['items'][number];

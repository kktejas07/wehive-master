import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { eventsApi } from '@/features/events/model/events-api';

export function useEvents() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const q = useQuery({
    queryKey: ['events', debounced],
    queryFn: ({ signal }) => eventsApi.list(debounced ? { q: debounced } : undefined, signal),
    staleTime: 5 * 60_000,
  });

  const items = useMemo(() => {
    const events = q.data ?? [];
    return events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description ?? '',
      date: e.date ?? null,
      location: e.location ?? e.country ?? '',
      category: e.category ?? null,
      image: e.image ?? null,
      organizer: e.organizer ?? '',
    }));
  }, [q.data]);

  return {
    query, setQuery, items,
    loading: q.isPending, error: q.error ? (q.error as Error).message : null,
    refreshing: q.isRefetching, refresh: () => q.refetch(),
  };
}

export type EventRow = ReturnType<typeof useEvents>['items'][number];

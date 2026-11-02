import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { resourcesApi } from '@/features/resources/model/resources-api';

export function useResources() {
  const [category, setCategory] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['resources'],
    queryFn: ({ signal }) => resourcesApi.list(signal),
    staleTime: 10 * 60_000,
  });

  const items = q.data ?? [];
  const categories = useMemo(() => [...new Set(items.map((r) => r.category).filter(Boolean))] as string[], [items]);
  const filtered = useMemo(() => (category ? items.filter((r) => r.category === category) : items), [items, category]);

  return {
    items: filtered, categories, category, setCategory,
    loading: q.isPending, error: q.error ? (q.error as Error).message : null,
    refreshing: q.isRefetching, refresh: () => q.refetch(),
  };
}

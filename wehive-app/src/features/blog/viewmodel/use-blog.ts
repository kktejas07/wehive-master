import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { blogApi } from '@/features/blog/model/blog-api';

export function useBlog() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const q = useQuery({
    queryKey: ['blog', debounced],
    queryFn: ({ signal }) => blogApi.list(debounced || undefined, signal),
    staleTime: 5 * 60_000,
  });

  const items = useMemo(() => {
    const posts = q.data ?? [];
    return posts.map((p) => ({
      id: p.id,
      title: p.title,
      excerpt: p.excerpt ?? '',
      cover: p.cover_image ?? null,
      author: p.author ?? 'WeHive',
      date: p.published_at ?? null,
      tags: p.tags ?? [],
    }));
  }, [q.data]);

  return {
    query, setQuery, items,
    loading: q.isPending, error: q.error ? (q.error as Error).message : null,
    refreshing: q.isRefetching, refresh: () => q.refetch(),
  };
}

export type BlogRow = ReturnType<typeof useBlog>['items'][number];

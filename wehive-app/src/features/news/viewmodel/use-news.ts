import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { newsApi, preview, relativeTime } from '@/features/news/model/news';

/** ViewModel: paged visa and travel news, newest first. */
export function useNews(limit = 20) {
  const q = useInfiniteQuery({
    queryKey: ['news', limit],
    queryFn: ({ pageParam }) => newsApi.page(pageParam, limit),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    staleTime: 5 * 60_000,
  });

  const items = useMemo(
    () => (q.data?.pages ?? []).flatMap((p) => p.items).map((n) => ({
      id: n.id,
      title: n.title,
      summary: preview(n.content),
      source: n.source_name ?? '',
      when: relativeTime(n.published_at ?? n.date),
      category: n.category ?? '',
      url: n.source_url ?? null,
    })),
    [q.data],
  );

  return {
    items,
    loading: q.isPending,
    error: q.error ? (q.error as Error).message : null,
    refreshing: q.isRefetching && !q.isFetchingNextPage,
    refresh: () => q.refetch(),
    hasMore: !!q.hasNextPage,
    loadingMore: q.isFetchingNextPage,
    loadMore: () => q.fetchNextPage(),
  };
}

export type NewsRow = ReturnType<typeof useNews>['items'][number];

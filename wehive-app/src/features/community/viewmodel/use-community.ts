import { useQuery } from '@tanstack/react-query';

import { communityApi } from '@/features/community/model/community-api';

export function useCommunity() {
  const stories = useQuery({
    queryKey: ['community', 'stories'],
    queryFn: ({ signal }) => communityApi.stories(signal),
    staleTime: 5 * 60_000,
  });

  const interviews = useQuery({
    queryKey: ['community', 'interviews'],
    queryFn: ({ signal }) => communityApi.interviews(signal),
    staleTime: 5 * 60_000,
  });

  const questions = useQuery({
    queryKey: ['community', 'questions'],
    queryFn: ({ signal }) => communityApi.interviewQuestions(signal),
    staleTime: 5 * 60_000,
  });

  const loading = stories.isPending || interviews.isPending;
  const error = stories.error ?? interviews.error;

  return {
    stories: stories.data ?? [],
    interviews: interviews.data ?? [],
    questions: questions.data ?? [],
    loading,
    error: error ? (error as Error).message : null,
    refreshing: stories.isRefetching || interviews.isRefetching,
    refresh: () => { stories.refetch(); interviews.refetch(); questions.refetch(); },
  };
}

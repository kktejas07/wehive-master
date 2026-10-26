import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { applicationsApi } from '../model/applications-api';

export function useApplicationDetailViewModel(id: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationsApi.detail(id),
    enabled: !!id,
  });

  const messageMutation = useMutation({
    mutationFn: (text: string) => applicationsApi.sendMessage(id, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['application', id] }),
  });

  return {
    application: query.data ?? null,
    loading: query.isPending,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    sendMessage: messageMutation.mutateAsync,
    sendingMessage: messageMutation.isPending,
  };
}

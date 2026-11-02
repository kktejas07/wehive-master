import { api } from '@/core/api/client';

import type { PersonaliseInput, PersonaliseResult, SopFilters, SopTemplate } from './types';

export type * from './types';

export const sopApi = {
  list: (params?: { country?: string; program_type?: string; category?: string }, signal?: AbortSignal) =>
    api<SopTemplate[]>('/sop-templates', { query: params, signal }),

  filters: (signal?: AbortSignal) =>
    api<SopFilters>('/sop-templates/filters', { signal }),

  get: (id: string) =>
    api<SopTemplate>(`/sop-templates/${encodeURIComponent(id)}`),

  personalise: (input: PersonaliseInput) =>
    api<PersonaliseResult>('/sop-templates/personalise', { method: 'POST', body: input }),
};

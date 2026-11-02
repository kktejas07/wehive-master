import { api } from '@/core/api/client';

import type { University, UniversityCountry } from './types';

export type * from './types';

export const universitiesApi = {
  list: (params?: { q?: string; country?: string; limit?: number; skip?: number; sort_by?: string }, signal?: AbortSignal) =>
    api<University[]>('/universities', { query: params, signal }),
  get: (id: string) => api<University>(`/universities/${encodeURIComponent(id)}`),
  countries: () => api<UniversityCountry[]>('/universities/countries/list'),
  courses: () => api<string[]>('/universities/courses/list'),
};

import { api } from '@/core/api/client';

import type { Country } from './types';

export * from './requirement';
export type * from './types';

/** Model: destination data from the WeHive API. */
export const destinationsApi = {
  list: (q?: string, signal?: AbortSignal) => api<Country[]>('/countries', { query: { q }, signal }),
  get: (id: string) => api<Country>(`/countries/${encodeURIComponent(id)}`),
};

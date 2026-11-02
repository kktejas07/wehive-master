import { api } from '@/core/api/client';

import type { GlobalEvent } from './types';

export const eventsApi = {
  list: (params?: { q?: string; sort?: string; order?: string; limit?: number; skip?: number }, signal?: AbortSignal) =>
    api<GlobalEvent[]>('/global-events', { query: params, signal }),
};

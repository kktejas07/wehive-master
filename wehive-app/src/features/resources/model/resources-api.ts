import { api } from '@/core/api/client';

import type { Resource } from './types';

export const resourcesApi = {
  list: (signal?: AbortSignal) => api<Resource[]>('/resources', { signal }),
};

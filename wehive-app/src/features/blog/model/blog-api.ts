import { api } from '@/core/api/client';

import type { BlogPost } from './types';

export const blogApi = {
  list: (q?: string, signal?: AbortSignal) =>
    api<BlogPost[]>('/blogs', { query: { q }, signal }),
  get: (id: string) => api<BlogPost>(`/blogs/${encodeURIComponent(id)}`),
};

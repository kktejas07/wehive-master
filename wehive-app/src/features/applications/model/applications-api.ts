import { api } from '@/core/api/client';

import type { ApplicationDetail, ApplicationsPage } from './types';

export const applicationsApi = {
  list: (page = 1, status?: string) =>
    api<ApplicationsPage>('/users/me/applications', { query: { page, per_page: 20, status } }),

  detail: (id: string) =>
    api<ApplicationDetail>(`/users/me/applications/${encodeURIComponent(id)}`),

  sendMessage: (id: string, text: string) =>
    api<void>(`/users/me/applications/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      body: { text },
    }),
};

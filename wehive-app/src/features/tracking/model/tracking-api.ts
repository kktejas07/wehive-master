import { api } from '@/core/api/client';

import type { Application, TrackedApplication } from './types';

export type * from './types';

export const trackingApi = {
  /** Public: look up a single application by ID. */
  track: (id: string) => api<TrackedApplication>(`/public/track/${encodeURIComponent(id)}`),
  /** Authenticated: list the current user's applications. */
  myApplications: () => api<Application[]>('/applications/my'),
};

import { api } from '@/core/api/client';

import type { SherpaTrip, VisaRequirement } from './types';

export type * from './types';

export const visaCheckerApi = {
  requirements: (signal?: AbortSignal) =>
    api<VisaRequirement[]>('/visa-requirements', { signal }),

  sherpaTrip: (destination: string, nationality: string, signal?: AbortSignal) =>
    api<SherpaTrip>('/visa-providers/sherpa/trips', {
      method: 'POST',
      body: { destination, nationality },
      signal,
    }),
};

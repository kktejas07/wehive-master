import { api } from '@/core/api/client';

import type { CountryIntake } from './types';

export const intakeApi = {
  calendar: (signal?: AbortSignal) => api<CountryIntake[]>('/intakes/calendar', { signal }),
};

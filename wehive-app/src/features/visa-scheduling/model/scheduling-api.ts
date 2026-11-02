import { api } from '@/core/api/client';

import type { Appointment, AppointmentSlot, Embassy, PrepItem, UserApplication } from './types';

export type * from './types';

export const schedulingApi = {
  myApplications: (signal?: AbortSignal) =>
    api<UserApplication[]>('/users/me/applications', { signal }),

  slots: (countryId: string, signal?: AbortSignal) =>
    api<AppointmentSlot[]>(`/visa-scheduling/slots/${encodeURIComponent(countryId)}`, { signal }),

  book: (body: { application_id: string; slot_id: string; date: string; time: string; embassy: string; city: string }) =>
    api<{ ok: boolean }>('/visa-scheduling/book', { method: 'POST', body }),

  myAppointments: (signal?: AbortSignal) =>
    api<Appointment[]>('/visa-scheduling/my-appointments', { signal }),

  embassies: (countryId: string, signal?: AbortSignal) =>
    api<Embassy[]>(`/visa-scheduling/embassies/${encodeURIComponent(countryId)}`, { signal }),

  preparation: (countryId: string, signal?: AbortSignal) =>
    api<PrepItem[]>(`/visa-scheduling/preparation/${encodeURIComponent(countryId)}`, { signal }),
};

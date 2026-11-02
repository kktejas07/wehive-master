import { api } from '@/core/api/client';

export type * from './types';

export const assessmentApi = {
  submit: (body: { name: string; surname: string; email: string; phone: string | null; message: string; source: string }) =>
    api<{ ok: boolean }>('/leads', { method: 'POST', body }),
};

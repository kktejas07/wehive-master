import { api } from '@/core/api/client';

import type { PaymentsPage } from './types';

export const paymentsApi = {
  list: (page = 1) =>
    api<PaymentsPage>('/users/me/payments', { query: { page, per_page: 20 } }),
};

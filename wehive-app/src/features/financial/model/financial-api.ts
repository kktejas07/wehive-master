import { api } from '@/core/api/client';

export interface FinancialInsight {
  title: string;
  body: string;
  category?: string;
}

export const financialApi = {
  insights: (query: string, signal?: AbortSignal) =>
    api<FinancialInsight>('/financials/insights', { method: 'POST', body: { query }, signal }),
};

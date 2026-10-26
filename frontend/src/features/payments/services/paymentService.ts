import { adminClient } from '../../../lib/admin';

export async function listPayments(
  token: string,
  params?: { status?: string; q?: string; limit?: number; skip?: number }
) {
  const r = await adminClient(token).get('/payments', { params });
  return r.data as { items: unknown[]; total: number };
}

export async function refundPayment(
  token: string,
  paymentId: string,
  body: { reason: string; amount?: number }
) {
  const r = await adminClient(token).post(`/payments/${paymentId}/refund`, body);
  return r.data;
}

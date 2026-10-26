import { adminClient } from '../../../lib/admin';

export async function listLeads(
  token: string,
  params?: { status?: string; purpose?: string; branch?: string; q?: string; limit?: number; skip?: number }
) {
  const r = await adminClient(token).get('/leads', { params });
  return r.data as { items: unknown[]; total: number; new: number };
}

export async function patchLead(token: string, leadId: string, body: Record<string, unknown>) {
  const r = await adminClient(token).patch(`/leads/${leadId}`, body);
  return r.data;
}

import { adminClient } from '../lib/admin';

export async function listUsers(
  token: string,
  params?: { q?: string; role?: string; limit?: number; skip?: number }
) {
  const r = await adminClient(token).get('/users', { params });
  return r.data as { items: unknown[]; total: number };
}

export async function patchUser(token: string, userId: string, body: Record<string, unknown>) {
  const r = await adminClient(token).patch(`/users/${userId}`, body);
  return r.data;
}

export async function deleteUser(token: string, userId: string) {
  const r = await adminClient(token).delete(`/users/${userId}`);
  return r.data;
}

export async function sendReminder(token: string, userId: string, template: string) {
  const r = await adminClient(token).post(`/users/${userId}/send-reminder`, { template, note: null });
  return r.data;
}

export async function bulkRemind(token: string, userIds: string[], template = 'generic') {
  const r = await adminClient(token).post('/users/bulk-remind', { user_ids: userIds, template });
  return r.data;
}

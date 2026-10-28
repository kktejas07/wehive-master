import { adminClient } from '../../../lib/admin';

export async function getHealth(token: string) {
  const r = await adminClient(token).get('/health');
  return r.data;
}

export async function getApplicationPipeline(token: string) {
  const r = await adminClient(token).get('/monitoring/application-pipeline');
  return r.data;
}

export async function getInactiveUsers(token: string, days: number, limit = 50) {
  const r = await adminClient(token).get('/monitoring/inactive-users', { params: { days, limit } });
  return r.data as { items: unknown[] };
}

export async function bulkRemindInactive(token: string, userIds: string[], template = 'generic') {
  const r = await adminClient(token).post('/monitoring/bulk-remind', { user_ids: userIds, template });
  return r.data;
}

export async function getAnomalies(token: string) {
  const r = await adminClient(token).get('/ai/anomalies');
  return r.data;
}

export async function getMonitoringDashboard(token: string) {
  const r = await adminClient(token).get('/monitoring/dashboard');
  return r.data;
}

export async function listAdmins(token: string) {
  const r = await adminClient(token).get('/admin-auth/admins');
  return r.data as unknown[];
}

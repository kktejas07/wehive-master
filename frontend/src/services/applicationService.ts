import { adminClient } from '../lib/admin';

export async function listApplications(
  token: string,
  params?: { status?: string; q?: string; assigned?: string; limit?: number; skip?: number }
) {
  const r = await adminClient(token).get('/applications', { params });
  return r.data as { items: unknown[]; total: number };
}

export async function patchApplication(
  token: string,
  appId: string,
  body: Record<string, unknown>
) {
  const r = await adminClient(token).patch(`/applications/${appId}`, body);
  return r.data;
}

export async function updateApplicationStatus(
  token: string,
  appId: string,
  status: string,
  note?: string
) {
  const r = await adminClient(token).post(`/admin/applications/${appId}/status`, { status, note });
  return r.data;
}

export async function getApplicationCase(token: string, appId: string) {
  const r = await adminClient(token).get(`/applications/${appId}/case`);
  return r.data;
}

export async function getDocumentFile(token: string, appId: string, docId: string) {
  const r = await adminClient(token).get(`/applications/${appId}/documents/${docId}/file`, {
    responseType: 'blob',
  });
  return r.data as Blob;
}

export async function updateDocumentStatus(
  token: string,
  appId: string,
  docId: string,
  status: string,
  reason?: string
) {
  const r = await adminClient(token).patch(`/applications/${appId}/documents/${docId}`, {
    status,
    ...(reason ? { reason } : {}),
  });
  return r.data;
}

export async function postMessage(token: string, appId: string, text: string) {
  const r = await adminClient(token).post(`/applications/${appId}/messages`, { text });
  return r.data;
}

export async function postInternalNote(token: string, appId: string, text: string) {
  const r = await adminClient(token).post(`/applications/${appId}/internal-notes`, { text });
  return r.data;
}

export async function assignApplication(
  token: string,
  appId: string,
  staffId: string | null
) {
  const r = await adminClient(token).patch(`/applications/${appId}/assign`, { staff_id: staffId });
  return r.data;
}

export async function getStaffWorkload(token: string) {
  const r = await adminClient(token).get('/staff/workload');
  return r.data as { staff: unknown[] };
}

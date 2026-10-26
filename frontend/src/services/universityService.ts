import { adminClient } from '../lib/admin';

export async function getUniversityStats(token: string) {
  const r = await adminClient(token).get('/universities/stats');
  return r.data;
}

export async function listUniversities(
  token: string,
  params?: { q?: string; country?: string; limit?: number; skip?: number }
) {
  const r = await adminClient(token).get('/universities', { params });
  return r.data as { items: unknown[]; total: number };
}

export async function patchUniversity(
  token: string,
  universityId: string,
  patch: Record<string, unknown>
) {
  const r = await adminClient(token).patch(`/universities/${universityId}`, patch);
  return r.data;
}

export async function seedFromCsv(token: string, formData: FormData) {
  const r = await adminClient(token).post('/universities/seed-from-csv', formData);
  return r.data;
}

export async function enrichFromCsv(token: string, formData: FormData) {
  const r = await adminClient(token).post('/universities/enrich-from-csv', formData);
  return r.data;
}

export async function enrichScorecard(token: string, formData: FormData) {
  const r = await adminClient(token).post('/universities/enrich-scorecard', formData);
  return r.data;
}

export async function reSeedUniversities(token: string) {
  const r = await adminClient(token).post('/universities/re-seed');
  return r.data;
}

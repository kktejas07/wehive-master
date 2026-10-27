import { adminClient } from '../../../lib/admin';

export async function listCountries(
  token: string,
  params?: { q?: string; limit?: number; skip?: number }
) {
  const r = await adminClient(token).get('/countries', { params });
  return r.data as { items: unknown[]; total: number };
}

export async function patchCountry(
  token: string,
  countryId: string,
  patch: Record<string, unknown>
) {
  const r = await adminClient(token).patch(`/countries/${countryId}`, patch);
  return r.data;
}

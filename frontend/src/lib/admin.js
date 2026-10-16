import axios from 'axios';
import { API } from '../context/AuthContext';
export { inr, STATUS_COLORS } from './utils';

const ADMIN_TOKEN_KEY = 'wehive_admin_token';

// Admin calls only ever use the admin session token (never the student `wehive_token`).
export function adminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

// AdminAuthProvider registers the handler; any admin-token request that comes back 401
// ends the admin session (the protected route then sends the user to /admin/login?next=…).
let onUnauthorized = null;
export function setAdminUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

function sentAdminToken(config) {
  const h = config?.headers;
  const auth = typeof h?.get === 'function' ? h.get('Authorization') : h?.Authorization;
  const tok = adminToken();
  return !!tok && auth === `Bearer ${tok}`;
}

export function handleAdminAuthError(error) {
  if (error?.response?.status === 401 && sentAdminToken(error.config)) onUnauthorized?.();
  return Promise.reject(error);
}

function client(baseURL, passedToken) {
  const token = passedToken || adminToken();
  const instance = axios.create({ baseURL, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  instance.interceptors.response.use(undefined, handleAdminAuthError);
  return instance;
}

export function adminClient(passedToken) {
  return client(`${API}/admin`, passedToken);
}

export function apiClient(passedToken) {
  return client(API, passedToken);
}

// Starts the news/blog/events aggregators. Resolves to a toast payload; a 409
// means a run is already in progress.
export async function runAggregators(passedToken) {
  try {
    await apiClient(passedToken).post('/agents/aggregators/run');
    return { title: 'AI Aggregators Triggered', description: 'Fetching News, Blogs & Events in background.' };
  } catch (e) {
    if (e.response?.status === 409) return { title: 'Already running', description: 'An aggregator run is in progress.' };
    return { title: 'Trigger failed', variant: 'destructive' };
  }
}

export function downloadCsv(passedToken, kind) {
  const token = passedToken || adminToken();
  const url = `${API}/admin/export/${kind}.csv`;
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => {
      if (r.status === 401 && token === adminToken()) onUnauthorized?.();
      if (!r.ok) throw new Error(`Export failed (${r.status})`);
      return r.blob();
    })
    .then((blob) => {
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `wehive-${kind}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    });
}

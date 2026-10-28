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

// Case-management alerts (GET /admin/alerts, /admin/applications/{id}/case).
export const SEVERITY_PILL = {
  critical: 'bg-red-500/15 text-red-300 border-red-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  info: 'bg-blue-500/15 text-blue-200 border-blue-500/30',
};
export const ALERT_KIND_LABEL = {
  stale: 'Stale',
  appointment: 'Appointments',
  travel_soon: 'Travel soon',
  passport_expiring: 'Passport expiring',
  documents_pending: 'Docs to review',
};

// Mirrors admin_auth.role_allows on the server (the server is what actually enforces it):
// everyone can view; "cases" = applications, leads, document review, profile requests;
// "finance" = payments, pricing, promo codes; anything else needs a manager.
const ROLE_AREAS = { support: ['cases'], finance: ['finance'], doc_reviewer: ['review'], viewer: [] };
export function canWrite(admin, area = 'manage') {
  if (!admin) return false;
  const role = admin.admin_role || 'manager';
  if (admin.is_super_admin || role === 'super_admin' || role === 'manager') return true;
  return (ROLE_AREAS[role] || []).includes(area);
}

// Which sidebar sections a role can see. Manager / super_admin see everything.
// Others see a curated list. Returns true if the nav item should be visible.
const ROLE_VISIBLE_TABS = {
  support:      ['overview', 'applications', 'review', 'leads', 'users', 'staff', 'audit', 'health', 'security'],
  finance:      ['overview', 'applications', 'payments', 'pricing', 'promocodes', 'exports', 'audit', 'health', 'security'],
  doc_reviewer: ['overview', 'applications', 'review', 'audit', 'security'],
  viewer:       ['overview', 'applications', 'users', 'leads', 'payments', 'countries', 'pricing', 'events', 'universities', 'programs', 'exports', 'audit', 'health', 'security'],
};
export function canViewTab(admin, tabId) {
  if (!admin) return false;
  const role = admin.admin_role || 'manager';
  if (admin.is_super_admin || role === 'super_admin' || role === 'manager') return true;
  const allowed = ROLE_VISIBLE_TABS[role];
  return allowed ? allowed.includes(tabId) : false;
}

export function adminRole(admin) {
  if (!admin) return null;
  if (admin.is_super_admin) return 'super_admin';
  return admin.admin_role || 'manager';
}

export const ROLE_NAMES = { super_admin: 'Super admin', manager: 'Manager', support: 'Support', finance: 'Finance', doc_reviewer: 'Doc reviewer', viewer: 'Viewer' };

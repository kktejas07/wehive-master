import axios from 'axios';
import { API } from '../context/AuthContext';
export { inr, STATUS_COLORS } from './utils';

const ADMIN_TOKEN_KEY = 'wehive_admin_token';
const USER_TOKEN_KEY = 'wehive_token';

export function preferredAdminToken() {
  return (
    localStorage.getItem(ADMIN_TOKEN_KEY) ||
    localStorage.getItem(USER_TOKEN_KEY) ||
    null
  );
}

export function adminClient(passedToken) {
  const token = passedToken || preferredAdminToken();
  return axios.create({
    baseURL: `${API}/admin`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export function apiClient(passedToken) {
  const token = passedToken || preferredAdminToken();
  return axios.create({
    baseURL: API,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
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
  const token = passedToken || preferredAdminToken();
  const url = `${API}/admin/export/${kind}.csv`;
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => {
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

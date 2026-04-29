import axios from 'axios';
import { API } from '../context/AuthContext';

export function adminClient(token) {
  return axios.create({
    baseURL: `${API}/admin`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export function downloadCsv(token, kind) {
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

export function inr(n) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
  } catch {
    return `₹${n || 0}`;
  }
}

export const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

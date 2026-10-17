import { useEffect, useState, useCallback } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { apiClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import Pagination from './Pagination';
import NewsletterCompose from './NewsletterCompose';
import { useToast } from '../../hooks/use-toast';

const PAGE_SIZE = 50;
const FILTERS = [
  { id: '', label: 'All' },
  { id: 'active', label: 'Confirmed' },
  { id: 'pending', label: 'Awaiting confirmation' },
  { id: 'unsubscribed', label: 'Unsubscribed' },
];
const PILL = {
  active: 'bg-emerald-500/15 text-emerald-300',
  pending: 'bg-amber-500/15 text-amber-300',
  unsubscribed: 'bg-white/10 text-slate-300',
};
const LABEL = { active: 'Confirmed', pending: 'Awaiting confirmation', unsubscribed: 'Unsubscribed' };
const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function NewsletterTab() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState('');
  const [skip, setSkip] = useState(0);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setData(null);
    try {
      const r = await apiClient(token).get('/newsletter/subscribers', {
        params: { status: status || undefined, page: skip / PAGE_SIZE + 1, limit: PAGE_SIZE },
      });
      setData(r.data);
    } catch (e) {
      setData({ items: [], total: 0, counts: {} });
      toast({ title: 'Could not load subscribers', description: e?.response?.data?.detail || e.message });
    }
  }, [token, status, skip, toast]);

  useEffect(() => { load(); }, [load]);

  const counts = data?.counts || {};
  const all = (counts.active || 0) + (counts.pending || 0) + (counts.unsubscribed || 0);

  return (
    <div data-testid="admin-newsletter-tab">
      <AdminHeader
        title="Newsletter"
        subtitle="Write and send newsletters to confirmed subscribers, and see who signed up in the site footer."
      />

      <NewsletterCompose />

      <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Filter subscribers">
        {FILTERS.map((f) => {
          const n = f.id ? counts[f.id] || 0 : all;
          const on = status === f.id;
          return (
            <button
              key={f.id || 'all'}
              role="tab"
              aria-selected={on}
              onClick={() => { setStatus(f.id); setSkip(0); }}
              className={`h-9 px-3.5 rounded-xl text-[13px] font-semibold border transition-colors ${on ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))] text-white' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
            >
              {f.label} <span className="ml-1 tabular-nums opacity-80">{data ? n : '…'}</span>
            </button>
          );
        })}
      </div>

      <Panel className="overflow-x-auto p-0">
        <table className="min-w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-slate-400 bg-white/5">
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">WhatsApp</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Signed up</th>
              <th className="px-5 py-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {data === null && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline text-blue-300" /></td></tr>
            )}
            {data?.items.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                <Mail className="w-5 h-5 inline mr-2" /> No subscribers here yet.
              </td></tr>
            )}
            {data?.items.map((s) => (
              <tr key={s.email} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-5 py-3 font-semibold text-white break-all">{s.email}</td>
                <td className="px-5 py-3 text-slate-300 tabular-nums">{s.whatsapp || '—'}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${PILL[s.status] || PILL.unsubscribed}`}>{LABEL[s.status] || s.status}</span>
                </td>
                <td className="px-5 py-3 text-slate-400 text-[12.5px]">{fmt(s.created_at)}</td>
                <td className="px-5 py-3 text-slate-400 text-[12.5px]">{s.source || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.total > 0 && (
          <div className="px-5 py-3"><Pagination skip={skip} limit={PAGE_SIZE} total={data.total} onPageChange={setSkip} /></div>
        )}
      </Panel>
    </div>
  );
}

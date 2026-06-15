import { useEffect, useState, useCallback } from 'react';
import { Loader2, Search, FileStack, Globe } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, inr, STATUS_COLORS } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

const STATUSES = ['draft', 'submitted', 'in_review', 'approved', 'rejected'];

export default function ApplicationsTab() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setItems(null);
    const r = await adminClient(token).get('/applications', {
      params: { status: status === 'all' ? undefined : status, q: q || undefined, limit: 100 },
    });
    setItems(r.data.items);
    setTotal(r.data.total);
  }, [token, status, q]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (a, newStatus) => {
    setBusy(a.id);
    try {
      await adminClient(token).patch(`/applications/${a.id}`, { status: newStatus });
      toast({ title: `Marked as ${newStatus.replace('_', ' ')}` });
      await load();
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div data-testid="admin-applications-tab">
      <AdminHeader
        title="Applications"
        subtitle={`${total} applications across all users. Update embassy status and track revenue.`}
      />
      <Panel>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              data-testid="admin-apps-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by country code, visa type or app id…"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 focus:border-[hsl(var(--accent))] text-[13.5px] text-white placeholder:text-slate-500 outline-none"
            />
          </div>
          <select
            data-testid="admin-apps-status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-[13.5px] text-white"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </Panel>

      <Panel className="mt-4 overflow-x-auto p-0">
        <table className="min-w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-slate-500 bg-white/5">
              <th className="px-5 py-3">Application</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Travel</th>
              <th className="px-5 py-3">Revenue</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Update</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline text-[hsl(var(--accent))]" /></td></tr>
            )}
            {items?.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                <FileStack className="w-5 h-5 inline mr-2" /> No applications found.
              </td></tr>
            )}
            {items?.map((a) => (
              <tr key={a.id} data-testid={`admin-app-row-${a.id}`} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-5 py-3">
                  <div className="font-bold text-white inline-flex items-center gap-1.5">
                    <span>{a.country?.flag || <Globe className="w-4 h-4 text-slate-400" />}</span>
                    {a.country?.name || a.country_id?.toUpperCase()} · {a.visa_type}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">#{a.id.slice(0, 8).toUpperCase()}</div>
                </td>
                <td className="px-5 py-3 text-slate-300">
                  <div>{a.user?.name || a.primary_applicant?.name || '—'}</div>
                  <div className="text-[12px] text-slate-500">{a.user?.email || a.user?.phone || '—'}</div>
                </td>
                <td className="px-5 py-3 text-slate-400 text-[12.5px]">
                  <div>{a.travel_date || '—'}</div>
                  <div className="text-[11px] text-slate-500">{a.applicants} applicant{a.applicants > 1 ? 's' : ''}</div>
                </td>
                <td className="px-5 py-3 font-bold text-emerald-300">{inr(a.revenue_inr)}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] uppercase tracking-[0.12em] font-bold ${STATUS_COLORS[a.status] || STATUS_COLORS.draft}`}>
                    {(a.status || 'draft').replace('_', ' ')}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end">
                    <select
                      data-testid={`admin-app-status-${a.id}`}
                      disabled={busy === a.id}
                      value={a.status || 'draft'}
                      onChange={(e) => updateStatus(a, e.target.value)}
                      className="h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-[12px] text-white"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

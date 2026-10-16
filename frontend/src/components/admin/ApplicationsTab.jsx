import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, Search, FileStack, Globe, AlertTriangle } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, inr, STATUS_COLORS } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import Pagination from './Pagination';
import { useToast } from '../../hooks/use-toast';
import { useDebouncedValue } from '../../hooks/use-debounced-value';
import { useDialogA11y } from '../../hooks/use-dialog-a11y';

const STATUSES = ['draft', 'submitted', 'in_review', 'approved', 'rejected'];
const PAGE_SIZE = 25;
const label = (s) => (s || 'draft').replace('_', ' ');

// Confirms a status change; the optional note is stored on the application and the
// backend notifies the applicant of the new status.
function StatusDialog({ change, busy, onCancel, onConfirm }) {
  const [note, setNote] = useState('');
  const dialogProps = useDialogA11y(!!change, onCancel);
  if (!change) return null;
  const { app, status } = change;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div
        {...dialogProps}
        aria-labelledby="app-status-title"
        data-testid="admin-app-status-dialog"
        className="rounded-2xl bg-[#111632] border border-white/10 w-full max-w-md shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="app-status-title" className="text-[16px] font-semibold text-white">
          Mark as {label(status)}?
        </h3>
        <p className="mt-1.5 text-[13px] text-slate-400">
          {app.user?.name || app.primary_applicant?.name || 'The applicant'} will be notified of this status change
          {' '}(#{app.id.slice(0, 8).toUpperCase()}: {label(app.status)} → {label(status)}).
        </p>
        <label htmlFor="app-status-note" className="block mt-4 text-[12px] font-semibold text-slate-300 mb-1">Note (optional)</label>
        <textarea
          id="app-status-note"
          data-testid="admin-app-status-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="e.g. Passport received, appointment booked for 12 Nov"
          className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 focus:border-[hsl(var(--blue-700))] text-[13.5px] text-white placeholder:text-slate-500 outline-none"
        />
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel} className="flex-1 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-[13px]">Cancel</button>
          <button
            data-testid="admin-app-status-confirm"
            disabled={busy}
            onClick={() => onConfirm(note.trim())}
            className="flex-1 h-11 rounded-xl bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] disabled:opacity-50 text-white font-semibold text-[13px]"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Update & notify'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationsTab() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q.trim());
  const [skip, setSkip] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [change, setChange] = useState(null);

  useEffect(() => { setSkip(0); }, [dq, status]);

  const seq = useRef(0);
  const load = useCallback(async () => {
    const id = ++seq.current;
    setItems(null);
    setError('');
    try {
      const r = await adminClient(token).get('/applications', {
        params: { status: status === 'all' ? undefined : status, q: dq || undefined, limit: PAGE_SIZE, skip },
      });
      if (id !== seq.current) return;
      setItems(r.data.items);
      setTotal(r.data.total);
    } catch (e) {
      if (id !== seq.current) return;
      setItems([]);
      setError(e?.response?.data?.detail || e.message);
    }
  }, [token, status, dq, skip]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (note) => {
    const { app: a, status: newStatus } = change;
    setBusy(a.id);
    try {
      await adminClient(token).patch(`/applications/${a.id}`, { status: newStatus, ...(note ? { note } : {}) });
      toast({ title: `Marked as ${label(newStatus)}`, description: 'The applicant has been notified.' });
      setChange(null);
      await load();
    } catch (e) {
      toast({ title: 'Status update failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
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
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              data-testid="admin-apps-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search applicant name, email, phone, country or app id…"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 focus:border-[hsl(var(--blue-700))] text-[13.5px] text-white placeholder:text-slate-500 outline-none"
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
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-slate-400 bg-white/5">
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
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline text-blue-300" /></td></tr>
            )}
            {error && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-red-300" role="alert">
                <AlertTriangle className="w-4 h-4 inline mr-1.5" /> Could not load applications: {error}{' '}
                <button onClick={load} className="underline text-slate-200 ml-1">Retry</button>
              </td></tr>
            )}
            {!error && items?.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">
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
                  <div className="text-[11px] text-slate-400 font-mono">#{a.id.slice(0, 8).toUpperCase()}</div>
                </td>
                <td className="px-5 py-3 text-slate-300">
                  <div>{a.user?.name || a.primary_applicant?.name || '—'}</div>
                  <div className="text-[12px] text-slate-400">{a.user?.email || a.user?.phone || '—'}</div>
                </td>
                <td className="px-5 py-3 text-slate-400 text-[12.5px]">
                  <div>{a.travel_date || '—'}</div>
                  <div className="text-[11px] text-slate-400">{a.applicants} applicant{a.applicants > 1 ? 's' : ''}</div>
                </td>
                <td className="px-5 py-3 font-bold text-emerald-300">{inr(a.revenue_inr)}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] uppercase tracking-[0.12em] font-bold ${STATUS_COLORS[a.status] || STATUS_COLORS.draft}`}>
                    {(a.status || 'draft').replace('_', ' ')}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end">
                    <select
                      data-testid={`admin-app-status-${a.id}`}
                      disabled={busy === a.id}
                      value={a.status || 'draft'}
                      aria-label="Change status"
                      onChange={(e) => setChange({ app: a, status: e.target.value })}
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
        {total > 0 && (
          <div className="px-5 pb-3"><Pagination skip={skip} limit={PAGE_SIZE} total={total} onPageChange={setSkip} /></div>
        )}
      </Panel>
      <StatusDialog key={change ? `${change.app.id}-${change.status}` : 'none'} change={change} busy={!!busy} onCancel={() => setChange(null)} onConfirm={updateStatus} />
    </div>
  );
}

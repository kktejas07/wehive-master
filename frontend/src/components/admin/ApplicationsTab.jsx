import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search, FileStack, Globe, AlertTriangle, LayoutList, LayoutGrid } from 'lucide-react';
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

const KANBAN_COLORS = {
  draft:     { col: '#F8FAFF', border: '#E8EDF8',  badge: 'bg-gray-100 text-[var(--text-secondary)]' },
  submitted: { col: '#FFF7ED', border: '#FED7AA',  badge: 'bg-amber-100 text-amber-700' },
  in_review: { col: '#EFF6FF', border: '#BFDBFE',  badge: 'bg-blue-100 text-[#011CB5]' },
  approved:  { col: '#F0FDF4', border: '#BBF7D0',  badge: 'bg-emerald-100 text-emerald-700' },
  rejected:  { col: '#FFF1F2', border: '#FECDD3',  badge: 'bg-red-100 text-red-700' },
};

// Confirms a status change; the optional note is stored on the application and the
// backend notifies the applicant of the new status.
export function StatusDialog({ change, busy, onCancel, onConfirm }) {
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
        className="rounded-2xl bg-white border border-[#E8EDF8] w-full max-w-md shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="app-status-title" className="text-[16px] font-semibold text-[#1B2B5E]">
          Mark as {label(status)}?
        </h3>
        <p className="mt-1.5 text-[13px] text-[var(--text-secondary)]">
          {app.applicant?.name || app.user?.name || app.primary_applicant?.name || 'The applicant'} will be notified of this status change
          {' '}(#{app.id.slice(0, 8).toUpperCase()}: {label(app.status)} → {label(status)}).
        </p>
        <label htmlFor="app-status-note" className="block mt-4 text-[12px] font-semibold text-[var(--text-secondary)] mb-1">Note (optional)</label>
        <textarea
          id="app-status-note"
          data-testid="admin-app-status-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="e.g. Passport received, appointment booked for 12 Nov"
          className="w-full px-3 py-2 rounded-xl bg-[#F8FAFF] border border-[#E8EDF8] focus:border-[#011CB5] text-[13.5px] text-[#1B2B5E] placeholder:text-[var(--text-muted)] outline-none"
        />
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel} className="flex-1 h-11 rounded-xl bg-[#F0F4FF] hover:bg-[#E8EDF8] text-[#1B2B5E] font-semibold text-[13px]">Cancel</button>
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
  const [assigned, setAssigned] = useState('');
  const [staff, setStaff] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => { setSkip(0); }, [dq, status, assigned]);

  useEffect(() => {
    adminClient(token).get('/staff/workload').then((r) => setStaff(r.data.staff || [])).catch(() => {});
  }, [token]);
  const staffName = (sid) => { const s = staff.find((x) => x.id === sid); return s ? s.name || s.email : null; };

  const seq = useRef(0);
  const load = useCallback(async () => {
    const id = ++seq.current;
    setItems(null);
    setError('');
    try {
      const r = await adminClient(token).get('/applications', {
        params: { status: status === 'all' ? undefined : status, q: dq || undefined, assigned: assigned || undefined, limit: PAGE_SIZE, skip },
      });
      if (id !== seq.current) return;
      setItems(r.data.items);
      setTotal(r.data.total);
    } catch (e) {
      if (id !== seq.current) return;
      setItems([]);
      setError(e?.response?.data?.detail || e.message);
    }
  }, [token, status, dq, assigned, skip]);

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

  const dropCard = async (targetStatus) => {
    if (!dragId || dragOver !== targetStatus) return;
    const app = items?.find((a) => a.id === dragId);
    if (!app || (app.status || 'draft') === targetStatus) return;
    setBusy(dragId);
    try {
      await adminClient(token).patch(`/applications/${dragId}`, { status: targetStatus });
      toast({ title: `Moved to ${label(targetStatus)}` });
      await load();
    } catch (e) {
      toast({ title: 'Move failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setBusy(null);
      setDragId(null);
      setDragOver(null);
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
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              data-testid="admin-apps-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search applicant name, email, phone, country or app id…"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#F8FAFF] border border-[#E8EDF8] focus:border-[#011CB5] text-[13.5px] text-[#1B2B5E] placeholder:text-[var(--text-muted)] outline-none"
            />
          </div>
          <select
            data-testid="admin-apps-status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 px-3 rounded-xl bg-[#F8FAFF] border border-[#E8EDF8] text-[13.5px] text-[#1B2B5E]"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            data-testid="admin-apps-assigned-filter"
            aria-label="Filter by assignee"
            value={assigned}
            onChange={(e) => setAssigned(e.target.value)}
            className="h-10 px-3 rounded-xl bg-[#F8FAFF] border border-[#E8EDF8] text-[13.5px] text-[#1B2B5E] max-w-[220px]"
          >
            <option value="">All assignees</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
          </select>
          <div className="flex items-center rounded-xl border border-[#E8EDF8] overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={`h-10 w-10 flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-[#011CB5] text-[var(--text-primary)]' : 'bg-white text-[var(--text-muted)] hover:bg-[#F0F4FF]'}`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('board')}
              title="Board view"
              className={`h-10 w-10 flex items-center justify-center transition-colors ${viewMode === 'board' ? 'bg-[#011CB5] text-[var(--text-primary)]' : 'bg-white text-[var(--text-muted)] hover:bg-[#F0F4FF]'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Panel>

      {viewMode === 'list' && (
        <Panel className="mt-4 overflow-x-auto p-0">
          <table className="min-w-full text-[13.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-[var(--text-muted)] bg-[#F8FAFF]">
                <th className="px-5 py-3">Application</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Travel</th>
                <th className="px-5 py-3">Assigned</th>
                <th className="px-5 py-3">Revenue</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Update</th>
              </tr>
            </thead>
            <tbody>
              {items === null && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-[var(--text-muted)]"><Loader2 className="w-5 h-5 animate-spin inline text-[#011CB5]" /></td></tr>
              )}
              {error && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-red-600" role="alert">
                  <AlertTriangle className="w-4 h-4 inline mr-1.5" /> Could not load applications: {error}{' '}
                  <button onClick={load} className="underline text-gray-700 ml-1">Retry</button>
                </td></tr>
              )}
              {!error && items?.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-[var(--text-muted)]">
                  <FileStack className="w-5 h-5 inline mr-2" /> No applications found.
                </td></tr>
              )}
              {items?.map((a) => (
                <tr key={a.id} data-testid={`admin-app-row-${a.id}`} className="border-t border-[#E8EDF8] hover:bg-[#F8FAFF]">
                  <td className="px-5 py-3">
                    <Link to={`/admin/applications/${a.id}`} className="font-bold text-[#1B2B5E] inline-flex items-center gap-1.5 hover:underline">
                      <span>{a.country?.flag || <Globe className="w-4 h-4 text-[var(--text-muted)]" />}</span>
                      {a.country?.name || a.country_id?.toUpperCase()} · {a.visa_type}
                    </Link>
                    <div className="text-[11px] text-[var(--text-muted)] font-mono">#{a.id.slice(0, 8).toUpperCase()}</div>
                  </td>
                  <td className="px-5 py-3 text-[var(--text-secondary)]">
                    <div>{a.user?.name || a.primary_applicant?.name || '—'}</div>
                    <div className="text-[12px] text-[var(--text-muted)]">{a.user?.email || a.user?.phone || '—'}</div>
                  </td>
                  <td className="px-5 py-3 text-[var(--text-secondary)] text-[12.5px]">
                    <div>{a.travel_date || '—'}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{a.applicants} applicant{a.applicants > 1 ? 's' : ''}</div>
                  </td>
                  <td className="px-5 py-3 text-[12.5px]" data-testid={`admin-app-assignee-${a.id}`}>
                    {a.assigned_to ? <span className="text-[#1B2B5E]">{staffName(a.assigned_to) || 'Staff member'}</span> : <span className="text-[var(--text-muted)]">Unassigned</span>}
                  </td>
                  <td className="px-5 py-3 font-bold text-emerald-600">{inr(a.revenue_inr)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] uppercase tracking-[0.12em] font-bold ${STATUS_COLORS[a.status] || STATUS_COLORS.draft}`}>
                      {(a.status || 'draft').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        to={`/admin/applications/${a.id}`}
                        data-testid={`case-open-${a.id}`}
                        className="h-8 inline-flex items-center px-2.5 rounded-lg bg-[#011CB5] hover:bg-[#0015A0] text-[var(--text-primary)] text-[12px] font-semibold"
                      >
                        Open
                      </Link>
                      <select
                        data-testid={`admin-app-status-${a.id}`}
                        disabled={busy === a.id}
                        value={a.status || 'draft'}
                        aria-label="Change status"
                        onChange={(e) => setChange({ app: a, status: e.target.value })}
                        className="h-8 px-2 rounded-lg bg-[#F8FAFF] border border-[#E8EDF8] text-[12px] text-[#1B2B5E]"
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
      )}

      {viewMode === 'board' && (
        <div className="mt-4 overflow-x-auto pb-4">
          {items === null && (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#011CB5]" /></div>
          )}
          {error && (
            <div className="text-center py-10 text-red-600">
              <AlertTriangle className="w-4 h-4 inline mr-1.5" /> {error}
            </div>
          )}
          {items !== null && !error && (
            <div className="flex gap-3 min-w-max">
              {STATUSES.map((col) => {
                const colItems = items.filter((a) => (a.status || 'draft') === col);
                const c = KANBAN_COLORS[col];
                const isOver = dragOver === col;
                return (
                  <div
                    key={col}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(col); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => dropCard(col)}
                    style={{ backgroundColor: isOver ? '#EEF2FF' : c.col, borderColor: isOver ? '#011CB5' : c.border }}
                    className="w-64 rounded-2xl border-2 flex flex-col transition-colors"
                  >
                    <div className="px-3 pt-3 pb-2 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1B2B5E]">{label(col)}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{colItems.length}</span>
                    </div>
                    <div className="flex flex-col gap-2 px-2 pb-3 min-h-[120px]">
                      {colItems.map((a) => (
                        <div
                          key={a.id}
                          draggable
                          onDragStart={() => setDragId(a.id)}
                          onDragEnd={() => { setDragId(null); setDragOver(null); }}
                          className={`bg-white rounded-xl border border-[#E8EDF8] p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all ${dragId === a.id ? 'opacity-50' : ''}`}
                        >
                          <div className="font-semibold text-[13px] text-[#1B2B5E] truncate">
                            {a.user?.name || a.primary_applicant?.name || '—'}
                          </div>
                          <div className="text-[12px] text-[var(--text-secondary)] mt-0.5 flex items-center gap-1">
                            <span>{a.country?.flag || '🌐'}</span>
                            <span className="truncate">{a.country?.name || a.country_id?.toUpperCase()} · {a.visa_type}</span>
                          </div>
                          {a.assigned_to && (
                            <div className="text-[11px] text-[var(--text-muted)] mt-1">{staffName(a.assigned_to)}</div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[11px] text-[var(--text-muted)]">{a.travel_date || '—'}</span>
                            <Link to={`/admin/applications/${a.id}`} className="text-[11px] font-semibold text-[#011CB5] hover:underline">Open</Link>
                          </div>
                        </div>
                      ))}
                      {colItems.length === 0 && (
                        <div className="flex-1 flex items-center justify-center text-[12px] text-[var(--text-muted)] py-6">Drop here</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <StatusDialog key={change ? `${change.app.id}-${change.status}` : 'none'} change={change} busy={!!busy} onCancel={() => setChange(null)} onConfirm={updateStatus} />
    </div>
  );
}

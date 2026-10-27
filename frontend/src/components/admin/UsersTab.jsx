import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search, Trash2, Crown, UserCog, AlertTriangle, Bell } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, canWrite } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import Pagination from './Pagination';
import { useToast } from '../../hooks/use-toast';
import { useDebouncedValue } from '../../hooks/use-debounced-value';

const PAGE_SIZE = 25;

function Chip({ children, color = 'slate' }) {
  const map = {
    emerald: 'bg-emerald-500/15 text-emerald-300',
    amber:   'bg-amber-50 text-amber-700',
    indigo:  'bg-blue-50 text-blue-200',
    red:     'bg-red-500/15 text-red-600',
    slate:   'bg-[#F5F7FF] text-[var(--text-secondary)]',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] uppercase tracking-[0.14em] font-bold ${map[color]}`}>
      {children}
    </span>
  );
}

export default function UsersTab() {
  const { token, admin } = useAdminAuth();
  const isSuper = !!admin?.is_super_admin;
  const canManage = canWrite(admin, 'manage');
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q.trim());
  const [role, setRole] = useState('all');
  const [skip, setSkip] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [remindOpen, setRemindOpen] = useState(null);
  const [remindTpl, setRemindTpl] = useState('generic');
  const [remindBusy, setRemindBusy] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => { setSkip(0); }, [dq, role]);

  const seq = useRef(0);
  const load = useCallback(async () => {
    const id = ++seq.current;
    setItems(null);
    setError('');
    try {
      const r = await adminClient(token).get('/users', { params: { q: dq || undefined, role, limit: PAGE_SIZE, skip } });
      if (id !== seq.current) return;
      setItems(r.data.items);
      setTotal(r.data.total);
    } catch (e) {
      if (id !== seq.current) return;
      setItems([]);
      setError(e?.response?.data?.detail || e.message);
      toast({ title: 'Could not load users', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    }
  }, [token, dq, role, skip, toast]);

  useEffect(() => { load(); }, [load]);

  const patch = async (u, body, label) => {
    setBusy(u.id);
    try {
      await adminClient(token).patch(`/users/${u.id}`, body);
      toast({ title: label });
      await load();
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const sendReminder = async (u) => {
    setRemindBusy(true);
    try {
      await adminClient(token).post(`/users/${u.id}/send-reminder`, { template: remindTpl, note: null });
      toast({ title: 'Reminder sent' });
      setRemindOpen(null);
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setRemindBusy(false);
    }
  };

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (!items) return;
    const allIds = items.map((u) => u.id);
    const allSelected = allIds.every((id) => selected.has(id));
    if (allSelected) {
      setSelected((prev) => { const next = new Set(prev); allIds.forEach((id) => next.delete(id)); return next; });
    } else {
      setSelected((prev) => { const next = new Set(prev); allIds.forEach((id) => next.add(id)); return next; });
    }
  };

  const bulkPremium = async () => {
    setBulkBusy(true);
    try {
      for (const id of selected) {
        await adminClient(token).patch(`/users/${id}`, { is_premium: true });
      }
      toast({ title: `${selected.size} user${selected.size > 1 ? 's' : ''} upgraded to premium` });
      setSelected(new Set());
      await load();
    } catch (e) {
      toast({ title: 'Bulk premium failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkRemind = async () => {
    setBulkBusy(true);
    try {
      await adminClient(token).post('/users/bulk-remind', { user_ids: [...selected], template: 'generic' });
      toast({ title: `Reminder sent to ${selected.size} user${selected.size > 1 ? 's' : ''}` });
      setSelected(new Set());
    } catch (e) {
      toast({ title: 'Bulk remind failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setBulkBusy(false);
    }
  };

  const del = async (u) => {
    if (!window.confirm(`Delete ${u.email || u.phone || u.id} and their apps? This cannot be undone.`)) return;
    setBusy(u.id);
    try {
      await adminClient(token).delete(`/users/${u.id}`);
      toast({ title: 'User deleted' });
      await load();
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div data-testid="admin-users-tab">
      <AdminHeader
        title="Users"
        subtitle={`${total} total users. Open a user for their full history or to suspend the account.`}
      />
      <Panel>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              data-testid="admin-users-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email or phone…"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#F5F7FF] border border-[#E8EDF8] focus:border-[hsl(var(--blue-700))] text-[13.5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            />
          </div>
          <select
            data-testid="admin-users-role-filter"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 px-3 rounded-xl bg-[#F5F7FF] border border-[#E8EDF8] text-[13.5px] text-[var(--text-primary)]"
          >
            <option value="all">All roles</option>
            <option value="premium">Premium only</option>
            <option value="staff">Staff</option>
            <option value="admin">Admins</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <p className="mt-3 text-[12px] text-[var(--text-secondary)]">
          Admin rights are granted and revoked in the{' '}
          <Link to="/admin/admins" className="text-blue-700 hover:underline">Admins</Link> tab.
        </p>
      </Panel>

      <Panel className="mt-4 overflow-x-auto p-0">
        <table className="min-w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-[var(--text-secondary)] bg-[#F5F7FF]">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-[#E8EDF8] accent-[#011CB5]"
                  checked={items?.length > 0 && items.every((u) => selected.has(u.id))}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Contact</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-[var(--text-secondary)]"><Loader2 className="w-5 h-5 animate-spin inline text-blue-700" /></td></tr>
            )}
            {error && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-red-600" role="alert">
                <AlertTriangle className="w-4 h-4 inline mr-1.5" /> Could not load users: {error}{' '}
                <button onClick={load} className="underline text-gray-700 ml-1">Retry</button>
              </td></tr>
            )}
            {!error && items?.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-[var(--text-secondary)]">No users match.</td></tr>
            )}
            {items?.map((u) => (
              <tr key={u.id} data-testid={`admin-user-row-${u.id}`} className={`border-t border-[#E8EDF8] transition-colors duration-150 ${selected.has(u.id) ? 'bg-[#EEF2FF]' : 'hover:bg-[#F5F7FF]'}`}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-[#E8EDF8] accent-[#011CB5]"
                    checked={selected.has(u.id)}
                    onChange={() => toggleSelect(u.id)}
                    aria-label={`Select ${u.email || u.id}`}
                  />
                </td>
                <td className="px-5 py-3">
                  <Link to={`/admin/users/${u.id}`} data-testid={`admin-user-link-${u.id}`} className="font-bold text-[var(--text-primary)] hover:underline">{u.name || u.email || u.phone || '—'}</Link>
                  <div className="text-[11px] text-[var(--text-secondary)] font-mono">{u.id.slice(0, 8)}…</div>
                </td>
                <td className="px-5 py-3 text-[var(--text-secondary)]">
                  <div>{u.email || '—'}</div>
                  <div className="text-[12px] text-[var(--text-secondary)]">{u.phone || '—'}</div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {u.suspended && <Chip color="red">Suspended</Chip>}
                    {u.is_admin && <Chip color="red">Admin</Chip>}
                    {u.is_staff && <Chip color="indigo">Staff {u.staff_role ? `· ${u.staff_role}` : ''}</Chip>}
                    {u.is_premium && <Chip color="amber">Premium</Chip>}
                    {!u.is_admin && !u.is_staff && !u.is_premium && <Chip>Free</Chip>}
                  </div>
                </td>
                <td className="px-5 py-3 text-[var(--text-secondary)] text-[12.5px]">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    <div className="relative">
                      <button
                        onClick={() => { setRemindOpen(remindOpen === u.id ? null : u.id); setRemindTpl('generic'); }}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#F5F7FF] hover:bg-[#EEF2FF] px-2.5 py-1.5 text-[11.5px] font-bold text-[var(--text-secondary)]"
                        title="Send reminder"
                      >
                        <Bell className="w-3 h-3" />
                      </button>
                      {remindOpen === u.id && (
                        <div className="absolute right-0 bottom-full mb-1 z-20 rounded-xl bg-white border border-[#E8EDF8] shadow-2xl p-3 w-52">
                          <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-2">Send reminder</p>
                          <select
                            value={remindTpl}
                            onChange={(e) => setRemindTpl(e.target.value)}
                            className="w-full h-9 px-2 rounded-lg bg-[#F5F7FF] border border-[#E8EDF8] text-[12.5px] text-[var(--text-primary)] mb-2"
                          >
                            <option value="generic">General reminder</option>
                            <option value="docs_pending">Documents pending</option>
                            <option value="payment_pending">Payment pending</option>
                          </select>
                          <button
                            disabled={remindBusy}
                            onClick={() => sendReminder(u)}
                            className="w-full h-9 rounded-lg bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] disabled:opacity-50 text-[var(--text-primary)] text-[12.5px] font-bold transition-colors"
                          >
                            {remindBusy ? 'Sending…' : 'Send'}
                          </button>
                        </div>
                      )}
                    </div>
                    {canManage && <>
                    <button
                      data-testid={`toggle-premium-${u.id}`}
                      disabled={busy === u.id}
                      onClick={() => patch(u, { is_premium: !u.is_premium }, u.is_premium ? 'Premium removed' : 'Upgraded to premium')}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#F5F7FF] hover:bg-[#EEF2FF] px-2.5 py-1.5 text-[11.5px] font-bold text-amber-700"
                    >
                      <Crown className="w-3 h-3" /> {u.is_premium ? 'Downgrade' : 'Premium'}
                    </button>
                    <button
                      data-testid={`toggle-staff-${u.id}`}
                      disabled={busy === u.id}
                      onClick={() => patch(u, { is_staff: !u.is_staff, staff_role: u.is_staff ? null : 'consultant' }, u.is_staff ? 'Staff removed' : 'Made staff')}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#F5F7FF] hover:bg-[#EEF2FF] px-2.5 py-1.5 text-[11.5px] font-bold text-blue-700"
                    >
                      <UserCog className="w-3 h-3" /> {u.is_staff ? 'Unstaff' : 'Staff'}
                    </button>
                    </>}
                    {isSuper && (
                      <button
                        data-testid={`delete-user-${u.id}`}
                        disabled={busy === u.id}
                        onClick={() => del(u)}
                        aria-label={`Delete ${u.email || u.phone || 'user'}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-50 px-2.5 py-1.5 text-[11.5px] font-bold text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
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

      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E8EDF8] p-4 flex items-center gap-3 shadow-lg">
          <span className="text-[13px] font-semibold text-[#1B2B5E]">{selected.size} selected</span>
          <button
            disabled={bulkBusy}
            onClick={bulkPremium}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-[var(--text-primary)] text-[12.5px] font-bold"
          >
            <Crown className="w-3.5 h-3.5" /> Grant Premium
          </button>
          <button
            disabled={bulkBusy}
            onClick={bulkRemind}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#011CB5] hover:bg-[#0015A0] disabled:opacity-50 text-white text-[12.5px] font-bold"
          >
            <Bell className="w-3.5 h-3.5" /> Send Reminder
          </button>
          {bulkBusy && <Loader2 className="w-4 h-4 animate-spin text-[#011CB5]" />}
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-[12.5px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

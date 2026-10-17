import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search, Trash2, Crown, UserCog, AlertTriangle } from 'lucide-react';
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
    amber:   'bg-amber-500/15 text-amber-300',
    indigo:  'bg-blue-500/15 text-blue-200',
    red:     'bg-red-500/15 text-red-300',
    slate:   'bg-white/5 text-slate-300',
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
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              data-testid="admin-users-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email or phone…"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 focus:border-[hsl(var(--blue-700))] text-[13.5px] text-white placeholder:text-slate-500 outline-none"
            />
          </div>
          <select
            data-testid="admin-users-role-filter"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-[13.5px] text-white"
          >
            <option value="all">All roles</option>
            <option value="premium">Premium only</option>
            <option value="staff">Staff</option>
            <option value="admin">Admins</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <p className="mt-3 text-[12px] text-slate-400">
          Admin rights are granted and revoked in the{' '}
          <Link to="/admin/admins" className="text-blue-300 hover:underline">Admins</Link> tab.
        </p>
      </Panel>

      <Panel className="mt-4 overflow-x-auto p-0">
        <table className="min-w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-slate-400 bg-white/5">
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Contact</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline text-blue-300" /></td></tr>
            )}
            {error && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-red-300" role="alert">
                <AlertTriangle className="w-4 h-4 inline mr-1.5" /> Could not load users: {error}{' '}
                <button onClick={load} className="underline text-slate-200 ml-1">Retry</button>
              </td></tr>
            )}
            {!error && items?.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No users match.</td></tr>
            )}
            {items?.map((u) => (
              <tr key={u.id} data-testid={`admin-user-row-${u.id}`} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-5 py-3">
                  <Link to={`/admin/users/${u.id}`} data-testid={`admin-user-link-${u.id}`} className="font-bold text-white hover:underline">{u.name || u.email || u.phone || '—'}</Link>
                  <div className="text-[11px] text-slate-400 font-mono">{u.id.slice(0, 8)}…</div>
                </td>
                <td className="px-5 py-3 text-slate-300">
                  <div>{u.email || '—'}</div>
                  <div className="text-[12px] text-slate-400">{u.phone || '—'}</div>
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
                <td className="px-5 py-3 text-slate-400 text-[12.5px]">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    {canManage && <>
                    <button
                      data-testid={`toggle-premium-${u.id}`}
                      disabled={busy === u.id}
                      onClick={() => patch(u, { is_premium: !u.is_premium }, u.is_premium ? 'Premium removed' : 'Upgraded to premium')}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-[11.5px] font-bold text-amber-300"
                    >
                      <Crown className="w-3 h-3" /> {u.is_premium ? 'Downgrade' : 'Premium'}
                    </button>
                    <button
                      data-testid={`toggle-staff-${u.id}`}
                      disabled={busy === u.id}
                      onClick={() => patch(u, { is_staff: !u.is_staff, staff_role: u.is_staff ? null : 'consultant' }, u.is_staff ? 'Staff removed' : 'Made staff')}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-[11.5px] font-bold text-blue-300"
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
                        className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 text-[11.5px] font-bold text-red-300"
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
    </div>
  );
}

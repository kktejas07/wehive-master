import { useEffect, useState, useCallback } from 'react';
import { Loader2, Search, ShieldCheck, Trash2, Crown, UserCog } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

function Chip({ children, color = 'slate' }) {
  const map = {
    emerald: 'bg-emerald-500/15 text-emerald-300',
    amber:   'bg-amber-500/15 text-amber-300',
    indigo:  'bg-indigo-500/15 text-indigo-300',
    red:     'bg-red-500/15 text-red-300',
    slate:   'bg-white/5 text-slate-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] uppercase tracking-[0.14em] font-bold ${map[color]}`}>
      {children}
    </span>
  );
}

export default function UsersTab() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setItems(null);
    const r = await adminClient(token).get('/users', { params: { q: q || undefined, role, limit: 100 } });
    setItems(r.data.items);
    setTotal(r.data.total);
  }, [token, q, role]);

  useEffect(() => { load(); }, [load]);

  const patch = async (u, body, label) => {
    setBusy(u.id);
    try {
      await adminClient(token).patch(`/users/${u.id}`, body);
      toast({ title: label });
      await load();
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message });
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
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div data-testid="admin-users-tab">
      <AdminHeader
        title="Users"
        subtitle={`${total} total users. Toggle premium, promote staff or remove bad actors.`}
      />
      <Panel>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              data-testid="admin-users-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email or phone…"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 focus:border-[hsl(var(--accent))] text-[13.5px] text-white placeholder:text-slate-500 outline-none"
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
          </select>
        </div>
      </Panel>

      <Panel className="mt-4 overflow-x-auto p-0">
        <table className="min-w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-slate-500 bg-white/5">
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Contact</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline text-[hsl(var(--accent))]" /></td></tr>
            )}
            {items?.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No users match.</td></tr>
            )}
            {items?.map((u) => (
              <tr key={u.id} data-testid={`admin-user-row-${u.id}`} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-5 py-3">
                  <div className="font-bold text-white">{u.name || '—'}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{u.id.slice(0, 8)}…</div>
                </td>
                <td className="px-5 py-3 text-slate-300">
                  <div>{u.email || '—'}</div>
                  <div className="text-[12px] text-slate-500">{u.phone || '—'}</div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1.5">
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
                      className="inline-flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-[11.5px] font-bold text-indigo-300"
                    >
                      <UserCog className="w-3 h-3" /> {u.is_staff ? 'Unstaff' : 'Staff'}
                    </button>
                    <button
                      data-testid={`toggle-admin-${u.id}`}
                      disabled={busy === u.id}
                      onClick={() => patch(u, { is_admin: !u.is_admin }, u.is_admin ? 'Admin removed' : 'Admin granted')}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-[11.5px] font-bold text-red-300"
                    >
                      <ShieldCheck className="w-3 h-3" /> {u.is_admin ? 'Unadmin' : 'Admin'}
                    </button>
                    <button
                      data-testid={`delete-user-${u.id}`}
                      disabled={busy === u.id}
                      onClick={() => del(u)}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 text-[11.5px] font-bold text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
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

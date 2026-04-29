import { useEffect, useState, useCallback } from 'react';
import { Loader2, UserPlus, UserCog, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

const ROLES = [
  { id: 'consultant',  label: 'Consultant' },
  { id: 'reviewer',    label: 'Document reviewer' },
  { id: 'support',     label: 'Support agent' },
  { id: 'ops',         label: 'Operations' },
  { id: 'manager',     label: 'Manager' },
];

export default function StaffTab() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('consultant');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setItems(null);
    const r = await adminClient(token).get('/users', { params: { role: 'staff', limit: 200 } });
    setItems(r.data.items);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!email.trim() || !name.trim()) {
      toast({ title: 'Email and name are required' });
      return;
    }
    setBusy(true);
    try {
      await adminClient(token).post('/staff', { email: email.trim(), name: name.trim(), staff_role: role });
      toast({ title: 'Staff onboarded', description: `${email} invited as ${role}` });
      setEmail(''); setName('');
      await load();
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message });
    } finally {
      setBusy(false);
    }
  };

  const updateRole = async (u, newRole) => {
    await adminClient(token).patch(`/users/${u.id}`, { staff_role: newRole });
    toast({ title: `Role updated` });
    await load();
  };

  const demote = async (u) => {
    if (!window.confirm(`Remove staff privileges from ${u.email}?`)) return;
    await adminClient(token).patch(`/users/${u.id}`, { is_staff: false, staff_role: null });
    toast({ title: 'Staff removed' });
    await load();
  };

  return (
    <div data-testid="admin-staff-tab">
      <AdminHeader
        title="Staff & employees"
        subtitle="Onboard visa consultants, reviewers and support agents. They inherit dashboard access (non-admin)."
      />

      <Panel className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-3">Onboard new staff</div>
        <div className="grid sm:grid-cols-4 gap-3">
          <input
            data-testid="admin-staff-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-[13.5px] text-white placeholder:text-slate-500"
          />
          <input
            data-testid="admin-staff-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-[13.5px] text-white placeholder:text-slate-500"
          />
          <select
            data-testid="admin-staff-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-[13.5px] text-white"
          >
            {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <button
            data-testid="admin-staff-add-btn"
            disabled={busy}
            onClick={add}
            className="h-10 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 text-white text-[13.5px] font-bold disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-3.5 h-3.5" /> Onboard</>}
          </button>
        </div>
        <p className="mt-3 text-[11.5px] text-slate-500">
          Staff log in with mock OTP (or real Twilio/SMTP once configured) using the email above.
        </p>
      </Panel>

      <Panel className="overflow-x-auto p-0">
        <table className="min-w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-slate-500 bg-white/5">
              <th className="px-5 py-3">Staff</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline text-[hsl(var(--accent))]" /></td></tr>
            )}
            {items?.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                <UserCog className="w-5 h-5 inline mr-2" /> No staff yet — onboard your first consultant above.
              </td></tr>
            )}
            {items?.map((u) => (
              <tr key={u.id} data-testid={`admin-staff-row-${u.id}`} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-5 py-3">
                  <div className="font-bold text-white">{u.name || '—'}</div>
                  <div className="text-[12px] text-slate-500">{u.email || u.phone || '—'}</div>
                </td>
                <td className="px-5 py-3">
                  <select
                    data-testid={`admin-staff-update-role-${u.id}`}
                    value={u.staff_role || 'consultant'}
                    onChange={(e) => updateRole(u, e.target.value)}
                    className="h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-[12px] text-white"
                  >
                    {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3 text-slate-400 text-[12.5px]">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    data-testid={`admin-staff-remove-${u.id}`}
                    onClick={() => demote(u)}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 text-[11.5px] font-bold text-red-300"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

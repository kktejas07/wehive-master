import { useEffect, useState, useCallback } from 'react';
import { Loader2, UserPlus, UserCog, Trash2, TrendingUp } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
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

function PerformancePanel({ token }) {
  const [data, setData] = useState(null);
  const [sortKey, setSortKey] = useState('open_cases');

  useEffect(() => {
    adminClient(token).get('/ai/agent-performance')
      .then((r) => setData(r.data))
      .catch(() => setData({ agents: [] }));
  }, [token]);

  const agents = [...(data?.agents || [])].sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));

  return (
    <Panel className="mt-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="text-[15px] font-display font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-700" />
          Agent performance
        </div>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}
          className="h-8 px-2 rounded-lg bg-[#F5F7FF] border border-[#E8EDF8] text-[12px] text-white">
          <option value="open_cases">Sort: open cases</option>
          <option value="closed_month">Sort: closed this month</option>
          <option value="avg_resolution_days">Sort: avg resolution</option>
        </select>
      </div>
      {!data && <Loader2 className="w-4 h-4 animate-spin text-blue-700" />}
      {data && agents.length === 0 && (
        <div className="text-[13px] text-gray-500">No performance data yet.</div>
      )}
      {agents.length > 0 && (
        <table className="min-w-full text-[12.5px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.16em] font-bold text-gray-400">
              <th className="pb-2 text-left">Agent</th>
              <th className="pb-2 text-right">Open</th>
              <th className="pb-2 text-right">Closed (30d)</th>
              <th className="pb-2 text-right">Avg days</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a, i) => (
              <tr key={a.id || i} className="border-t border-[#E8EDF8]">
                <td className="py-2.5">
                  <div className="font-semibold text-white">{a.name || a.email || '—'}</div>
                  <div className="text-[11px] text-gray-500">{a.email}</div>
                </td>
                <td className="py-2.5 text-right">
                  <span className={`font-bold ${(a.open_cases ?? 0) > 10 ? 'text-amber-700' : 'text-gray-700'}`}>
                    {a.open_cases ?? 0}
                  </span>
                </td>
                <td className="py-2.5 text-right text-emerald-300 font-bold">{a.closed_month ?? 0}</td>
                <td className="py-2.5 text-right text-gray-600">{a.avg_resolution_days != null ? `${a.avg_resolution_days}d` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

export default function StaffTab() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('consultant');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setItems(null);
    try {
      const r = await adminClient(token).get('/users', { params: { role: 'staff', limit: 200 } });
      setItems(r.data.items);
    } catch (e) {
      setItems([]);
      toast({ title: 'Could not load staff', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    }
  }, [token, toast]);

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
    try {
      await adminClient(token).patch(`/users/${u.id}`, { staff_role: newRole });
      toast({ title: 'Role updated' });
      await load();
    } catch (e) {
      toast({ title: 'Could not update role', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    }
  };

  const demote = async (u) => {
    if (!window.confirm(`Remove staff privileges from ${u.email}?`)) return;
    try {
      await adminClient(token).patch(`/users/${u.id}`, { is_staff: false, staff_role: null });
      toast({ title: 'Staff removed' });
      await load();
    } catch (e) {
      toast({ title: 'Could not remove staff', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    }
  };

  return (
    <div data-testid="admin-staff-tab">
      <AdminHeader
        title="Staff & employees"
        subtitle="Onboard visa consultants, reviewers and support agents. They inherit dashboard access (non-admin)."
      />

      <Panel className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-gray-500 mb-3">Onboard new staff</div>
        <div className="grid sm:grid-cols-4 gap-3">
          <input
            data-testid="admin-staff-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="h-10 px-3 rounded-xl bg-[#F5F7FF] border border-[#E8EDF8] text-[13.5px] text-white placeholder:text-gray-400"
          />
          <input
            data-testid="admin-staff-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="h-10 px-3 rounded-xl bg-[#F5F7FF] border border-[#E8EDF8] text-[13.5px] text-white placeholder:text-gray-400"
          />
          <select
            data-testid="admin-staff-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 px-3 rounded-xl bg-[#F5F7FF] border border-[#E8EDF8] text-[13.5px] text-white"
          >
            {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <button
            data-testid="admin-staff-add-btn"
            disabled={busy}
            onClick={add}
            className="h-10 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white text-[13.5px] font-bold disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-3.5 h-3.5" /> Onboard</>}
          </button>
        </div>
        <p className="mt-3 text-[11.5px] text-gray-500">
          Staff log in with mock OTP (or a real code by email or WhatsApp once SMTP / OpenWA is configured) using the email above.
        </p>
      </Panel>

      <Panel className="overflow-x-auto p-0">
        <table className="min-w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-gray-500 bg-[#F5F7FF]">
              <th className="px-5 py-3">Staff</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin inline text-blue-700" /></td></tr>
            )}
            {items?.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-500">
                <UserCog className="w-5 h-5 inline mr-2" /> No staff yet — onboard your first consultant above.
              </td></tr>
            )}
            {items?.map((u) => (
              <tr key={u.id} data-testid={`admin-staff-row-${u.id}`} className="border-t border-[#E8EDF8] hover:bg-[#F5F7FF]">
                <td className="px-5 py-3">
                  <div className="font-bold text-white">{u.name || '—'}</div>
                  <div className="text-[12px] text-gray-500">{u.email || u.phone || '—'}</div>
                </td>
                <td className="px-5 py-3">
                  <select
                    data-testid={`admin-staff-update-role-${u.id}`}
                    value={u.staff_role || 'consultant'}
                    onChange={(e) => updateRole(u, e.target.value)}
                    className="h-8 px-2 rounded-lg bg-[#F5F7FF] border border-[#E8EDF8] text-[12px] text-white"
                  >
                    {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3 text-gray-500 text-[12.5px]">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    data-testid={`admin-staff-remove-${u.id}`}
                    onClick={() => demote(u)}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-50 px-2.5 py-1.5 text-[11.5px] font-bold text-red-600"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <PerformancePanel token={token} />
    </div>
  );
}

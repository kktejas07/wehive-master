import { useEffect, useState, useCallback } from 'react';
import { Loader2, CheckCircle, XCircle, Clock, Award, DollarSign, Users, ChevronDown, ChevronUp, Plus, Search } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import { API } from '../../context/AuthContext';
import axios from 'axios';
import Pagination from './Pagination';
import { useDialogA11y } from '../../hooks/use-dialog-a11y';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];


const STATUS_BADGE = {
  pending:   'bg-amber-500/15 text-amber-300',
  active:    'bg-emerald-500/15 text-emerald-300',
  suspended: 'bg-red-500/15 text-red-300',
};

// Agents are created here only: there is no public agent signup.
function AddAgentModal({ token, onClose, onDone }) {
  const dialogProps = useDialogA11y(true, onClose);
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', agency_name: '', password: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await axios.post(`${API}/agent/admin/agents`, form, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: 'Agent created', description: `Share the sign-in details with ${form.name} securely.` });
      onDone();
      onClose();
    } catch (err) {
      toast({ title: 'Could not create agent', description: err?.response?.data?.detail?.toString() || 'Check the details.' });
    } finally {
      setBusy(false);
    }
  };

  const fields = [
    ['name', 'Full name', 'text', true], ['email', 'Email', 'email', true], ['phone', 'Phone', 'tel', true],
    ['agency_name', 'Agency (optional)', 'text', false], ['password', 'Temporary password (8+ characters)', 'password', true],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form {...dialogProps} onSubmit={submit} className="w-full max-w-md rounded-2xl bg-[var(--panel-bg)] border border-[var(--glass-border)] p-6 space-y-3">
        <h3 className="text-[var(--text-primary)] font-bold text-[18px]">Add agent</h3>
        {fields.map(([k, label, type, required]) => (
          <div key={k}>
            <label htmlFor={`add-agent-${k}`} className="block text-[12px] text-[var(--text-secondary)] mb-1">{label}</label>
            <input id={`add-agent-${k}`} type={type} required={required} minLength={k === 'password' ? 8 : undefined}
              value={form[k]} onChange={set(k)}
              className="w-full h-10 rounded-lg bg-[var(--glass-hover)] border border-[var(--glass-border)] px-3 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--admin-blue)]" />
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg bg-[var(--glass-hover)] text-[var(--text-secondary)] text-sm font-semibold">Cancel</button>
          <button type="submit" disabled={busy} className="h-10 px-4 rounded-lg bg-[hsl(var(--blue-700))] text-[var(--text-primary)] text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Create agent
          </button>
        </div>
      </form>
    </div>
  );
}

function CommissionModal({ agent, token, onClose, onDone }) {
  const dialogProps = useDialogA11y(true, onClose);
  const { toast } = useToast();
  const [form, setForm] = useState({ university_name: '', amount_inr: '', commission_type: 'enrollment', note: '' });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.university_name || !form.amount_inr) { toast({ title: 'Fill university name and amount.' }); return; }
    setBusy(true);
    try {
      await axios.post(`${API}/agent/admin/agents/${agent._id || agent.id}/commissions`,
        { ...form, agent_id: agent._id || agent.id, amount_inr: parseInt(form.amount_inr) },
        { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: 'Commission recorded', description: `₹${parseInt(form.amount_inr).toLocaleString()} added to ${agent.name || agent.agency_name}` });
      onDone();
      onClose();
    } catch (e) { toast({ title: 'Error', description: e?.response?.data?.detail || 'Could not record.' }); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div {...dialogProps} className="bg-[var(--panel-bg)] rounded-2xl border border-[var(--glass-border)] w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="font-bold text-[var(--text-primary)] text-[16px]">Record Commission Payment</div>
        <div className="text-[12px] text-[var(--text-secondary)]">Agent: <span className="text-[var(--text-primary)] font-bold">{agent.agency_name || agent.name}</span></div>
        {[
          { k: 'university_name', label: 'University Name', placeholder: 'e.g. University of Toronto' },
          { k: 'amount_inr', label: 'Amount (₹)', placeholder: '25000', type: 'number' },
          { k: 'note', label: 'Note (optional)', placeholder: 'Enrollment confirmation #123' },
        ].map(({ k, label, placeholder, type = 'text' }) => (
          <label key={k} className="block">
            <span className="block text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--text-secondary)] mb-1">{label}</span>
            <input type={type} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={placeholder}
              className="w-full h-10 rounded-xl bg-[var(--glass-hover)] border border-[var(--glass-border)] px-3 text-[13px] text-[var(--text-primary)] outline-none focus:border-[hsl(var(--blue-700))]/50" />
          </label>
        ))}
        <label className="block">
          <span className="block text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--text-secondary)] mb-1">Type</span>
          <select value={form.commission_type} onChange={e => setForm(f => ({ ...f, commission_type: e.target.value }))}
            className="w-full h-10 rounded-xl bg-[var(--glass-hover)] border border-[var(--glass-border)] px-3 text-[13px] text-[var(--text-primary)] outline-none">
            <option value="enrollment">Enrollment</option>
            <option value="application">Application</option>
          </select>
        </label>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-full bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)] text-[13px] font-bold text-[var(--text-secondary)]">Cancel</button>
          <button onClick={submit} disabled={busy} className="flex-1 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[13px] font-bold text-[var(--text-primary)] disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent, token, onRefresh }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [showCommModal, setShowCommModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const patch = async (update) => {
    setBusy(true);
    try {
      await axios.patch(`${API}/agent/admin/agents/${agent._id || agent.id}`, update, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: 'Agent updated' });
      onRefresh();
    } catch (e) { toast({ title: 'Error', description: e?.response?.data?.detail || 'Could not update.' }); }
    finally { setBusy(false); }
  };

  const tier = agent.tier || 'bronze';
  const status = agent.status || 'pending';

  return (
    <div className="rounded-2xl bg-[var(--glass-hover)] border border-[var(--glass-border)] overflow-hidden">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[var(--glass-hover)] transition">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[16px] shrink-0 bg-blue-500/15 text-blue-300">
          {(agent.agency_name || agent.name || 'A')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold text-[var(--text-primary)]">{agent.agency_name || agent.name || '—'}</span>
            <span className={`text-[11px] font-bold uppercase tracking-[0.12em] rounded-full px-2 py-0.5 ${STATUS_BADGE[status] || 'bg-[var(--glass-hover)] text-[var(--text-secondary)]'}`}>{status}</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] rounded-full px-2 py-0.5 bg-[var(--glass-hover)] text-[var(--text-primary)]">{tier}</span>
          </div>
          <div className="text-[12px] text-[var(--text-secondary)] mt-0.5 truncate">{agent.email} · {agent.city || '—'}, {(agent.country || '').toUpperCase()}</div>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-right">
          <div className="hidden sm:block">
            <div className="text-[13px] font-bold text-[var(--text-primary)]">{agent.total_students || agent.students_count || 0} students</div>
            <div className="text-[11px] text-[var(--text-secondary)]">₹{((agent.total_commission_inr || agent.total_revenue || 0) / 1000).toFixed(0)}K earned</div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--glass-border)] px-5 py-4 space-y-4">
          <div className="grid sm:grid-cols-4 gap-3">
            {[
              ['Students', agent.total_students || agent.students_count || 0, Users],
              ['Applications', agent.total_applications || agent.applications_count || 0, null],
              ['Successful', agent.successful_applications || 0, CheckCircle],
              ['Commission', `₹${((agent.total_commission_inr || agent.total_revenue || 0)).toLocaleString()}`, DollarSign],
            ].map(([l, v, Icon]) => (
              <div key={l} className="rounded-xl bg-[var(--glass-hover)] p-3 text-center">
                <div className="text-[18px] font-bold text-[var(--text-primary)]">{v}</div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{l}</div>
              </div>
            ))}
          </div>

          {agent.specializations?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {agent.specializations.map(s => <span key={s} className="text-[11px] font-bold bg-[var(--glass-hover)] text-[var(--text-secondary)] rounded-full px-2.5 py-0.5">{s.toUpperCase()}</span>)}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {status === 'pending' && (
              <button onClick={() => patch({ status: 'active', verified: true })} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 h-10 text-[12.5px] font-semibold text-[var(--text-primary)] transition disabled:opacity-50">
                <CheckCircle className="w-3.5 h-3.5" /> Approve Agent
              </button>
            )}
            {status === 'active' && (
              <button onClick={() => patch({ status: 'suspended' })} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600/70 hover:bg-red-600 px-4 h-10 text-[12.5px] font-semibold text-[var(--text-primary)] transition disabled:opacity-50">
                <XCircle className="w-3.5 h-3.5" /> Suspend
              </button>
            )}
            {status === 'suspended' && (
              <button onClick={() => patch({ status: 'active', verified: true })} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/70 hover:bg-emerald-600 px-4 h-10 text-[12.5px] font-semibold text-[var(--text-primary)] transition disabled:opacity-50">
                <CheckCircle className="w-3.5 h-3.5" /> Reactivate
              </button>
            )}
            <button onClick={() => setShowCommModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] px-4 h-10 text-[13px] font-semibold text-[var(--text-primary)] transition">
              <DollarSign className="w-3.5 h-3.5" /> Record Commission
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--text-secondary)]">Tier:</span>
              {['bronze','silver','gold','platinum'].map(t => (
                <button key={t} onClick={() => patch({ tier: t })} disabled={busy}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize transition ${tier === t ? 'bg-[hsl(var(--blue-700))] text-[var(--text-primary)]' : 'bg-[var(--glass-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCommModal && <CommissionModal agent={agent} token={token} onClose={() => setShowCommModal(false)} onDone={onRefresh} />}
    </div>
  );
}

export default function AgentsTab() {
  const { token } = useAdminAuth();
  const [items, setItems] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    params.set('limit', pageSize);
    params.set('skip', skip);
    axios.get(`${API}/agent/admin/agents?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        setItems(r.data.items || r.data);
        setTotal(r.data.total || (r.data.items || r.data || []).length);
      })
      .catch(() => setItems([]));
  }, [token, statusFilter, skip]);

  useEffect(() => { load(); }, [load]);

  const pending = items?.filter(a => a.status === 'pending').length ?? 0;
  const filtered = q ? items?.filter(a => (a.agency_name || a.name || '').toLowerCase().includes(q.toLowerCase()) || (a.email || '').toLowerCase().includes(q.toLowerCase())) : items;

  return (
    <div className="space-y-6">
      <AdminHeader title="Agent Partners" subtitle={`Agents are added by admins only; only active, verified agents receive applications${pending > 0 ? ` · ${pending} pending approval` : ''}`} />
      <div className="flex justify-end">
        <button type="button" onClick={() => setAdding(true)} data-testid="add-agent-btn"
          className="h-10 px-4 rounded-lg bg-[hsl(var(--blue-700))] text-[var(--text-primary)] text-sm font-semibold inline-flex items-center gap-2">
          <Plus className="w-4 h-4" aria-hidden="true" /> Add agent
        </button>
      </div>
      {adding && <AddAgentModal token={token} onClose={() => setAdding(false)} onDone={load} />}
      <Panel>
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[var(--glass-border)]">
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button key={f.value} onClick={() => { setStatusFilter(f.value); setSkip(0); }}
                className={`rounded-full px-4 py-1.5 text-[12.5px] font-bold transition ${statusFilter === f.value ? 'bg-[hsl(var(--blue-700))] text-[var(--text-primary)]' : 'bg-[var(--glass-hover)] text-[var(--text-secondary)] hover:bg-[var(--glass-hover)]'}`}>
                {f.label}{f.value === 'pending' && pending > 0 ? ` (${pending})` : ''}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[160px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search agents…"
                className="w-full h-9 rounded-xl bg-[var(--glass-hover)] border border-[var(--glass-border)] pl-8 pr-3 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--glass-border)] placeholder:text-[var(--text-muted)]" />
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {!items && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[var(--text-secondary)]" /></div>}
          {items && filtered?.length === 0 && <div className="py-12 text-center text-[var(--text-secondary)] text-[14px]">No agents found.</div>}
          {filtered?.map(agent => <AgentCard key={agent._id || agent.id} agent={agent} token={token} onRefresh={load} />)}
          {items && filtered?.length > 0 && <div className="mt-4"><Pagination skip={skip} limit={pageSize} total={total} onPageChange={setSkip} /></div>}
        </div>
      </Panel>
    </div>
  );
}

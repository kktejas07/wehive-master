import { useEffect, useState, useCallback } from 'react';
import { Loader2, CheckCircle, XCircle, Clock, Award, DollarSign, Users, ChevronDown, ChevronUp, Plus, Search } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import { API } from '../../context/AuthContext';
import axios from 'axios';
import Pagination from './Pagination';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

const TIER_COLORS = { bronze: '#b45309', silver: '#94a3b8', gold: '#f59e0b', platinum: '#a855f7' };

const STATUS_BADGE = {
  pending:   'bg-amber-500/15 text-amber-300',
  active:    'bg-emerald-500/15 text-emerald-300',
  suspended: 'bg-red-500/15 text-red-300',
};

function CommissionModal({ agent, token, onClose, onDone }) {
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
      <div className="bg-[#111632] rounded-2xl border border-white/10 w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="font-bold text-white text-[16px]">Record Commission Payment</div>
        <div className="text-[12px] text-slate-400">Agent: <span className="text-white font-bold">{agent.agency_name || agent.name}</span></div>
        {[
          { k: 'university_name', label: 'University Name', placeholder: 'e.g. University of Toronto' },
          { k: 'amount_inr', label: 'Amount (₹)', placeholder: '25000', type: 'number' },
          { k: 'note', label: 'Note (optional)', placeholder: 'Enrollment confirmation #123' },
        ].map(({ k, label, placeholder, type = 'text' }) => (
          <label key={k} className="block">
            <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">{label}</span>
            <input type={type} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={placeholder}
              className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none focus:border-[hsl(var(--accent))]/50" />
          </label>
        ))}
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Type</span>
          <select value={form.commission_type} onChange={e => setForm(f => ({ ...f, commission_type: e.target.value }))}
            className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none">
            <option value="enrollment">Enrollment</option>
            <option value="application">Application</option>
          </select>
        </label>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-full bg-white/5 hover:bg-white/10 text-[13px] font-bold text-slate-300">Cancel</button>
          <button onClick={submit} disabled={busy} className="flex-1 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[13px] font-bold text-white disabled:opacity-50">
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
    <div className="rounded-2xl bg-white/5 border border-white/8 overflow-hidden">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/5 transition">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[16px] shrink-0" style={{ background: `${TIER_COLORS[tier]}20`, color: TIER_COLORS[tier] }}>
          {(agent.agency_name || agent.name || 'A')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold text-white">{agent.agency_name || agent.name || '—'}</span>
            <span className={`text-[10px] font-bold uppercase tracking-[0.12em] rounded-full px-2 py-0.5 ${STATUS_BADGE[status] || 'bg-white/5 text-slate-400'}`}>{status}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] rounded-full px-2 py-0.5" style={{ background: `${TIER_COLORS[tier]}20`, color: TIER_COLORS[tier] }}>{tier}</span>
          </div>
          <div className="text-[12px] text-slate-400 mt-0.5 truncate">{agent.email} · {agent.city || '—'}, {(agent.country || '').toUpperCase()}</div>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-right">
          <div className="hidden sm:block">
            <div className="text-[13px] font-bold text-white">{agent.total_students || agent.students_count || 0} students</div>
            <div className="text-[11px] text-slate-500">₹{((agent.total_commission_inr || agent.total_revenue || 0) / 1000).toFixed(0)}K earned</div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/8 px-5 py-4 space-y-4">
          <div className="grid sm:grid-cols-4 gap-3">
            {[
              ['Students', agent.total_students || agent.students_count || 0, Users],
              ['Applications', agent.total_applications || agent.applications_count || 0, null],
              ['Successful', agent.successful_applications || 0, CheckCircle],
              ['Commission', `₹${((agent.total_commission_inr || agent.total_revenue || 0)).toLocaleString()}`, DollarSign],
            ].map(([l, v, Icon]) => (
              <div key={l} className="rounded-xl bg-white/5 p-3 text-center">
                <div className="text-[18px] font-bold text-white">{v}</div>
                <div className="text-[10.5px] text-slate-400 mt-0.5">{l}</div>
              </div>
            ))}
          </div>

          {agent.specializations?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {agent.specializations.map(s => <span key={s} className="text-[11px] font-bold bg-white/8 text-slate-300 rounded-full px-2.5 py-0.5">{s.toUpperCase()}</span>)}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {status === 'pending' && (
              <button onClick={() => patch({ status: 'active' })} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-[12.5px] font-bold text-white transition disabled:opacity-50">
                <CheckCircle className="w-3.5 h-3.5" /> Approve Agent
              </button>
            )}
            {status === 'active' && (
              <button onClick={() => patch({ status: 'suspended' })} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-600/70 hover:bg-red-600 px-4 py-2 text-[12.5px] font-bold text-white transition disabled:opacity-50">
                <XCircle className="w-3.5 h-3.5" /> Suspend
              </button>
            )}
            {status === 'suspended' && (
              <button onClick={() => patch({ status: 'active' })} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/70 hover:bg-emerald-600 px-4 py-2 text-[12.5px] font-bold text-white transition disabled:opacity-50">
                <CheckCircle className="w-3.5 h-3.5" /> Reactivate
              </button>
            )}
            <button onClick={() => setShowCommModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--accent))] hover:opacity-90 px-4 py-2 text-[12.5px] font-bold text-white transition">
              <DollarSign className="w-3.5 h-3.5" /> Record Commission
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Tier:</span>
              {['bronze','silver','gold','platinum'].map(t => (
                <button key={t} onClick={() => patch({ tier: t })} disabled={busy}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize transition ${tier === t ? 'text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                  style={tier === t ? { background: TIER_COLORS[t] } : {}}>
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
  const [statusFilter, setStatusFilter] = useState('pending');
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
      <AdminHeader title="Agent Partners" subtitle={`Manage recruitment agent registrations, approvals, and commission payments${pending > 0 ? ` · ${pending} pending approval` : ''}`} />
      <Panel>
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-white/5">
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button key={f.value} onClick={() => { setStatusFilter(f.value); setSkip(0); }}
                className={`rounded-full px-4 py-1.5 text-[12.5px] font-bold transition ${statusFilter === f.value ? 'bg-[hsl(var(--accent))] text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                {f.label}{f.value === 'pending' && pending > 0 ? ` (${pending})` : ''}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[160px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search agents…"
                className="w-full h-9 rounded-xl bg-white/5 border border-white/10 pl-8 pr-3 text-[13px] text-white outline-none focus:border-white/20 placeholder:text-slate-600" />
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {!items && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>}
          {items && filtered?.length === 0 && <div className="py-12 text-center text-slate-400 text-[14px]">No agents found.</div>}
          {filtered?.map(agent => <AgentCard key={agent._id || agent.id} agent={agent} token={token} onRefresh={load} />)}
          {items && filtered?.length > 0 && <div className="mt-4"><Pagination skip={skip} limit={pageSize} total={total} onPageChange={setSkip} /></div>}
        </div>
      </Panel>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RefreshCw, Bell } from 'lucide-react';
import { adminClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useToast } from '../../hooks/use-toast';

const OPEN_STATUSES = ['submitted', 'in_review', 'appointment_scheduled'];
const STATUS_LABEL = { submitted: 'Submitted', in_review: 'In Review', appointment_scheduled: 'Appointment' };
const STATUS_COLOR = { submitted: 'text-blue-700', in_review: 'text-amber-700', appointment_scheduled: 'text-emerald-600' };

function KanbanCard({ item }) {
  return (
    <Link
      to={`/admin/applications/${item.id}`}
      className="block rounded-xl bg-[#F5F7FF] border border-[#E8EDF8] px-3 py-2.5 hover:bg-[#EEF2FF] transition-colors"
    >
      <div className="text-[13px] font-semibold text-[#1B2B5E] truncate">{item.applicant || '—'}</div>
      <div className="text-[12px] text-gray-500 mt-0.5 truncate">
        {item.country || '—'}{item.visa_type ? ` · ${item.visa_type}` : ''}
      </div>
      {item.days_in_stage > 7 && (
        <div className="mt-1.5 text-[11px] font-semibold text-amber-700">
          {item.days_in_stage}d in stage
        </div>
      )}
    </Link>
  );
}

function Pipeline({ token }) {
  const [data, setData] = useState(null);
  const load = useCallback(() => {
    setData(null);
    adminClient(token).get('/monitoring/application-pipeline')
      .then((r) => setData(r.data))
      .catch(() => {});
  }, [token]);
  useEffect(() => { load(); }, [load]);

  return (
    <Panel className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[15px] font-display font-bold text-[#1B2B5E]">Application pipeline</div>
        <button onClick={load} className="text-gray-500 hover:text-[#1B2B5E]">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {!data && <Loader2 className="w-5 h-5 animate-spin text-blue-700" />}
      {data && (
        <div className="grid md:grid-cols-3 gap-4">
          {data.columns.map((col) => (
            <div key={col.status}>
              <div className={`text-[11px] uppercase tracking-[0.14em] font-bold mb-2 ${STATUS_COLOR[col.status] || 'text-gray-500'}`}>
                {col.label} <span className="text-gray-400">({col.items.length})</span>
              </div>
              <div className="space-y-2">
                {col.items.slice(0, 20).map((item) => (
                  <KanbanCard key={item.id} item={item} />
                ))}
                {col.items.length === 0 && (
                  <div className="text-[12px] text-gray-400 py-4 text-center">Empty</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function InactiveUsers({ token }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [reminding, setReminding] = useState(false);
  const [days, setDays] = useState(7);
  const [template, setTemplate] = useState('generic');
  const { toast } = useToast();

  const load = useCallback(() => {
    setData(null);
    adminClient(token).get('/monitoring/inactive-users', { params: { days, limit: 50 } })
      .then((r) => setData(r.data))
      .catch(() => {});
  }, [token, days]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const bulkRemind = async () => {
    setReminding(true);
    try {
      const r = await adminClient(token).post('/monitoring/bulk-remind', {
        user_ids: [...selected], template,
      });
      toast({ title: `Reminders sent to ${r.data.sent} users` });
      setSelected(new Set());
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setReminding(false);
    }
  };

  return (
    <Panel className="mt-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div className="flex items-center gap-2">
          <select value={days} onChange={(e) => { setDays(Number(e.target.value)); setSelected(new Set()); }}
            className="h-8 px-2 rounded-lg bg-[#F5F7FF] border border-[#E8EDF8] text-[12px] text-[#1B2B5E]">
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          <div className="text-[15px] font-display font-bold text-[#1B2B5E]">
            Inactive ({days}d){data ? ` · ${data.total}` : ''}
          </div>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <select value={template} onChange={(e) => setTemplate(e.target.value)}
              className="h-9 px-2 rounded-lg bg-[#F5F7FF] border border-[#E8EDF8] text-[12px] text-[#1B2B5E]">
              <option value="generic">General</option>
              <option value="docs_pending">Docs pending</option>
              <option value="payment_pending">Payment pending</option>
            </select>
            <button
              onClick={bulkRemind}
              disabled={reminding}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[hsl(var(--blue-700))] text-white text-[12px] font-semibold disabled:opacity-50"
            >
              {reminding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
              Remind {selected.size}
            </button>
          </div>
        )}
      </div>
      {!data && <Loader2 className="w-5 h-5 animate-spin text-blue-700" />}
      {data && (
        <div className="space-y-1">
          {data.users.map((u) => (
            <label
              key={u.id}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#F5F7FF] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(u.id)}
                onChange={() => toggle(u.id)}
                className="accent-[hsl(var(--blue-700))]"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#1B2B5E] truncate">{u.name || u.email || u.id}</div>
                <div className="text-[12px] text-gray-500">{u.email}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[12px] text-gray-600">{u.days_inactive ?? '?'}d inactive</div>
                <div className="text-[11px] text-amber-700">{u.recommended_action.replace('_', ' ')}</div>
              </div>
            </label>
          ))}
          {data.users.length === 0 && (
            <div className="text-[13px] text-gray-500 py-6 text-center">No inactive users.</div>
          )}
        </div>
      )}
    </Panel>
  );
}

function AnomaliesPanel({ token }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    adminClient(token).get('/ai/anomalies')
      .then((r) => setData(r.data))
      .catch(() => setData({ items: [] }));
  }, [token]);

  const items = data?.items || [];

  return (
    <Panel className="mt-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="text-[15px] font-display font-bold text-[#1B2B5E] flex items-center gap-2">
          AI anomalies
          {items.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
              {items.length}
            </span>
          )}
        </div>
        <span className="text-gray-500 text-[12px]">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-3">
          {!data && <Loader2 className="w-4 h-4 animate-spin text-blue-700" />}
          {data && items.length === 0 && (
            <div className="text-[13px] text-gray-500 py-2">No anomalies detected.</div>
          )}
          {items.map((a, i) => (
            <div key={i} className="flex items-start gap-3 py-2.5 border-t first:border-t-0 border-[#E8EDF8]">
              <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                a.severity === 'critical' ? 'bg-red-400' :
                a.severity === 'warning'  ? 'bg-amber-400' : 'bg-blue-400'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[#1B2B5E]">{a.message || a.description || '—'}</div>
                {a.entity_type && a.entity_id && (
                  <Link
                    to={`/admin/${a.entity_type === 'application' ? 'applications' : 'users'}/${a.entity_id}`}
                    className="text-[12px] text-blue-700 hover:underline mt-0.5 block"
                  >
                    View {a.entity_type} →
                  </Link>
                )}
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wide shrink-0 ${
                a.severity === 'critical' ? 'text-red-600' :
                a.severity === 'warning'  ? 'text-amber-700' : 'text-blue-700'
              }`}>{a.severity || 'info'}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export default function MonitoringTab() {
  const { token } = useAdminAuth();
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    let live = true;
    const fetch = () => {
      adminClient(token).get('/monitoring/dashboard')
        .then((r) => live && setDashboard(r.data))
        .catch(() => {});
    };
    fetch();
    const interval = setInterval(fetch, 60000);
    return () => { live = false; clearInterval(interval); };
  }, [token]);

  return (
    <div data-testid="admin-monitoring">
      <AdminHeader
        title="Monitoring"
        subtitle="Live platform health — auto-refreshes every 60s."
      />
      {dashboard && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Stale cases', value: dashboard.stale_cases, color: dashboard.stale_cases > 0 ? 'text-amber-700' : 'text-emerald-300' },
            { label: 'Pending docs', value: dashboard.pending_docs, color: dashboard.pending_docs > 0 ? 'text-amber-700' : 'text-emerald-300' },
            { label: 'Inactive users (7d)', value: dashboard.inactive_users, color: dashboard.inactive_users > 5 ? 'text-red-600' : 'text-gray-600' },
            { label: 'Email bounces (30d)', value: dashboard.email_bounces, color: dashboard.email_bounces > 0 ? 'text-red-600' : 'text-gray-600' },
          ].map((t) => (
            <Panel key={t.label}>
              <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-gray-500">{t.label}</div>
              <div className={`mt-2 text-[28px] font-display font-bold ${t.color}`}>{t.value}</div>
            </Panel>
          ))}
        </div>
      )}
      <InactiveUsers token={token} />
      <AnomaliesPanel token={token} />
      <Pipeline token={token} />
    </div>
  );
}

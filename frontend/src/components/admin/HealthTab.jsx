import { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, XCircle, CircleDashed } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';

const STATUS = {
  ok:      { Icon: CheckCircle2,  cls: 'text-emerald-300', pill: 'bg-emerald-500/15 text-emerald-300', label: 'OK' },
  warning: { Icon: AlertTriangle, cls: 'text-amber-300',   pill: 'bg-amber-500/15 text-amber-300',     label: 'Warning' },
  missing: { Icon: CircleDashed,  cls: 'text-slate-300',   pill: 'bg-white/10 text-slate-200',         label: 'Not set up' },
  error:   { Icon: XCircle,       cls: 'text-red-300',     pill: 'bg-red-500/15 text-red-300',         label: 'Error' },
};

export default function HealthTab() {
  const { token } = useAdminAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await adminClient(token).get('/health');
      setData(r.data);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const overall = data && STATUS[data.overall];
  return (
    <div data-testid="admin-health-tab">
      <AdminHeader
        title="System health"
        subtitle="Live status of the database and every external service the app depends on. No secrets are shown."
        right={(
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-[13px] font-bold text-white disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Re-check
          </button>
        )}
      />
      {error && (
        <Panel><div role="alert" className="text-red-300 text-[13.5px]"><AlertTriangle className="w-4 h-4 inline mr-1.5" />Could not run checks: {error}</div></Panel>
      )}
      {!data && !error && <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin inline text-blue-300" /></div>}
      {data && (
        <>
          <Panel>
            <div className="flex items-center gap-3" data-testid="health-overall">
              <overall.Icon className={`w-6 h-6 ${overall.cls}`} />
              <div>
                <div className="text-white font-bold text-[15px]">
                  {data.overall === 'ok' ? 'All systems ready' : `${data.services.filter((s) => s.status !== 'ok').length} item(s) need attention`}
                </div>
                <div className="text-[12px] text-slate-400">Checked {new Date(data.checked_at + 'Z').toLocaleString('en-IN')}</div>
              </div>
            </div>
          </Panel>
          <Panel className="mt-4 p-0">
            <ul>
              {data.services.map((s) => {
                const st = STATUS[s.status] || STATUS.missing;
                return (
                  <li key={s.id} data-testid={`health-${s.id}`} className="flex items-start gap-3 px-5 py-3.5 border-t first:border-t-0 border-white/5">
                    <st.Icon className={`w-5 h-5 mt-0.5 shrink-0 ${st.cls}`} aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold text-[14px]">{s.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10.5px] uppercase tracking-[0.12em] font-bold ${st.pill}`}>{st.label}</span>
                        {s.detail && <span className="text-[12px] text-slate-400">{s.detail}</span>}
                      </div>
                      {s.action && <div className="mt-0.5 text-[12.5px] text-slate-300">{s.action}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
}

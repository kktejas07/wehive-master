import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, TrendingUp, Users, FileStack, Banknote, Globe, ArrowUpRight, History, Pencil, Plus, Trash2, Play, AlertTriangle } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, inr, runAggregators, SEVERITY_PILL, ALERT_KIND_LABEL } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

// `accent` is accepted for API compatibility; all stat cards share one icon style.
function MetricCard({ label, value, sub, Icon, accent, testid }) {
  return (
    <Panel className="relative overflow-hidden" >
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">{label}</div>
        <span className={`h-8 w-8 inline-flex items-center justify-center rounded-lg bg-blue-500/15 text-blue-300`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-4 text-[30px] font-display font-bold tracking-[-0.02em] text-white" data-testid={testid}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[12px] text-slate-400">{sub}</div>}
    </Panel>
  );
}

function SparkBars({ data, metric = 'applications', accent = 'hsl(var(--blue-500))' }) {
  const max = Math.max(1, ...data.map((d) => d[metric] || 0));
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((d) => {
        const h = ((d[metric] || 0) / max) * 100;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center justify-end">
            <div
              className="w-full rounded-t-md transition-all"
              style={{
                height: `${h}%`,
                background: h > 0 ? accent : 'rgba(255,255,255,0.06)',
                minHeight: h > 0 ? '6px' : '3px',
              }}
              title={`${d.date}: ${d[metric] || 0}`}
            />
          </div>
        );
      })}
    </div>
  );
}

const SEVERITY_DOT = { critical: 'bg-red-400', warning: 'bg-amber-400', info: 'bg-blue-300' };

// Cases that need action soon (GET /admin/alerts), critical first.
function NeedsAttention({ token }) {
  const [mine, setMine] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setData(null);
    setErr('');
    adminClient(token)
      .get('/alerts', { params: { mine } })
      .then((r) => setData(r.data))
      .catch((e) => setErr(e?.response?.data?.detail || e.message));
  }, [token, mine]);

  return (
    <Panel className="mb-6">
      <div data-testid="admin-needs-attention" className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-[15px] font-display font-bold text-white">
          <AlertTriangle className="w-4 h-4 text-amber-300" /> Needs attention
          {data && <span className="text-[12px] font-semibold text-slate-400 tabular-nums">{data.total}</span>}
        </div>
        <label className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-slate-300 cursor-pointer">
          <input data-testid="alerts-mine-toggle" type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="accent-[hsl(var(--blue-700))]" />
          Mine only
        </label>
      </div>
      {data && Object.keys(data.counts || {}).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(data.counts).map(([k, n]) => (
            <span key={k} data-testid={`alerts-count-${k}`} className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11.5px] font-semibold text-slate-300">
              {ALERT_KIND_LABEL[k] || k} <span className="tabular-nums text-white">{n}</span>
            </span>
          ))}
        </div>
      )}
      {!data && !err && <Loader2 className="w-4 h-4 animate-spin text-blue-300" />}
      {err && <p className="text-[13px] text-red-300">Could not load alerts: {err}</p>}
      {data?.items.length === 0 && <p className="text-[13px] text-slate-400">Nothing needs attention right now.</p>}
      <ul className="divide-y divide-white/5">
        {data?.items.slice(0, 8).map((a, i) => (
          <li key={`${a.application_id}-${a.kind}-${i}`}>
            <Link
              to={`/admin/applications/${a.application_id}`}
              data-testid={`alert-link-${a.application_id}-${a.kind}`}
              className="flex items-center gap-3 py-2.5 hover:bg-white/5 rounded-lg px-2 -mx-2"
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${SEVERITY_DOT[a.severity] || SEVERITY_DOT.info}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-white truncate">{a.message}</div>
                <div className="text-[12px] text-slate-400 truncate">{[a.applicant, a.country, a.visa_type].filter(Boolean).join(' · ')}</div>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.1em] ${SEVERITY_PILL[a.severity] || SEVERITY_PILL.info}`}>{a.severity}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

const FUNNEL_RANGES = [[30, '30 days'], [90, '90 days'], [365, '12 months']];

// Signup cohort for the chosen window → how far each user got. Revenue here is real paid orders,
// unlike the "Revenue (est.)" card which is computed from application fees.
function Funnel({ token }) {
  const [days, setDays] = useState(90);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let live = true;
    setData(null);
    setErr('');
    adminClient(token).get('/funnel', { params: { days } })
      .then((r) => live && setData(r.data))
      .catch((e) => live && setErr(e?.response?.data?.detail || e.message));
    return () => { live = false; };
  }, [token, days]);

  const top = data?.steps?.[0]?.count || 0;
  return (
    <Panel className="mt-5" >
      <div className="flex items-center justify-between gap-3 flex-wrap" data-testid="admin-funnel">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">Conversion funnel</div>
          <div className="text-[12px] text-slate-400 mt-0.5">Users who signed up in the window, and how far they got</div>
        </div>
        <div className="flex gap-1" role="group" aria-label="Funnel window">
          {FUNNEL_RANGES.map(([d, l]) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              className={`h-8 px-3 rounded-lg text-[12px] font-bold ${days === d ? 'bg-[hsl(var(--blue-700))] text-white' : 'bg-white/5 text-slate-300 hover:text-white'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {err && <div className="mt-4 text-[13px] text-red-300" role="alert">Could not load funnel: {err}</div>}
      {!data && !err && <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-blue-300" /></div>}
      {data && (
        <div className="mt-4 grid lg:grid-cols-3 gap-5">
          <ol className="lg:col-span-2 space-y-2.5">
            {data.steps.map((s) => (
              <li key={s.key} data-testid={`funnel-${s.key}`}>
                <div className="flex justify-between text-[12.5px]">
                  <span className="text-slate-200">{s.label}</span>
                  <span className="text-white font-bold">
                    {s.count.toLocaleString('en-IN')}
                    {s.from_previous != null && <span className="text-slate-400 font-normal"> · {s.from_previous}% of previous</span>}
                  </span>
                </div>
                <div className="mt-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-[hsl(var(--blue-500))]" style={{ width: `${top ? Math.max(2, (100 * s.count) / top) : 0}%` }} />
                </div>
              </li>
            ))}
          </ol>
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">Paid revenue</div>
            <div className="text-[26px] font-display font-bold text-white" data-testid="funnel-paid-revenue">{inr(data.revenue.paid_inr)}</div>
            <div className="text-[12px] text-slate-400">
              {data.revenue.paid_count} orders · avg {inr(data.revenue.avg_order_inr)}
            </div>
            {data.revenue.by_plan.slice(0, 4).map((p) => (
              <div key={p.plan_id} className="flex justify-between text-[12.5px] border-t border-white/5 pt-1.5">
                <span className="text-slate-300">{p.plan_id}</span>
                <span className="text-white">{inr(p.amount_inr)} <span className="text-slate-400">· {p.count}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

export default function OverviewTab() {
  const { token } = useAdminAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [runningAggregator, setRunningAggregator] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    adminClient(token)
      .get('/metrics')
      .then((r) => setData(r.data))
      .catch((e) => setErr(e?.response?.data?.detail || e.message));
  }, [token]);

  if (err) {
    return (
      // Same element shape as the loaded view so NeedsAttention keeps its state (no refetch).
      <div>
        <AdminHeader title="Overview" />
        <NeedsAttention token={token} />
        <Panel>
          <div className="text-[14px] text-red-300" data-testid="admin-metrics-error">{err}</div>
        </Panel>
      </div>
    );
  }
  if (!data) {
    return (
      // Same element shape as the loaded view so NeedsAttention keeps its state (no refetch).
      <div>
        <AdminHeader title="Overview" />
        <NeedsAttention token={token} />
        <Panel><Loader2 className="w-5 h-5 animate-spin text-blue-300" /></Panel>
      </div>
    );
  }

  const { users, applications, revenue, countries, trend, top_countries, recent_activity } = data;

  return (
    <div data-testid="admin-overview">
      <AdminHeader
        title="Overview"
        subtitle="Live platform health — users, visa applications, revenue and infrastructure."
        right={
          <button
            onClick={async () => {
              setRunningAggregator(true);
              toast(await runAggregators(token));
              setRunningAggregator(false);
            }}
            disabled={runningAggregator}
            className="h-10 px-4 rounded-lg bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-[13px] font-semibold text-white inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {runningAggregator ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            Run AI Aggregators Now
          </button>
        }
      />

      <NeedsAttention token={token} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          testid="metric-users"
          label="Total users"
          value={users.total}
          sub={`${users.new_7d} this week · ${users.premium} premium`}
          Icon={Users}
          accent="bg-blue-500"
        />
        <MetricCard
          testid="metric-applications"
          label="Applications"
          value={applications.total}
          sub={`${applications.new_30d} in 30d · ${applications.in_review} in review`}
          Icon={FileStack}
          accent="bg-amber-500"
        />
        <MetricCard
          testid="metric-revenue"
          label="Revenue (est.)"
          value={inr(revenue.total_inr)}
          sub={`${inr(revenue.last_30d_inr)} in 30d`}
          Icon={Banknote}
          accent="bg-emerald-500"
        />
        <MetricCard
          testid="metric-countries"
          label="Countries live"
          value={countries.total}
          sub={`${countries.no_visa} visa-free for Indians`}
          Icon={Globe}
          accent="bg-blue-500"
        />
      </div>

      <Funnel token={token} />

      <div className="grid lg:grid-cols-3 gap-4 mt-5">
        <Panel className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">
                14-day trend
              </div>
              <div className="mt-1 text-[18px] font-display font-bold text-white">
                Applications & signups
              </div>
            </div>
            <TrendingUp className="w-4 h-4 text-blue-300" />
          </div>
          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-semibold mb-2">Applications / day</div>
            <SparkBars data={trend} metric="applications" accent="hsl(var(--blue-500))" />
          </div>
          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-semibold mb-2">New signups / day</div>
            <SparkBars data={trend} metric="users" accent="hsl(var(--blue-100))" />
          </div>
        </Panel>

        <Panel>
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">Top destinations</div>
          <div className="mt-1 text-[18px] font-display font-bold text-white">By application count</div>
          {top_countries.length === 0 ? (
            <div className="mt-6 text-[13px] text-slate-400">No applications yet.</div>
          ) : (
            <ul className="mt-4 space-y-2">
              {top_countries.map((c, idx) => (
                <li key={c.id} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                  <span className="text-[11px] font-bold text-slate-400 w-4">{idx + 1}</span>
                  <span className="text-lg leading-none">{c.flag || <Globe className="w-4 h-4 text-slate-400" />}</span>
                  <span className="flex-1 text-[13.5px] font-bold text-white truncate">{c.name}</span>
                  <span className="text-[12px] font-bold text-blue-300 inline-flex items-center gap-0.5">
                    {c.count} <ArrowUpRight className="w-3 h-3" />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid sm:grid-cols-4 gap-4 mt-5">
        <Panel>
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">Drafts</div>
          <div className="mt-2 text-[24px] font-display font-bold text-white">{applications.draft}</div>
        </Panel>
        <Panel>
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">In review</div>
          <div className="mt-2 text-[24px] font-display font-bold text-amber-300">{applications.in_review}</div>
        </Panel>
        <Panel>
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">Approved</div>
          <div className="mt-2 text-[24px] font-display font-bold text-emerald-300">{applications.approved}</div>
        </Panel>
        <Panel>
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">Rejected</div>
          <div className="mt-2 text-[24px] font-display font-bold text-red-300">{applications.rejected}</div>
        </Panel>
      </div>

      {/* Recent activity feed */}
      <Panel className="mt-5" data-testid="admin-recent-activity">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 inline-flex items-center gap-2">
              <History className="w-3 h-3 text-blue-300" /> Recent activity
            </div>
            <div className="mt-1 text-[18px] font-display font-bold text-white">Admin audit log</div>
          </div>
        </div>
        {(!recent_activity || recent_activity.length === 0) ? (
          <div className="mt-5 text-[13px] text-slate-400 py-6 text-center">
            No admin activity yet — your audit trail starts the moment you make changes.
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-white/5">
            {recent_activity.map((row) => {
              const Icon = row.action === 'delete' ? Trash2 : row.action === 'create' ? Plus : Pencil;
              const tone =
                row.action === 'delete' ? 'text-red-300 bg-red-500/10'
                : row.action === 'create' ? 'text-emerald-300 bg-emerald-500/10'
                : 'text-amber-300 bg-amber-500/10';
              const at = row.at ? new Date(row.at) : null;
              return (
                <li
                  key={row.id}
                  data-testid={`audit-row-${row.id}`}
                  className="py-3 flex items-start gap-3"
                >
                  <span className={`mt-0.5 h-8 w-8 inline-flex items-center justify-center rounded-lg ${tone}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] text-white">
                      <span className="font-bold capitalize">{row.action}</span>
                      <span className="text-slate-400"> on </span>
                      <span className="font-bold capitalize">{row.entity_type}</span>
                      {row.entity_id && (
                        <span className="text-slate-400 font-mono ml-1">·{String(row.entity_id).slice(0, 8)}</span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-slate-400 mt-0.5">
                      <span className="font-bold text-slate-400">{row.admin_email || row.admin_name || 'admin'}</span>
                      {at && (
                        <span> · {at.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
                      )}
                    </div>
                    {row.diff && Object.keys(row.diff).length > 0 && (
                      <div className="mt-1.5 text-[12px] text-slate-300 space-x-2 space-y-0.5">
                        {Object.entries(row.diff).slice(0, 3).map(([k, v]) => (
                          <span key={k} className="inline-block bg-white/5 rounded px-1.5 py-0.5 text-[11.5px]">
                            <span className="text-slate-400">{k}:</span>{' '}
                            <span className="text-red-300 line-through mr-1">{String(v.from ?? '—').slice(0, 24)}</span>
                            <span className="text-emerald-300">{String(v.to ?? '—').slice(0, 24)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

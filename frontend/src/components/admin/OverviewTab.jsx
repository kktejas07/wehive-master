import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, Users, FileStack, Banknote, Globe, ArrowUpRight, History, Pencil, Plus, Trash2, Play } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, inr } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import { API } from '../../context/AuthContext';
import axios from 'axios';

function MetricCard({ label, value, sub, Icon, accent = 'bg-[hsl(var(--accent))]', testid }) {
  return (
    <Panel className="relative overflow-hidden" >
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400">{label}</div>
        <span className={`h-8 w-8 inline-flex items-center justify-center rounded-lg ${accent} text-white`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-4 text-[30px] font-display font-extrabold tracking-[-0.02em] text-white" data-testid={testid}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[12px] text-slate-400">{sub}</div>}
    </Panel>
  );
}

function SparkBars({ data, metric = 'applications', accent = '#e1212c' }) {
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
      <>
        <AdminHeader title="Overview" />
        <Panel>
          <div className="text-[14px] text-red-300" data-testid="admin-metrics-error">{err}</div>
        </Panel>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <AdminHeader title="Overview" />
        <Panel><Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--accent))]" /></Panel>
      </>
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
              try {
                await axios.get(`${API}/public/aggregator-trigger`);
                toast({ title: 'AI Aggregators Triggered', description: 'Scraping News, Blogs & Events in background.' });
              } catch (e) {
                toast({ title: 'Trigger failed', variant: 'destructive' });
              } finally {
                setRunningAggregator(false);
              }
            }}
            disabled={runningAggregator}
            className="h-9 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[12px] font-bold text-white inline-flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
          >
            {runningAggregator ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            Run AI Aggregators Now
          </button>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          testid="metric-users"
          label="Total users"
          value={users.total}
          sub={`${users.new_7d} this week · ${users.premium} premium`}
          Icon={Users}
          accent="bg-indigo-500"
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
          accent="bg-sky-500"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-5">
        <Panel className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400">
                14-day trend
              </div>
              <div className="mt-1 text-[18px] font-display font-extrabold text-white">
                Applications & signups
              </div>
            </div>
            <TrendingUp className="w-4 h-4 text-[hsl(var(--accent))]" />
          </div>
          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 font-bold mb-2">Applications / day</div>
            <SparkBars data={trend} metric="applications" accent="#e1212c" />
          </div>
          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 font-bold mb-2">New signups / day</div>
            <SparkBars data={trend} metric="users" accent="#6366f1" />
          </div>
        </Panel>

        <Panel>
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400">Top destinations</div>
          <div className="mt-1 text-[18px] font-display font-extrabold text-white">By application count</div>
          {top_countries.length === 0 ? (
            <div className="mt-6 text-[13px] text-slate-500">No applications yet.</div>
          ) : (
            <ul className="mt-4 space-y-2">
              {top_countries.map((c, idx) => (
                <li key={c.id} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                  <span className="text-[11px] font-bold text-slate-500 w-4">{idx + 1}</span>
                  <span className="text-lg leading-none">{c.flag || <Globe className="w-4 h-4 text-slate-400" />}</span>
                  <span className="flex-1 text-[13.5px] font-bold text-white truncate">{c.name}</span>
                  <span className="text-[12px] font-bold text-[hsl(var(--accent))] inline-flex items-center gap-0.5">
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
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400">Drafts</div>
          <div className="mt-2 text-[24px] font-display font-extrabold text-white">{applications.draft}</div>
        </Panel>
        <Panel>
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400">In review</div>
          <div className="mt-2 text-[24px] font-display font-extrabold text-amber-300">{applications.in_review}</div>
        </Panel>
        <Panel>
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400">Approved</div>
          <div className="mt-2 text-[24px] font-display font-extrabold text-emerald-300">{applications.approved}</div>
        </Panel>
        <Panel>
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400">Rejected</div>
          <div className="mt-2 text-[24px] font-display font-extrabold text-red-300">{applications.rejected}</div>
        </Panel>
      </div>

      {/* Recent activity feed */}
      <Panel className="mt-5" data-testid="admin-recent-activity">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 inline-flex items-center gap-2">
              <History className="w-3 h-3 text-[hsl(var(--accent))]" /> Recent activity
            </div>
            <div className="mt-1 text-[18px] font-display font-extrabold text-white">Admin audit log</div>
          </div>
        </div>
        {(!recent_activity || recent_activity.length === 0) ? (
          <div className="mt-5 text-[13px] text-slate-500 py-6 text-center">
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
                        <span className="text-slate-500 font-mono ml-1">·{String(row.entity_id).slice(0, 8)}</span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-slate-500 mt-0.5">
                      <span className="font-bold text-slate-400">{row.admin_email || row.admin_name || 'admin'}</span>
                      {at && (
                        <span> · {at.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
                      )}
                    </div>
                    {row.diff && Object.keys(row.diff).length > 0 && (
                      <div className="mt-1.5 text-[12px] text-slate-300 space-x-2 space-y-0.5">
                        {Object.entries(row.diff).slice(0, 3).map(([k, v]) => (
                          <span key={k} className="inline-block bg-white/5 rounded px-1.5 py-0.5 text-[11.5px]">
                            <span className="text-slate-500">{k}:</span>{' '}
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

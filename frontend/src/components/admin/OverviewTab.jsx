import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, Play, AlertTriangle, Clock, FileWarning, UserMinus, Mail,
  TrendingUp, Globe, ArrowUpRight, History, Users, FileStack, Banknote,
} from 'lucide-react';
import { AdminHeader, Panel } from './AdminShell';
import { inr, SEVERITY_PILL, ALERT_KIND_LABEL, adminClient } from '../../lib/admin';
import { useOverviewViewModel } from '../../viewmodels/useOverviewViewModel';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useToast } from '../../hooks/use-toast';

// ─── chart helpers ────────────────────────────────────────────────────────────

function SvgAreaChart({ data = [], series = [], height = 80 }) {
  if (!data || data.length === 0) return <div className="h-20 flex items-center justify-center text-[12px] text-slate-500">No data</div>;
  const W = 300;
  const H = height;
  const pad = 4;

  const paths = series.map((s) => {
    const vals = data.map((d) => d[s.key] ?? 0);
    const max = Math.max(...vals, 1);
    const min = Math.min(...vals, 0);
    const range = max - min || 1;
    const n = vals.length;
    const xStep = n < 2 ? W : (W - pad * 2) / (n - 1);

    const points = vals.map((v, i) => ({
      x: pad + i * xStep,
      y: pad + (1 - (v - min) / range) * (H - pad * 2),
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const areaPath = `${linePath} L${points[points.length - 1].x},${H} L${points[0].x},${H} Z`;

    return { ...s, linePath, areaPath, id: `grad-${s.key}` };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        {paths.map((p) => (
          <linearGradient key={p.id} id={p.id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={p.color} stopOpacity="0.02" />
          </linearGradient>
        ))}
      </defs>
      {paths.map((p) => (
        <g key={p.key}>
          <path d={p.areaPath} fill={`url(#${p.id})`} />
          <path d={p.linePath} fill="none" stroke={p.color} strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}

function SvgDonut({ segments = [] }) {
  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0);
  if (total === 0) {
    return (
      <svg viewBox="0 0 120 120" className="w-[120px] h-[120px]">
        <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" />
        <text x="60" y="65" textAnchor="middle" fill="#94a3b8" fontSize="14" fontWeight="bold">0</text>
      </svg>
    );
  }

  const R = 44;
  const CX = 60;
  const CY = 60;
  let angle = -Math.PI / 2;
  const arcs = segments.map((seg) => {
    const frac = seg.value / total;
    const startAngle = angle;
    const endAngle = angle + frac * 2 * Math.PI;
    angle = endAngle;
    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);
    const large = frac > 0.5 ? 1 : 0;
    return { ...seg, d: `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} Z` };
  });

  return (
    <svg viewBox="0 0 120 120" className="w-[120px] h-[120px]">
      {arcs.map((a) => <path key={a.label} d={a.d} fill={a.color} opacity="0.9" />)}
      <circle cx={CX} cy={CY} r="28" fill="var(--admin-bg, #0F172A)" />
      <text x={CX} y={CY + 5} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{total}</text>
    </svg>
  );
}

// ─── row 1 ────────────────────────────────────────────────────────────────────

function WelcomeBanner({ admin, alertCount, onRunAggregators, running }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="relative overflow-hidden rounded-2xl border p-5 h-full"
      style={{ background: 'linear-gradient(135deg, rgba(27,43,94,0.6) 0%, rgba(1,28,181,0.15) 100%)', borderColor: 'var(--glass-border, rgba(255,255,255,0.10))' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top right, rgba(1,28,181,0.2), transparent 60%)' }} />
      <div className="relative">
        <div className="eyebrow text-[11px] text-slate-400">{greeting}</div>
        <h2 className="mt-1 text-[22px] font-display font-bold text-white">{admin?.name || admin?.email || 'Admin'}</h2>
        {alertCount > 0 && (
          <div className="mt-1 text-[13px] text-amber-300 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> {alertCount} alert{alertCount !== 1 ? 's' : ''} need attention
          </div>
        )}
        <button
          onClick={onRunAggregators}
          disabled={running}
          className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12.5px] font-bold bg-white/10 hover:bg-white/15 text-white disabled:opacity-50 transition-colors"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Run aggregators
        </button>
      </div>
    </div>
  );
}

function QuickStats({ monitoring }) {
  if (!monitoring) return (
    <Panel className="h-full flex items-center justify-center">
      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
    </Panel>
  );
  const tiles = [
    { label: 'Stale cases',    value: monitoring.stale_cases,    Icon: Clock,        amber: monitoring.stale_cases > 0 },
    { label: 'Pending docs',   value: monitoring.pending_docs,   Icon: FileWarning,  amber: monitoring.pending_docs > 0 },
    { label: 'Inactive users', value: monitoring.inactive_users, Icon: UserMinus,    red: monitoring.inactive_users > 5 },
    { label: 'Email bounces',  value: monitoring.email_bounces,  Icon: Mail,         red: monitoring.email_bounces > 0 },
  ];
  return (
    <Panel className="h-full">
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Link key={t.label} to="/admin/monitoring"
            className="rounded-xl bg-white/5 border border-white/[0.06] px-3 py-2.5 hover:bg-white/10 transition-colors flex items-center gap-2">
            <t.Icon className={`w-4 h-4 shrink-0 ${t.red ? 'text-red-300' : t.amber ? 'text-amber-300' : 'text-slate-500'}`} />
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] font-semibold text-slate-400 leading-none">{t.label}</div>
              <div className={`text-[18px] font-display font-bold leading-snug ${t.red ? 'text-red-300' : t.amber ? 'text-amber-300' : 'text-white'}`}>{t.value ?? '—'}</div>
            </div>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

// ─── row 2 ────────────────────────────────────────────────────────────────────

const METRIC_ACCENTS = {
  users:    { from: '#1B2B5E', to: '#011CB5', icon: 'text-blue-300',    ring: 'bg-blue-500/15' },
  apps:     { from: '#1B2B5E', to: '#92400e', icon: 'text-amber-300',   ring: 'bg-amber-500/15' },
  revenue:  { from: '#1B2B5E', to: '#064e3b', icon: 'text-emerald-300', ring: 'bg-emerald-500/15' },
  countries:{ from: '#1B2B5E', to: '#1e3a8a', icon: 'text-sky-300',     ring: 'bg-sky-500/15' },
};

function KPICard({ label, value, sub, Icon, accentKey = 'users', delta, testid }) {
  const a = METRIC_ACCENTS[accentKey] || METRIC_ACCENTS.users;
  return (
    <div className="card-lift relative overflow-hidden rounded-2xl border p-5 cursor-default"
      style={{ background: `linear-gradient(135deg, ${a.from} 0%, var(--admin-bg, #0F172A) 100%)`, borderColor: 'var(--glass-border, rgba(255,255,255,0.10))' }}>
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `radial-gradient(ellipse at top right, ${a.to}, transparent 70%)` }} />
      <div className="relative flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-slate-400">{label}</div>
        <span className={`h-9 w-9 inline-flex items-center justify-center rounded-xl ${a.ring} ${a.icon}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="relative mt-4 text-[32px] font-display font-bold tracking-[-0.02em] text-white" data-testid={testid}>{value}</div>
      <div className="relative mt-1 flex items-center gap-2">
        {sub && <span className="text-[12px] text-slate-400">{sub}</span>}
        {delta != null && (
          <span className={`text-[11px] font-bold ${delta > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
            {delta > 0 ? '↑' : '↓'} {Math.abs(delta)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── row 3 ────────────────────────────────────────────────────────────────────

const FUNNEL_STEPS = [
  { key: 'registered',       label: 'Registered' },
  { key: 'verified',         label: 'Verified' },
  { key: 'profile_complete', label: 'Profile' },
  { key: 'applied',          label: 'Applied' },
  { key: 'paid',             label: 'Paid' },
  { key: 'approved',         label: 'Approved' },
];

function FunnelPanel({ funnel }) {
  if (!funnel) return (
    <Panel className="flex items-center justify-center h-full">
      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
    </Panel>
  );
  const max = Math.max(1, ...FUNNEL_STEPS.map((s) => funnel[s.key] || 0));
  return (
    <Panel>
      <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-3">User funnel (90d)</div>
      <div className="space-y-2">
        {FUNNEL_STEPS.map((s, i) => {
          const count = funnel[s.key] || 0;
          const prev = i === 0 ? count : (funnel[FUNNEL_STEPS[i - 1].key] || count);
          const drop = prev > 0 && i > 0 ? Math.round((1 - count / prev) * 100) : null;
          const pct = Math.round((count / max) * 100);
          return (
            <Link key={s.key} to={`/admin/users?stage=${s.key}`}
              className="block hover:bg-white/5 rounded-lg px-2 py-1 -mx-2 transition-colors group">
              <div className="flex justify-between text-[12px] mb-1">
                <span className="text-slate-300 group-hover:text-white">{s.label}</span>
                <span className="text-white font-semibold">{count.toLocaleString()}
                  {drop != null && <span className="text-red-300 ml-1.5 font-normal">↓{drop}%</span>}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #011CB5, #F59E0B)' }} />
              </div>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}

function AlertsPanel({ alerts }) {
  if (!alerts) return (
    <Panel className="flex items-center justify-center h-full">
      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
    </Panel>
  );
  const items = (alerts.items || []).slice(0, 8);
  const SEV_DOT = { critical: 'bg-red-400', high: 'bg-amber-400', low: 'bg-blue-400' };
  return (
    <Panel className="flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">Alerts ({alerts.total ?? items.length})</div>
        {alerts.total > 8 && (
          <Link to="/admin/alerts" className="text-[11px] text-blue-300 hover:text-blue-200 flex items-center gap-0.5">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      {items.length === 0 && <div className="text-[13px] text-slate-500">No active alerts.</div>}
      <div className="space-y-2">
        {items.map((al) => (
          <div key={al.id} className="flex items-start gap-2 text-[12.5px]">
            <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${SEV_DOT[al.severity] || SEV_DOT.low}`} />
            <div className="min-w-0">
              <div className="text-slate-200 truncate">{al.message || ALERT_KIND_LABEL?.[al.kind] || al.kind}</div>
              {al.applicant_name && <div className="text-slate-500 text-[11px]">{al.applicant_name}{al.days != null ? ` · ${al.days}d` : ''}</div>}
            </div>
            {al.case_id && (
              <Link to={`/admin/applications/${al.case_id}`}
                className="ml-auto shrink-0 text-[11px] text-blue-300 hover:text-blue-200 whitespace-nowrap">
                View case
              </Link>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TrendPanel({ trend }) {
  return (
    <Panel>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-slate-400" />
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">90-day trend</div>
      </div>
      <SvgAreaChart
        data={trend || []}
        height={120}
        series={[
          { key: 'signups',      color: '#011CB5', label: 'Signups' },
          { key: 'applications', color: '#F59E0B', label: 'Applications' },
        ]}
      />
      <div className="mt-2 flex gap-4">
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="h-2 w-2 rounded-full bg-[#011CB5] inline-block" /> Signups
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="h-2 w-2 rounded-full bg-[#F59E0B] inline-block" /> Applications
        </span>
      </div>
    </Panel>
  );
}

// ─── row 4 ────────────────────────────────────────────────────────────────────

function TopDestinations({ countries }) {
  const items = (countries || []).slice(0, 5);
  const max = Math.max(1, ...items.map((c) => c.count || 0));
  return (
    <Panel>
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-slate-400" />
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">Top destinations</div>
      </div>
      {items.length === 0 && <div className="text-[13px] text-slate-500">No data yet.</div>}
      <div className="space-y-2.5">
        {items.map((c) => {
          const pct = Math.round((c.count / max) * 100);
          return (
            <div key={c.country_id || c.name}>
              <div className="flex justify-between text-[12.5px] mb-1">
                <span className="text-slate-200">{c.flag ? `${c.flag} ` : ''}{c.name || c.country_id}</span>
                <span className="text-white font-semibold">{c.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #F59E0B, rgba(245,158,11,0.4))' }} />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

const DONUT_SEGMENTS = [
  { key: 'submitted',  label: 'Submitted',  color: '#F59E0B' },
  { key: 'in_review',  label: 'In review',  color: '#1B2B5E' },
  { key: 'approved',   label: 'Approved',   color: '#34d399' },
  { key: 'rejected',   label: 'Rejected',   color: '#f87171' },
  { key: 'draft',      label: 'Draft',      color: '#475569' },
];

function AppStatusPanel({ applications }) {
  const segments = DONUT_SEGMENTS.map((s) => ({ ...s, value: applications?.[s.key] || 0 }));
  return (
    <Panel>
      <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-3">App status</div>
      <div className="flex items-center gap-4">
        <SvgDonut segments={segments} />
        <div className="space-y-1.5">
          {segments.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 text-[11.5px]">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-slate-400">{s.label}</span>
              <span className="ml-auto text-white font-semibold">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initials(email = '') {
  const parts = email.split('@')[0].split(/[._-]/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');
}

function RecentAuditFeed({ activity }) {
  const items = (activity || []).slice(0, 10);
  return (
    <Panel>
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-slate-400" />
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">Recent audit</div>
      </div>
      {items.length === 0 && <div className="text-[13px] text-slate-500">No recent activity.</div>}
      <div className="space-y-2.5">
        {items.map((e, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="h-7 w-7 rounded-full inline-flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #1B2B5E, #011CB5)' }}>
              {initials(e.admin_email)}
            </span>
            <div className="min-w-0">
              <div className="text-[12.5px] text-slate-200 truncate capitalize">
                {e.action} {e.entity_type ? `on ${e.entity_type}` : ''}{e.entity_id ? ` #${e.entity_id}` : ''}
              </div>
              <div className="text-[11px] text-slate-500">{e.admin_email} · {relativeTime(e.at)}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ─── main export ──────────────────────────────────────────────────────────────

export default function OverviewTab() {
  const { admin, token } = useAdminAuth();
  const { toast } = useToast();
  const { metrics, alerts, funnel, monitoring, loading, error, runAggregators } = useOverviewViewModel();
  const [running, setRunning] = useState(false);
  const [forecast, setForecast] = useState(null);
  useEffect(() => {
    if (!token) return;
    adminClient(token).get('/ai/revenue', { params: { days: 30 } })
      .then((r) => setForecast(r.data?.forecast_inr ?? null))
      .catch(() => {});
  }, [token]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const result = await runAggregators();
      toast(result);
    } catch (e) {
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  if (error) return (
    <div>
      <AdminHeader title="Overview" />
      <Panel><div className="text-red-300 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div></Panel>
    </div>
  );

  if (loading || !metrics) return (
    <div>
      <AdminHeader title="Overview" />
      <Panel className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-300" /></Panel>
    </div>
  );

  const { users, applications, revenue, countries, trend, top_countries, recent_activity } = metrics;

  return (
    <div data-testid="admin-overview">
      <AdminHeader
        title="Overview"
        subtitle="Live platform health — users, visa applications, revenue and infrastructure."
      />

      <div className="skeleton-stagger grid grid-cols-12 gap-4">
        {/* Bento row 1: WelcomeBanner + FunnelPanel as tall sidebar */}
        <div className="col-span-12 lg:col-span-8">
          <WelcomeBanner admin={admin} alertCount={alerts?.total || 0} onRunAggregators={handleRun} running={running} />
        </div>
        <div className="col-span-12 lg:col-span-4 lg:row-span-2">
          <FunnelPanel funnel={funnel} />
        </div>

        {/* Bento row 1b: QuickStats fills under WelcomeBanner */}
        <div className="col-span-12 lg:col-span-8">
          <QuickStats monitoring={monitoring} />
        </div>

        {/* Row 2: KPI cards */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <KPICard testid="metric-users" label="Total users" value={users?.total ?? '—'}
            sub={`${users?.new_7d ?? 0} this week · ${users?.premium ?? 0} premium`}
            Icon={Users} accentKey="users" delta={users?.new_7d} />
        </div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <KPICard testid="metric-applications" label="Applications" value={applications?.total ?? '—'}
            sub={`${applications?.new_30d ?? 0} in 30d`}
            Icon={FileStack} accentKey="apps" delta={applications?.new_30d} />
        </div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <KPICard testid="metric-revenue" label="Revenue (est.)" value={inr(revenue?.total_inr ?? 0)}
            sub={`${inr(revenue?.last_30d_inr ?? 0)} in 30d${forecast != null ? ` · ↗ ${inr(forecast)} forecast` : ''}`}
            Icon={Banknote} accentKey="revenue" />
        </div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <KPICard testid="metric-countries" label="Countries live" value={countries?.total ?? '—'}
            sub={`${countries?.no_visa ?? 0} visa-free`}
            Icon={Globe} accentKey="countries" />
        </div>

        {/* Row 3: Alerts narrow + TrendPanel featured wide */}
        <div className="col-span-12 lg:col-span-4">
          <AlertsPanel alerts={alerts} />
        </div>
        <div className="col-span-12 lg:col-span-8">
          <TrendPanel trend={trend} />
        </div>

        {/* Row 4 */}
        <div className="col-span-12 lg:col-span-5">
          <TopDestinations countries={top_countries} />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <AppStatusPanel applications={applications} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <RecentAuditFeed activity={recent_activity} />
        </div>
      </div>
    </div>
  );
}

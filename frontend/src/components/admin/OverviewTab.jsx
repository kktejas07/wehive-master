import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, Play, AlertTriangle, Clock, FileWarning, UserMinus, Mail,
  TrendingUp, Globe, ArrowUpRight, History, Users, FileStack, Banknote,
} from 'lucide-react';
import { AdminHeader, Panel } from './AdminShell';
import { inr, SEVERITY_PILL, ALERT_KIND_LABEL, adminClient } from '../../lib/admin';
import { relativeTime } from '../../lib/utils';
import { useOverviewViewModel } from '../../viewmodels/useOverviewViewModel';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useToast } from '../../hooks/use-toast';

// ─── chart helpers ────────────────────────────────────────────────────────────

function SvgAreaChart({ data = [], series = [], height = 80 }) {
  if (!data || data.length === 0) return <div className="h-20 flex items-center justify-center text-[12px] text-muted-foreground">No data</div>;
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
      <circle cx={CX} cy={CY} r="28" fill="white" />
      <text x={CX} y={CY + 5} textAnchor="middle" fill="#1B2B5E" fontSize="14" fontWeight="bold">{total}</text>
    </svg>
  );
}

function PanelTitle({ Icon, children, right }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      {Icon && <span className="icon-tile !w-8 !h-8 !rounded-lg"><Icon className="w-4 h-4" aria-hidden="true" /></span>}
      <h3 className="text-[14px] font-semibold text-[hsl(var(--blue-900))]">{children}</h3>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

// ─── row 1 ────────────────────────────────────────────────────────────────────

function WelcomeBanner({ admin, alertCount, onRunAggregators, running }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="card-surface p-6 h-full">
      <div className="eyebrow">{greeting}</div>
      <h2 className="h-card mt-3">{admin?.name || admin?.email || 'Admin'}</h2>
      {alertCount > 0 && (
        <div className="mt-2 text-[13px] text-amber-700 font-semibold flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> {alertCount} alert{alertCount !== 1 ? 's' : ''} need attention
        </div>
      )}
      <button
        onClick={onRunAggregators}
        disabled={running}
        className="btn-primary mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-xl text-[14px] font-semibold disabled:opacity-50"
      >
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        Run aggregators
      </button>
    </div>
  );
}

function QuickStats({ monitoring }) {
  if (!monitoring) return (
    <Panel className="h-full flex items-center justify-center">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
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
            className="rounded-xl bg-white border border-border p-3 hover:border-[hsl(var(--blue-700))]/30 hover:shadow-sm transition flex items-center gap-3">
            <span className="icon-tile"><t.Icon className="w-5 h-5" aria-hidden="true" /></span>
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-muted-foreground">{t.label}</div>
              <div className={`text-[20px] font-display font-bold tabular-nums leading-snug ${t.red ? 'text-red-600' : t.amber ? 'text-amber-700' : 'text-[hsl(var(--blue-900))]'}`}>{t.value ?? '—'}</div>
            </div>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

// ─── row 2 ────────────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, Icon, delta, testid }) {
  return (
    <div className="card-surface card-lift p-5 h-full">
      <span className="icon-tile"><Icon className="w-5 h-5" aria-hidden="true" /></span>
      <div className="mt-4 text-[12px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-[28px] font-display font-bold tabular-nums text-[hsl(var(--blue-900))]" data-testid={testid}>{value}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px]">
        {sub && <span className="text-muted-foreground">{sub}</span>}
        {delta != null && (
          <span className={`font-bold ${delta > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
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
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
    </Panel>
  );
  const max = Math.max(1, ...FUNNEL_STEPS.map((s) => funnel[s.key] || 0));
  return (
    <Panel>
      <PanelTitle Icon={Users}>User funnel (90d)</PanelTitle>
      <div className="space-y-2">
        {FUNNEL_STEPS.map((s, i) => {
          const count = funnel[s.key] || 0;
          const prev = i === 0 ? count : (funnel[FUNNEL_STEPS[i - 1].key] || count);
          const drop = prev > 0 && i > 0 ? Math.round((1 - count / prev) * 100) : null;
          const pct = Math.round((count / max) * 100);
          return (
            <Link key={s.key} to={`/admin/users?stage=${s.key}`}
              className="block hover:bg-[hsl(var(--blue-50))] rounded-lg px-2 py-1 -mx-2 transition-colors group">
              <div className="flex justify-between text-[12px] mb-1">
                <span className="text-muted-foreground group-hover:text-[hsl(var(--blue-900))]">{s.label}</span>
                <span className="text-[hsl(var(--blue-900))] font-semibold tabular-nums">{count.toLocaleString()}
                  {drop != null && <span className="text-red-600 ml-1.5 font-normal">↓{drop}%</span>}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[hsl(var(--blue-50))]">
                <div className="h-full rounded-full bg-[hsl(var(--blue-700))]" style={{ width: `${pct}%` }} />
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
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
    </Panel>
  );
  const items = (alerts.items || []).slice(0, 8);
  const SEV_DOT = { critical: 'bg-red-400', high: 'bg-amber-400', low: 'bg-blue-400' };
  return (
    <Panel className="flex flex-col">
      <PanelTitle Icon={AlertTriangle} right={alerts.total > 8 && (
        <Link to="/admin/alerts" className="link-primary text-[12px] inline-flex items-center gap-0.5">
          View all <ArrowUpRight className="w-3 h-3" />
        </Link>
      )}>Alerts ({alerts.total ?? items.length})</PanelTitle>
      {items.length === 0 && <div className="text-[13px] text-muted-foreground">No active alerts.</div>}
      <div className="space-y-2">
        {items.map((al) => (
          <div key={al.id} className="flex items-start gap-2 text-[12.5px]">
            <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${SEV_DOT[al.severity] || SEV_DOT.low}`} />
            <div className="min-w-0">
              <div className="text-[hsl(var(--blue-900))] truncate">{al.message || ALERT_KIND_LABEL?.[al.kind] || al.kind}</div>
              {al.applicant_name && <div className="text-muted-foreground text-[11px]">{al.applicant_name}{al.days != null ? ` · ${al.days}d` : ''}</div>}
            </div>
            {al.case_id && (
              <Link to={`/admin/applications/${al.case_id}`}
                className="link-primary ml-auto shrink-0 text-[12px] whitespace-nowrap">
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
      <PanelTitle Icon={TrendingUp}>90-day trend</PanelTitle>
      <SvgAreaChart
        data={trend || []}
        height={120}
        series={[
          { key: 'signups',      color: '#011CB5', label: 'Signups' },
          { key: 'applications', color: '#F59E0B', label: 'Applications' },
        ]}
      />
      <div className="mt-2 flex gap-4">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[#011CB5] inline-block" /> Signups
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
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
      <PanelTitle Icon={Globe}>Top destinations</PanelTitle>
      {items.length === 0 && <div className="text-[13px] text-muted-foreground">No data yet.</div>}
      <div className="space-y-2.5">
        {items.map((c) => {
          const pct = Math.round((c.count / max) * 100);
          return (
            <div key={c.country_id || c.name}>
              <div className="flex justify-between text-[12.5px] mb-1">
                <span className="text-[hsl(var(--blue-900))]">{c.flag ? `${c.flag} ` : ''}{c.name || c.country_id}</span>
                <span className="text-[hsl(var(--blue-900))] font-semibold tabular-nums">{c.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[hsl(var(--blue-50))]">
                <div className="h-full rounded-full bg-[hsl(var(--blue-700))]" style={{ width: `${pct}%` }} />
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
      <PanelTitle Icon={FileStack}>App status</PanelTitle>
      <div className="flex items-center gap-4">
        <SvgDonut segments={segments} />
        <div className="space-y-1.5">
          {segments.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 text-[11.5px]">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="ml-auto text-[hsl(var(--blue-900))] font-semibold tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}


function initials(email = '') {
  const parts = email.split('@')[0].split(/[._-]/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');
}

function RecentAuditFeed({ activity }) {
  const items = (activity || []).slice(0, 10);
  return (
    <Panel>
      <PanelTitle Icon={History}>Recent audit</PanelTitle>
      {items.length === 0 && <div className="text-[13px] text-muted-foreground">No recent activity.</div>}
      <div className="space-y-2.5">
        {items.map((e, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="icon-tile !w-8 !h-8 !rounded-full text-[11px] font-bold">
              {initials(e.admin_email)}
            </span>
            <div className="min-w-0">
              <div className="text-[12.5px] text-[hsl(var(--blue-900))] truncate capitalize">
                {e.action} {e.entity_type ? `on ${e.entity_type}` : ''}{e.entity_id ? ` #${e.entity_id}` : ''}
              </div>
              <div className="text-[11px] text-muted-foreground">{e.admin_email} · {relativeTime(e.at)}</div>
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
      <Panel><div className="text-red-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div></Panel>
    </div>
  );

  if (loading || !metrics) return (
    <div>
      <AdminHeader title="Overview" />
      <Panel className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blue-700))]" /></Panel>
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
            Icon={Users} delta={users?.new_7d} />
        </div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <KPICard testid="metric-applications" label="Applications" value={applications?.total ?? '—'}
            sub={`${applications?.new_30d ?? 0} in 30d`}
            Icon={FileStack} delta={applications?.new_30d} />
        </div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <KPICard testid="metric-revenue" label="Revenue (est.)" value={inr(revenue?.total_inr ?? 0)}
            sub={`${inr(revenue?.last_30d_inr ?? 0)} in 30d${forecast != null ? ` · ↗ ${inr(forecast)} forecast` : ''}`}
            Icon={Banknote} />
        </div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <KPICard testid="metric-countries" label="Countries live" value={countries?.total ?? '—'}
            sub={`${countries?.no_visa ?? 0} visa-free`}
            Icon={Globe} />
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

        {/* Row 5: Staff workload */}
        <div className="col-span-12">
          <StaffWorkloadCard />
        </div>
      </div>
    </div>
  );
}

function StaffWorkloadCard() {
  const { token } = useAdminAuth();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    adminClient(token).get('/staff/workload')
      .then((r) => {
        const staff = r.data?.staff || r.data || [];
        setRows([...staff].sort((a, b) => (b.open_cases ?? 0) - (a.open_cases ?? 0)));
      })
      .catch(() => setRows([]));
  }, [token]);

  return (
    <Panel>
      <PanelTitle Icon={Users}>Staff workload</PanelTitle>
      {rows === null && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-[#011CB5]" /></div>}
      {rows !== null && rows.length === 0 && <p className="text-[13px] text-muted-foreground">No workload data available.</p>}
      {rows !== null && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.14em] font-bold text-muted-foreground border-b border-border">
                <th className="pb-2 pr-4">Staff</th>
                <th className="pb-2 pr-4 text-right">Open cases</th>
                <th className="pb-2 text-right">Avg days open</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-4">
                    <div className="font-semibold text-[hsl(var(--blue-900))]">{s.name || s.email || s.id}</div>
                    {s.name && s.email && <div className="text-[11px] text-muted-foreground">{s.email}</div>}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <span className={`font-bold text-[14px] ${s.open_cases > 10 ? 'text-red-600' : s.open_cases > 5 ? 'text-amber-600' : 'text-[hsl(var(--blue-900))]'}`}>
                      {s.open_cases ?? 0}
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-muted-foreground">
                    {s.avg_days != null ? `${Number(s.avg_days).toFixed(1)}d` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

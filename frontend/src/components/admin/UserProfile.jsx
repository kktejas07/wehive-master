import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, AlertTriangle, Ban, RotateCcw, Bell, Check, Clock, X, Copy, UserPlus } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { inr, STATUS_COLORS, canWrite } from '../../lib/admin';
import { Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import { useUserProfileViewModel } from '../../viewmodels/useUserProfileViewModel'; // stays in viewmodels/ (admin-wide)
import { avatarUrl } from '../../lib/avatars';

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const label = (s) => (s || 'draft').replace(/_/g, ' ');
const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-bold disabled:opacity-50';

function SectionTitle({ children }) {
  return <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-2">{children}</div>;
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-t first:border-t-0 border-white/5 text-[13px]">
      <span className="text-slate-400">{k}</span>
      <span className="text-slate-100 text-right break-all">{v || '—'}</span>
    </div>
  );
}

// ─── subcomponents ────────────────────────────────────────────────────────────

function DropOffBanner({ signal, days }) {
  if (!signal || signal === 'none') return null;
  const isRed = signal === 'call_user';
  return (
    <div className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3 text-[13px] font-semibold"
      style={{
        background: isRed ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
        border: `1px solid ${isRed ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
        color: isRed ? '#fca5a5' : '#fcd34d',
      }}>
      <AlertTriangle className="w-4 h-4 shrink-0" />
      {signal === 'call_user' ? `Inactive ${days}d — call this user` :
       signal === 'assign_agent' ? `Inactive ${days}d — assign a consultant` :
       `Inactive ${days}d — send a reminder`}
    </div>
  );
}

function UserIdentityCard({ u, days_inactive }) {
  const av = avatarUrl({ seed: u.id || u.email, gender: 'hero' });
  return (
    <Panel>
      <div className="flex items-start gap-4">
        <div className="shrink-0" style={{ padding: 3, background: 'linear-gradient(135deg, #F59E0B, #1B2B5E)', borderRadius: '50%' }}>
          <img src={av} alt="" className="h-20 w-20 rounded-full block bg-[#1B2B5E]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-[18px] text-white truncate">{u.name || 'Unnamed user'}</div>
          <div className="text-[13px] text-slate-400 truncate">{u.email}</div>
          {u.phone && <div className="text-[13px] text-slate-400">{u.phone}</div>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {u.suspended && <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-red-500/20 text-red-200" data-testid="user-suspended-chip">Suspended</span>}
            {u.is_super_admin && <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-red-500/15 text-red-300">Super admin</span>}
            {u.is_admin && !u.is_super_admin && <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-red-500/15 text-red-300">Admin</span>}
            {u.is_staff && <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-blue-500/15 text-blue-200">Staff</span>}
            {u.is_premium && <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-amber-500/15 text-amber-300">Premium</span>}
            {days_inactive != null && days_inactive > 7 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-red-500/15 text-red-300">{days_inactive}d inactive</span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <SectionTitle>Account</SectionTitle>
        <Row k="Email" v={u.email && <>{u.email} {u.email_verified ? <span className="text-emerald-300">✓</span> : <span className="text-amber-300">(unverified)</span>}</>} />
        <Row k="Phone" v={u.phone} />
        <Row k="Plan" v={u.plan_id || (u.is_premium ? 'Premium' : 'Free')} />
        <Row k="Joined" v={fmtDate(u.created_at)} />
        <Row k="Last login" v={u.last_login_at ? fmt(u.last_login_at) : null} />
        <Row k="ID" v={<span className="font-mono text-[12px]">{u.id}</span>} />
      </div>
    </Panel>
  );
}

const REMINDER_TEMPLATES = [
  { id: 'generic',         label: 'General reminder' },
  { id: 'docs_pending',    label: 'Documents pending' },
  { id: 'payment_pending', label: 'Payment pending' },
];

function ReminderModal({ vm, onClose }) {
  const { toast } = useToast();
  const [template, setTemplate] = useState('generic');
  const [note, setNote] = useState('');

  const send = async () => {
    try {
      await vm.sendReminder(template, note.trim() || null);
      toast({ title: 'Reminder sent' });
      onClose();
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="rounded-2xl bg-[#111632] border border-white/10 w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[16px] font-semibold text-white mb-4">Send reminder</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-semibold text-slate-300 mb-1">Template</label>
            <select value={template} onChange={(e) => setTemplate(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-black/30 border border-white/10 text-[13px] text-white outline-none">
              {REMINDER_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-slate-300 mb-1">Optional note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500}
              placeholder="Add a personal note…"
              className="w-full h-10 px-3 rounded-xl bg-black/30 border border-white/10 text-[13px] text-white placeholder:text-slate-500 outline-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-white/10 text-white text-[13px] font-semibold">Cancel</button>
          <button onClick={send} disabled={vm.busy}
            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold disabled:opacity-50">
            {vm.busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuspendForm({ vm, onCancel }) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      await vm.suspend(reason.trim());
      toast({ title: 'Account suspended' });
    } catch (err) {
      toast({ title: 'Failed', description: err?.response?.data?.detail || err.message, variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 space-y-2" data-testid="suspend-form">
      <label htmlFor="suspend-reason" className="block text-[12px] text-slate-300">
        Reason (kept in audit log; user only sees "Account suspended")
      </label>
      <textarea
        id="suspend-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={500}
        className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-[13.5px] text-white outline-none"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={vm.busy || reason.trim().length < 3} className={`${btn} bg-red-600 hover:bg-red-700 text-white`}>
          {vm.busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} Suspend account
        </button>
        <button type="button" onClick={onCancel} className={`${btn} bg-white/5 hover:bg-white/10 text-slate-200`}>Cancel</button>
      </div>
    </form>
  );
}

const JOURNEY_STEPS = [
  { key: 'registered',          label: 'Registered' },
  { key: 'email_verified',      label: 'Email verified' },
  { key: 'profile_complete',    label: 'Profile complete' },
  { key: 'first_application',   label: 'Applied' },
  { key: 'documents_uploaded',  label: 'Docs uploaded' },
  { key: 'payment_made',        label: 'Payment made' },
  { key: 'visa_approved',       label: 'Visa approved' },
];

function JourneyTimeline({ stages, currentStage, journey_stage }) {
  const active = journey_stage || currentStage;
  const stageMap = {};
  (stages || []).forEach((s) => { stageMap[s.key || s] = s; });

  return (
    <Panel>
      <SectionTitle>Journey · {active?.replace(/_/g, ' ')}</SectionTitle>
      <div className="space-y-2">
        {JOURNEY_STEPS.map((step) => {
          const info = stageMap[step.key] || {};
          const done = info.done === true || info.completed === true || info.date;
          const blocked = info.blocked || info.blocked_reason;
          const isActive = step.key === active;

          let Icon = done ? Check : blocked ? X : Clock;
          let iconClass = done ? 'text-emerald-400 bg-emerald-500/15' : blocked ? 'text-red-400 bg-red-500/15' : isActive ? 'text-amber-400 bg-amber-500/15' : 'text-slate-600 bg-white/5';

          return (
            <div key={step.key} className="flex items-start gap-3">
              <span className={`mt-0.5 h-5 w-5 rounded-full inline-flex items-center justify-center shrink-0 ${iconClass}`}>
                <Icon className="w-3 h-3" />
              </span>
              <div className="min-w-0">
                <div className={`text-[13px] font-semibold ${isActive ? 'text-amber-300' : done ? 'text-white' : 'text-slate-500'}`}>{step.label}</div>
                {info.date && <div className="text-[11px] text-slate-500">{fmtDate(info.date)}</div>}
                {blocked && info.blocked_reason && <div className="text-[11px] text-red-300 mt-0.5">Blocked: {info.blocked_reason}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function ActivityHeatmap({ data }) {
  if (!data || data.length === 0) return (
    <Panel>
      <SectionTitle>Activity (last 90 days)</SectionTitle>
      <div className="text-[12px] text-slate-500">No recent activity.</div>
    </Panel>
  );
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <Panel>
      <SectionTitle>Activity (last 90 days)</SectionTitle>
      <div className="flex flex-wrap gap-0.5">
        {data.map((d) => {
          const opacity = 0.08 + (d.count / max) * 0.92;
          return (
            <div
              key={d.date}
              title={`${d.date}: ${d.count}`}
              className="h-[11px] w-[11px] rounded-sm"
              style={{ background: `rgba(1,28,181,${opacity})` }}
            />
          );
        })}
      </div>
    </Panel>
  );
}

function ApplicationsList({ applications }) {
  return (
    <Panel>
      <SectionTitle>Applications ({(applications || []).length})</SectionTitle>
      {(!applications || applications.length === 0) && <div className="text-[13px] text-slate-400">No applications.</div>}
      <div className="space-y-2">
        {(applications || []).map((a) => (
          <Link key={a.id} to={`/admin/applications/${a.id}`}
            className="block rounded-xl border border-white/[0.06] p-3 hover:bg-white/5 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-white truncate">
                  {a.flag ? `${a.flag} ` : ''}{a.country_name || a.country_id?.toUpperCase() || '—'}
                  <span className="text-slate-400 font-normal"> · {a.visa_type || 'visa'}</span>
                </div>
                <div className="text-[11.5px] text-slate-400 mt-0.5">
                  Updated {fmtDate(a.updated_at || a.created_at)}
                  {a.assigned_agent && ` · ${a.assigned_agent}`}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${STATUS_COLORS?.[a.status] || 'bg-white/5 text-slate-300'}`}>
                  {label(a.status)}
                </span>
                <div className="flex gap-1">
                  {a.is_stale && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Stale" />}
                  {a.docs_pending && <span className="h-1.5 w-1.5 rounded-full bg-red-400" title="Docs pending" />}
                  {a.appointment_due && <span className="h-1.5 w-1.5 rounded-full bg-blue-400" title="Appointment" />}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try {
      navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <button onClick={copy} className="text-slate-400 hover:text-white transition-colors" title="Copy">
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function PaymentHistory({ payments, paidTotal }) {
  const CHIP = { paid: 'bg-emerald-500/15 text-emerald-300', pending: 'bg-amber-500/15 text-amber-300', failed: 'bg-red-500/15 text-red-300' };
  return (
    <Panel>
      <SectionTitle>Payments · {inr(paidTotal || 0)} paid</SectionTitle>
      {(!payments || payments.length === 0) && <div className="text-[13px] text-slate-400">No payments.</div>}
      <div className="space-y-2">
        {(payments || []).map((p) => (
          <div key={p.id} className="flex items-start justify-between gap-3 py-1.5 border-t first:border-t-0 border-white/5">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-emerald-300">{inr(p.amount_inr || 0)}</div>
              <div className="text-[11.5px] text-slate-400">{fmtDate(p.created_at)} · {p.plan_id || '—'}</div>
              {p.razorpay_id && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[11px] text-slate-500 truncate max-w-[140px]">{p.razorpay_id}</span>
                  <CopyButton text={p.razorpay_id} />
                </div>
              )}
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold capitalize shrink-0 ${CHIP[p.status] || 'bg-white/5 text-slate-300'}`}>
              {p.status}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function EmailHistory({ emails }) {
  const CHIP = { sent: 'bg-blue-500/15 text-blue-300', bounced: 'bg-red-500/15 text-red-300', opened: 'bg-emerald-500/15 text-emerald-300', delivered: 'bg-blue-500/15 text-blue-300' };
  return (
    <Panel>
      <SectionTitle>Email history</SectionTitle>
      <div className="space-y-1">
        {emails.map((e) => (
          <div key={e.id} className="flex items-start justify-between gap-3 py-1.5 border-t first:border-t-0 border-white/5">
            <div className="min-w-0">
              <div className="text-[13px] text-white truncate">{e.subject}</div>
              <div className="text-[11.5px] text-slate-500">{fmtDate(e.sent_at)}</div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold capitalize shrink-0 ${CHIP[e.status] || 'bg-white/5 text-slate-300'}`}>
              {e.status}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ─── main export ──────────────────────────────────────────────────────────────

export default function UserProfile() {
  const { id } = useParams();
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const vm = useUserProfileViewModel(id);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [suspending, setSuspending] = useState(false);

  const back = (
    <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-[13px] text-slate-300 hover:text-white">
      <ArrowLeft className="w-4 h-4" /> All users
    </Link>
  );

  if (vm.error) return (
    <div data-testid="admin-user-profile">
      {back}
      <Panel className="mt-4 text-center text-red-300">
        <div role="alert">
          <AlertTriangle className="w-5 h-5 inline mr-1.5" />
          {vm.error.status === 404 ? 'This user no longer exists.' : `Could not load user: ${vm.error.message}`}
          {vm.error.status !== 404 && <button onClick={vm.load} className="ml-2 underline text-slate-200">Retry</button>}
        </div>
      </Panel>
    </div>
  );

  if (vm.loading || !vm.data) return (
    <div className="py-16 text-center" data-testid="admin-user-profile">
      <Loader2 className="w-6 h-6 animate-spin inline text-blue-300" />
    </div>
  );

  const {
    user: u,
    applications,
    payments,
    history,
    journey_stage,
    journey_stages,
    days_inactive,
    drop_off_signal,
    activity_heatmap,
    email_history,
    paid_total_inr,
  } = vm.data;

  const handleUnsuspend = async () => {
    try {
      await vm.unsuspend();
      toast({ title: 'Account reinstated' });
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    }
  };

  return (
    <div data-testid="admin-user-profile">
      {back}
      {reminderOpen && <ReminderModal vm={vm} onClose={() => setReminderOpen(false)} />}

      {/* Header */}
      <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[24px] font-display font-bold text-white">{u.name || u.email || u.phone || 'Unnamed user'}</h1>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] uppercase tracking-[0.14em] font-bold">
            {drop_off_signal && drop_off_signal !== 'none' && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200">
                {drop_off_signal === 'call_user' ? 'Call user' : drop_off_signal === 'assign_agent' ? 'Assign agent' : 'Send reminder'}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {canWrite(admin, 'manage') && !u.is_super_admin && (
            <button onClick={() => setReminderOpen(true)} disabled={vm.busy}
              className={`${btn} bg-blue-500/15 hover:bg-blue-500/25 text-blue-200`}>
              <Bell className="w-3.5 h-3.5" /> Remind
            </button>
          )}
          {canWrite(admin, 'manage') && !u.is_super_admin && (
            <button
              className={`${btn} bg-white/5 hover:bg-white/10 text-slate-300`}
              onClick={() => toast({ title: 'Coming soon', description: 'Agent assignment is in progress.' })}
              disabled={vm.busy}>
              <UserPlus className="w-3.5 h-3.5" /> Assign agent
            </button>
          )}
          {!u.is_super_admin && canWrite(admin, 'manage') && (
            u.suspended ? (
              <button data-testid="unsuspend-user" disabled={vm.busy} onClick={handleUnsuspend}
                className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}>
                <RotateCcw className="w-3.5 h-3.5" /> Reinstate
              </button>
            ) : !suspending ? (
              <button data-testid="suspend-user" onClick={() => setSuspending(true)}
                className={`${btn} bg-red-500/15 hover:bg-red-500/25 text-red-200`}>
                <Ban className="w-3.5 h-3.5" /> Suspend
              </button>
            ) : null
          )}
        </div>
      </div>

      <DropOffBanner signal={drop_off_signal} days={days_inactive} />

      {suspending && !u.suspended && (
        <Panel className="mt-4">
          <SuspendForm vm={vm} onCancel={() => setSuspending(false)} />
        </Panel>
      )}
      {u.suspended && (
        <Panel className="mt-4 border-red-500/30">
          <div className="text-[13px] text-red-200">
            Suspended {fmt(u.suspended_at)}{u.suspended_reason ? ` — ${u.suspended_reason}` : ''}. They are signed out of every API call until reinstated.
          </div>
        </Panel>
      )}

      {/* Two-column bento */}
      <div className="mt-4 grid lg:grid-cols-[2fr_3fr] gap-4 items-start">
        {/* LEFT: identity + journey + heatmap + admin history */}
        <div className="space-y-4">
          <UserIdentityCard u={u} days_inactive={days_inactive} />
          {journey_stages && journey_stage && (
            <JourneyTimeline stages={journey_stages} currentStage={journey_stage} journey_stage={journey_stage} />
          )}
          <ActivityHeatmap data={activity_heatmap} />
          <Panel>
            <SectionTitle>Admin history</SectionTitle>
            {(!history || history.length === 0) && <div className="text-[13px] text-slate-400">No admin actions on this account.</div>}
            {(history || []).map((h, i) => (
              <div key={i} className="py-1.5 border-t first:border-t-0 border-white/5 text-[13px]">
                <span className="text-white font-semibold capitalize">{h.action}</span>
                <span className="text-slate-400"> by {h.admin_email || 'system'} · {fmt(h.at)}</span>
                {h.extra?.reason && <div className="text-slate-300 text-[12.5px]">"{h.extra.reason}"</div>}
              </div>
            ))}
          </Panel>
        </div>

        {/* RIGHT: applications + payments + email history */}
        <div className="space-y-4">
          <ApplicationsList applications={applications} />
          <PaymentHistory payments={payments} paidTotal={paid_total_inr || 0} />
          {email_history && email_history.length > 0 && <EmailHistory emails={email_history} />}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, AlertTriangle, Ban, RotateCcw } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, inr, STATUS_COLORS } from '../../lib/admin';
import { Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const errMsg = (e) => e?.response?.data?.detail || e.message;
const label = (s) => (s || 'draft').replace(/_/g, ' ');
const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-bold disabled:opacity-50';

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-t first:border-t-0 border-white/5 text-[13px]">
      <span className="text-slate-400">{k}</span>
      <span className="text-slate-100 text-right break-all">{v || '—'}</span>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-2">{children}</div>;
}

function SuspendForm({ onSubmit, onCancel, busy }) {
  const [reason, setReason] = useState('');
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(reason.trim()); }}
      className="mt-3 space-y-2"
      data-testid="suspend-form"
    >
      <label htmlFor="suspend-reason" className="block text-[12px] text-slate-300">
        Reason (kept in the audit log; the user only sees "Account suspended")
      </label>
      <textarea
        id="suspend-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={500}
        className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 focus:border-[hsl(var(--blue-700))] text-[13.5px] text-white outline-none"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={busy || reason.trim().length < 3} className={`${btn} bg-red-600 hover:bg-red-700 text-white`}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} Suspend account
        </button>
        <button type="button" onClick={onCancel} className={`${btn} bg-white/5 hover:bg-white/10 text-slate-200`}>Cancel</button>
      </div>
    </form>
  );
}

export default function UserProfile() {
  const { id } = useParams();
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [suspending, setSuspending] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await adminClient(token).get(`/users/${id}/profile`);
      setData(r.data);
    } catch (e) {
      setError({ status: e?.response?.status, message: errMsg(e) });
    }
  }, [token, id]);

  useEffect(() => { load(); }, [load]);

  const act = async (path, body, title) => {
    setBusy(true);
    try {
      const r = await adminClient(token).post(`/users/${id}/${path}`, body);
      setData((d) => ({ ...d, user: r.data }));
      setSuspending(false);
      toast({ title });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: errMsg(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const back = (
    <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-[13px] text-slate-300 hover:text-white">
      <ArrowLeft className="w-4 h-4" /> All users
    </Link>
  );

  if (error) {
    return (
      <div data-testid="admin-user-profile">
        {back}
        <Panel className="mt-4 text-center text-red-300">
          <div role="alert">
            <AlertTriangle className="w-5 h-5 inline mr-1.5" />
            {error.status === 404 ? 'This user no longer exists.' : `Could not load user: ${error.message}`}
            {error.status !== 404 && <button onClick={load} className="ml-2 underline text-slate-200">Retry</button>}
          </div>
        </Panel>
      </div>
    );
  }
  if (!data) {
    return <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin inline text-blue-300" /></div>;
  }

  const { user: u, applications, payments, history } = data;
  return (
    <div data-testid="admin-user-profile">
      {back}
      <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[24px] font-display font-bold text-white">{u.name || u.email || u.phone || 'Unnamed user'}</h1>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] uppercase tracking-[0.14em] font-bold">
            {u.suspended && <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-200" data-testid="user-suspended-chip">Suspended</span>}
            {u.is_super_admin && <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-300">Super admin</span>}
            {u.is_admin && !u.is_super_admin && <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-300">Admin</span>}
            {u.is_staff && <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-200">Staff</span>}
            {u.is_premium && <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">Premium</span>}
          </div>
        </div>
        {!u.is_super_admin && (
          u.suspended ? (
            <button
              data-testid="unsuspend-user"
              disabled={busy}
              onClick={() => act('unsuspend', undefined, 'Account reinstated')}
              className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reinstate
            </button>
          ) : !suspending && (
            <button data-testid="suspend-user" onClick={() => setSuspending(true)} className={`${btn} bg-red-500/15 hover:bg-red-500/25 text-red-200`}>
              <Ban className="w-3.5 h-3.5" /> Suspend
            </button>
          )
        )}
      </div>

      {suspending && !u.suspended && (
        <Panel className="mt-4">
          <SuspendForm busy={busy} onCancel={() => setSuspending(false)} onSubmit={(reason) => act('suspend', { reason }, 'Account suspended')} />
        </Panel>
      )}
      {u.suspended && (
        <Panel className="mt-4 border-red-500/30">
          <div className="text-[13px] text-red-200">
            Suspended {fmt(u.suspended_at)}{u.suspended_reason ? ` — ${u.suspended_reason}` : ''}. They are signed out of every API call until reinstated.
          </div>
        </Panel>
      )}

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <Panel>
          <SectionTitle>Account</SectionTitle>
          <Row k="Email" v={u.email && <>{u.email} {u.email_verified ? <span className="text-emerald-300">✓</span> : <span className="text-amber-300">(unverified)</span>}</>} />
          <Row k="Phone" v={u.phone} />
          <Row k="Plan" v={u.plan_id || (u.is_premium ? 'Premium' : 'Free')} />
          <Row k="Joined" v={fmtDate(u.created_at)} />
          <Row k="Last login" v={u.last_login_at ? fmt(u.last_login_at) : null} />
          <Row k="ID" v={<span className="font-mono text-[12px]">{u.id}</span>} />
        </Panel>
        <Panel>
          <SectionTitle>Payments · {inr(data.paid_total_inr || 0)} paid</SectionTitle>
          {payments.length === 0 && <div className="text-[13px] text-slate-400">No payments.</div>}
          {payments.map((p) => (
            <div key={p.id} className="flex justify-between gap-3 py-1.5 border-t first:border-t-0 border-white/5 text-[13px]">
              <span className="text-slate-300">{fmtDate(p.created_at)} · {p.plan_id || '—'}</span>
              <span className={p.status === 'paid' ? 'text-emerald-300' : 'text-slate-400'}>{inr(p.amount_inr || 0)} · {p.status}</span>
            </div>
          ))}
        </Panel>
      </div>

      <Panel className="mt-4">
        <SectionTitle>Applications ({applications.length})</SectionTitle>
        {applications.length === 0 && <div className="text-[13px] text-slate-400">No applications.</div>}
        {applications.map((a) => (
          <Link
            key={a.id}
            to={`/admin/applications/${a.id}`}
            className="flex justify-between gap-3 py-2 border-t first:border-t-0 border-white/5 text-[13px] hover:bg-white/5 -mx-2 px-2 rounded"
          >
            <span className="text-white">{a.country_name || a.country_id?.toUpperCase() || '—'} <span className="text-slate-400">· {a.visa_type || 'visa'}</span></span>
            <span className="flex items-center gap-2">
              <span className="text-slate-400 text-[12px]">{fmtDate(a.created_at)}</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${STATUS_COLORS?.[a.status] || 'bg-white/5 text-slate-300'}`}>{label(a.status)}</span>
            </span>
          </Link>
        ))}
      </Panel>

      <Panel className="mt-4">
        <SectionTitle>Admin history</SectionTitle>
        {history.length === 0 && <div className="text-[13px] text-slate-400">No admin actions on this account.</div>}
        {history.map((h, i) => (
          <div key={i} className="py-1.5 border-t first:border-t-0 border-white/5 text-[13px]">
            <span className="text-white font-semibold capitalize">{h.action}</span>
            <span className="text-slate-400"> by {h.admin_email || 'system'} · {fmt(h.at)}</span>
            {h.extra?.reason && <div className="text-slate-300 text-[12.5px]">“{h.extra.reason}”</div>}
          </div>
        ))}
      </Panel>
    </div>
  );
}

import { useState } from 'react';
import { Loader2, Gift, CheckCircle2, Info, Lock } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { apiClient, canWrite } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

const errText = (e) => {
  const d = e?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d.length) return d[0].msg;
  return e.message;
};

// Backend (routes_referrals.py) only exposes one admin-callable route: POST /referrals/reward.
// /code, /stats, /claim and /my-code are student-scoped (student token) and there is no
// admin list endpoint, so this tab is a reward-processing tool plus a session log.
export default function ReferralsTab() {
  const { token, admin: me } = useAdminAuth();
  const { toast } = useToast();
  const [userId, setUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);
  const writable = canWrite(me, 'finance');

  const process = async (e) => {
    e.preventDefault();
    const id = userId.trim();
    if (!id) return;
    if (!window.confirm(`Mark the pending referral for user ${id} as earned and credit the referrer?`)) return;
    setBusy(true);
    try {
      const { data } = await apiClient(token).post('/referrals/reward', null, { params: { referred_user_id: id } });
      setLog((l) => [{ id, message: data.message, ok: true, at: new Date() }, ...l]);
      toast({ title: 'Referral processed', description: data.message });
      setUserId('');
    } catch (err) {
      const message = errText(err);
      setLog((l) => [{ id, message, ok: false, at: new Date() }, ...l]);
      toast({ title: 'Could not process referral', description: message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="admin-referrals-tab">
      <AdminHeader
        title="Referrals"
        subtitle="Credit a referrer once the person they referred has completed a paid application."
      />

      <Panel className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-3">Process a referral reward</div>
        {!writable && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-[12.5px] text-slate-300">
            <Lock className="w-3.5 h-3.5" /> Your role can view this tab but cannot credit rewards.
          </div>
        )}
        <form className="grid sm:grid-cols-[1fr_auto] gap-3" onSubmit={process}>
          <input
            data-testid="admin-referrals-user-id"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Referred user ID"
            aria-label="Referred user ID"
            disabled={!writable}
            className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-[13.5px] text-white placeholder:text-slate-500 disabled:opacity-60"
          />
          <button
            data-testid="admin-referrals-reward-btn"
            type="submit"
            disabled={busy || !writable || !userId.trim()}
            className="h-10 px-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white text-[13.5px] font-bold disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Gift className="w-3.5 h-3.5" /> Credit referrer</>}
          </button>
        </form>
        <p className="mt-3 flex items-start gap-1.5 text-[11.5px] text-slate-400">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Use the ID of the referred (new) user. If they have no pending referral, nothing changes. Crediting is one-time per referred user.
        </p>
      </Panel>

      <Panel className="overflow-x-auto p-0">
        <table className="min-w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-slate-400 bg-white/5">
              <th className="px-5 py-3">Referred user</th>
              <th className="px-5 py-3">Result</th>
              <th className="px-5 py-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {log.length === 0 && (
              <tr><td colSpan={3} className="px-5 py-10 text-center text-slate-400">
                <Gift className="w-5 h-5 inline mr-2" /> No rewards processed in this session.
              </td></tr>
            )}
            {log.map((r, i) => (
              <tr key={`${r.id}-${i}`} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-5 py-3 font-mono text-[12.5px] text-slate-100">{r.id}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${r.ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                    {r.ok && <CheckCircle2 className="w-3 h-3" />} {r.message}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-400 text-[12.5px]">{r.at.toLocaleTimeString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <p className="mt-3 text-[11.5px] text-slate-400">
        The backend has no admin endpoint for listing referral codes or transactions yet; this log only shows actions taken since you opened the page.
      </p>
    </div>
  );
}

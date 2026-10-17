import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, Search, CreditCard, AlertTriangle, Undo2 } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, inr } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import Pagination from './Pagination';
import { useDebouncedValue } from '../../hooks/use-debounced-value';
import { useToast } from '../../hooks/use-toast';
import { useDialogA11y } from '../../hooks/use-dialog-a11y';

const PAGE_SIZE = 25;
const STATUSES = ['all', 'paid', 'partially_refunded', 'refunded', 'created', 'failed', 'mock'];
const PILL = {
  paid: 'bg-emerald-500/15 text-emerald-300',
  refunded: 'bg-blue-500/15 text-blue-200',
  partially_refunded: 'bg-blue-500/15 text-blue-200',
  created: 'bg-amber-500/15 text-amber-300',
  failed: 'bg-red-500/15 text-red-300',
  mock: 'bg-white/10 text-slate-300',
};
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

function RefundDialog({ payment, token, onClose, onDone }) {
  const { toast } = useToast();
  const left = (payment.amount_inr || 0) - (payment.refunded_inr || 0);
  const [amount, setAmount] = useState(String(left));
  const [reason, setReason] = useState('');
  const [revoke, setRevoke] = useState(true);
  const [busy, setBusy] = useState(false);
  const dialogProps = useDialogA11y(true, onClose);
  const n = Number(amount);
  const valid = Number.isInteger(n) && n > 0 && n <= left && reason.trim().length >= 3;
  const full = n === left;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await adminClient(token).post(`/payments/${payment.id}/refund`, {
        amount_inr: n, reason: reason.trim(), revoke_premium: revoke,
      });
      toast({ title: `Refunded ${inr(n)}`, description: data.premium_revoked ? 'Premium access removed.' : 'Money reaches the customer in 5–7 working days.' });
      onDone();
    } catch (err) {
      toast({ title: 'Refund failed', description: err?.response?.data?.detail || err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full h-10 px-3 rounded-xl bg-black/30 border border-white/10 text-[14px] text-white outline-none focus:border-[hsl(var(--blue-700))]';
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <form {...dialogProps} onSubmit={submit} onClick={(e) => e.stopPropagation()} data-testid="refund-dialog"
        className="w-full max-w-md rounded-2xl bg-[#111632] border border-white/10 p-6 space-y-3">
        <h3 className="text-[16px] font-semibold text-white">Refund {payment.user?.name || payment.user?.email || 'payment'}</h3>
        <p className="text-[12.5px] text-slate-400">
          Paid {inr(payment.amount_inr)}{payment.refunded_inr ? `, ${inr(payment.refunded_inr)} already refunded` : ''}. Goes back to the original card/UPI through Razorpay.
        </p>
        <label htmlFor="refund-amount" className="block text-[12px] font-semibold text-slate-300">Amount (₹, at most {left.toLocaleString('en-IN')})</label>
        <input id="refund-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} className={field} />
        <label htmlFor="refund-reason" className="block text-[12px] font-semibold text-slate-300">Reason (kept in the audit log)</label>
        <textarea id="refund-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className={`${field} h-auto py-2`} />
        {full && (
          <label className="flex items-center gap-2 text-[13px] text-slate-200">
            <input type="checkbox" checked={revoke} onChange={(e) => setRevoke(e.target.checked)} />
            Remove premium access (unless another paid order covers them)
          </label>
        )}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[13px] font-semibold">Cancel</button>
          <button type="submit" disabled={!valid || busy} data-testid="refund-submit"
            className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Refund {valid ? inr(n) : ''}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PaymentsTab() {
  const { token, admin } = useAdminAuth();
  const isSuper = !!admin?.is_super_admin;
  const [refunding, setRefunding] = useState(null);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q.trim());
  const [skip, setSkip] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { setSkip(0); }, [dq, status]);

  const seq = useRef(0);
  const load = useCallback(async () => {
    const id = ++seq.current;
    setData(null);
    setError('');
    try {
      const r = await adminClient(token).get('/payments', { params: { status, q: dq || undefined, limit: PAGE_SIZE, skip } });
      if (id === seq.current) setData(r.data);
    } catch (e) {
      if (id !== seq.current) return;
      setData({ items: [], total: 0 });
      setError(e?.response?.data?.detail || e.message);
    }
  }, [token, status, dq, skip]);

  useEffect(() => { load(); }, [load]);

  const totals = data?.totals;

  return (
    <div data-testid="admin-payments-tab">
      <AdminHeader title="Payments" subtitle="Razorpay orders and their outcome. Read-only." />

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <Panel>
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">Total paid (net of refunds)</div>
          <div data-testid="admin-payments-total-paid" className="mt-1 text-[26px] font-display font-bold text-emerald-300 tabular-nums">
            {totals ? inr(totals.paid_inr) : '…'}
          </div>
        </Panel>
        <Panel>
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">Paid orders</div>
          <div data-testid="admin-payments-paid-count" className="mt-1 text-[26px] font-display font-bold text-white tabular-nums">
            {totals ? totals.paid_count : '…'}
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              data-testid="admin-payments-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search payer, email or Razorpay id…"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 focus:border-[hsl(var(--blue-700))] text-[13.5px] text-white placeholder:text-slate-500 outline-none"
            />
          </div>
          <select
            data-testid="admin-payments-status-filter"
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-[13.5px] text-white"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
          </select>
        </div>
        <p className="mt-3 text-[12px] text-slate-400">
          {isSuper ? 'Refunds go through Razorpay and are recorded in the audit log.' : 'Only a super admin can issue refunds.'}
        </p>
      </Panel>

      <Panel className="mt-4 overflow-x-auto p-0">
        <table className="min-w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-slate-400 bg-white/5">
              <th className="px-5 py-3">Payer</th>
              <th className="px-5 py-3">Plan</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Razorpay</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {data === null && (
              <tr><td colSpan={7} className="px-5 py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-blue-300" /></td></tr>
            )}
            {error && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-red-300" role="alert">
                <AlertTriangle className="w-4 h-4 inline mr-1.5" /> Could not load payments: {error}{' '}
                <button onClick={load} className="underline text-slate-200 ml-1">Retry</button>
              </td></tr>
            )}
            {data && !error && data.items.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                <CreditCard className="w-5 h-5 inline mr-2" /> No payments found.
              </td></tr>
            )}
            {data?.items.map((p) => (
              <tr key={p.id} data-testid={`admin-payment-row-${p.id}`} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-5 py-3">
                  <div className="font-bold text-white">{p.user?.name || '—'}</div>
                  <div className="text-[12px] text-slate-400">{p.user?.email || p.user?.phone || '—'}</div>
                </td>
                <td className="px-5 py-3 text-slate-300">{p.plan_id || '—'}</td>
                <td className="px-5 py-3 font-bold text-white tabular-nums">
                  {inr(p.amount_inr)}
                  {p.refunded_inr > 0 && <div className="text-[11.5px] font-normal text-blue-200">−{inr(p.refunded_inr)} refunded</div>}
                </td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] font-bold whitespace-nowrap ${PILL[p.status] || PILL.mock}`}>{(p.status || '').replace('_', ' ')}</span>
                </td>
                <td className="px-5 py-3 font-mono text-[11.5px] text-slate-400">
                  <div>{p.razorpay_order_id || '—'}</div>
                  <div>{p.razorpay_payment_id || ''}</div>
                </td>
                <td className="px-5 py-3 text-slate-400 text-[12.5px] whitespace-nowrap">{fmt(p.created_at)}</td>
                <td className="px-5 py-3 text-right">
                  {isSuper && ['paid', 'partially_refunded'].includes(p.status) && (
                    <button
                      data-testid={`refund-${p.id}`}
                      onClick={() => setRefunding(p)}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-[11.5px] font-bold text-slate-200"
                    >
                      <Undo2 className="w-3 h-3" /> Refund
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.total > 0 && (
          <div className="px-5 pb-3"><Pagination skip={skip} limit={PAGE_SIZE} total={data.total} onPageChange={setSkip} /></div>
        )}
      </Panel>
      {refunding && (
        <RefundDialog payment={refunding} token={token} onClose={() => setRefunding(null)} onDone={() => { setRefunding(null); load(); }} />
      )}
    </div>
  );
}

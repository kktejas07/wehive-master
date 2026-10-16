import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, Search, CreditCard, AlertTriangle } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, inr } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import Pagination from './Pagination';
import { useDebouncedValue } from '../../hooks/use-debounced-value';

const PAGE_SIZE = 25;
const STATUSES = ['all', 'paid', 'created', 'failed', 'mock'];
const PILL = {
  paid: 'bg-emerald-500/15 text-emerald-300',
  created: 'bg-amber-500/15 text-amber-300',
  failed: 'bg-red-500/15 text-red-300',
  mock: 'bg-white/10 text-slate-300',
};
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export default function PaymentsTab() {
  const { token } = useAdminAuth();
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
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">Total paid</div>
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
        <p className="mt-3 text-[12px] text-slate-400">Refunds are issued from the Razorpay dashboard.</p>
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
            </tr>
          </thead>
          <tbody>
            {data === null && (
              <tr><td colSpan={6} className="px-5 py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-blue-300" /></td></tr>
            )}
            {error && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-red-300" role="alert">
                <AlertTriangle className="w-4 h-4 inline mr-1.5" /> Could not load payments: {error}{' '}
                <button onClick={load} className="underline text-slate-200 ml-1">Retry</button>
              </td></tr>
            )}
            {data && !error && data.items.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">
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
                <td className="px-5 py-3 font-bold text-white tabular-nums">{inr(p.amount_inr)}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] font-bold ${PILL[p.status] || PILL.mock}`}>{p.status}</span>
                </td>
                <td className="px-5 py-3 font-mono text-[11.5px] text-slate-400">
                  <div>{p.razorpay_order_id || '—'}</div>
                  <div>{p.razorpay_payment_id || ''}</div>
                </td>
                <td className="px-5 py-3 text-slate-400 text-[12.5px] whitespace-nowrap">{fmt(p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.total > 0 && (
          <div className="px-5 pb-3"><Pagination skip={skip} limit={PAGE_SIZE} total={data.total} onPageChange={setSkip} /></div>
        )}
      </Panel>
    </div>
  );
}

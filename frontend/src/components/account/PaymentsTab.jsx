import { useEffect, useState } from 'react';
import axios from 'axios';
import { Download, Receipt } from 'lucide-react';
import { API } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import WeHiveLoader from '../WeHiveLoader';

// Payment history with invoice downloads. Invoices were emailed, but there was
// no way to get one again from the account.
const STATUS = { paid: 'Paid', created: 'Pending', failed: 'Failed', refunded: 'Refunded' };

export default function PaymentsTab({ token }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);
  const { toast } = useToast();
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get(`${API}/payments/my-subscription`, { headers })
      .then(r => setData(r.data))
      .catch(() => setData({ payments: [], error: true }));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = async (p) => {
    setBusy(p.id);
    try {
      const r = await axios.get(`${API}/payments/invoice/${p.id}.pdf`, { headers, responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WeHive-Invoice-${p.id.slice(0, 8).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Could not download the invoice', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h2 className="font-display font-bold text-[24px] sm:text-[28px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
        Payments &amp; invoices
      </h2>
      {!data ? (
        <WeHiveLoader label="Loading your payments" className="py-12" />
      ) : data.error ? (
        <p className="mt-6 text-[14px] text-muted-foreground">We couldn't load your payments. Please refresh to try again.</p>
      ) : data.payments.length === 0 ? (
        <div className="mt-8 text-center text-muted-foreground">
          <Receipt className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--blue-700))]" aria-hidden="true" />
          <p className="text-[14px]">No payments yet.</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
          {data.payments.map(p => (
            <li key={p.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-semibold text-[hsl(var(--blue-900))]">{p.plan_name || 'WeHive service'}</div>
                <div className="text-[13px] text-muted-foreground">
                  ₹{Number(p.amount_inr || 0).toLocaleString('en-IN')}
                  {p.created_at ? ` · ${new Date(p.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                  {` · ${STATUS[p.status] || p.status}`}
                </div>
              </div>
              {p.status === 'paid' && (
                <button
                  type="button"
                  onClick={() => download(p)}
                  disabled={busy === p.id}
                  className="h-10 px-4 rounded-xl border border-border text-[14px] font-semibold text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-700))] inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" aria-hidden="true" /> {busy === p.id ? 'Preparing…' : 'Invoice'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

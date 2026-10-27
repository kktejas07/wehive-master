import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ShieldAlert, Check, Flag, AlertTriangle } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, SEVERITY_PILL, canWrite } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

const STATES = [['open', 'To review'], ['suspicious', 'Marked suspicious'], ['cleared', 'Cleared']];
const fmt = (iso) => (iso ? new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const label = (s) => (s || 'document').replace(/_/g, ' ');

function ReviewRow({ item, token, onDecided, readOnly }) {
  const { toast } = useToast();
  const [flagging, setFlagging] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const decide = async (decision) => {
    setBusy(true);
    try {
      await adminClient(token).patch(`/review-queue/${item.id}`, { decision, note: note.trim() || undefined });
      toast({ title: decision === 'cleared' ? 'Cleared' : 'Marked suspicious', description: decision === 'suspicious' && item.application_id ? 'Noted on the case.' : undefined });
      onDecided(item.id);
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="px-5 py-4 border-t first:border-t-0 border-[var(--glass-border)]" data-testid={`review-item-${item.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[10.5px] uppercase tracking-[0.12em] font-bold ${SEVERITY_PILL?.[item.severity] || 'bg-[var(--glass-hover)] text-[var(--text-primary)]'}`}>{item.severity}</span>
            <span className="text-[var(--text-primary)] font-semibold capitalize">{label(item.document)}</span>
            {item.title && <span className="text-[var(--text-secondary)] text-[13px] truncate">· {item.title}</span>}
          </div>
          <div className="mt-1 text-[12.5px] text-[var(--text-secondary)]">
            {item.user?.id ? <Link to={`/admin/users/${item.user.id}`} className="text-blue-300 hover:underline">{item.user.name || item.user.email}</Link> : 'Unknown user'}
            {item.application_id && <> · <Link to={`/admin/applications/${item.application_id}`} className="text-blue-300 hover:underline">open case</Link></>}
            {' · '}scanned {fmt(item.created_at)}
          </div>
          <ul className="mt-2 space-y-1">
            {item.flags.map((f) => (
              <li key={f.kind} className="text-[13px] text-[var(--text-primary)] flex gap-2">
                <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${f.severity === 'critical' ? 'text-red-300' : f.severity === 'warning' ? 'text-amber-300' : 'text-[var(--text-secondary)]'}`} aria-hidden="true" />
                <span>{f.message}</span>
              </li>
            ))}
          </ul>
          {item.review && (
            <div className="mt-2 text-[12.5px] text-[var(--text-secondary)]">
              {item.review.decision === 'cleared' ? 'Cleared' : 'Marked suspicious'} by {item.review.by} · {fmt(item.review.at)}
              {item.review.note && <span className="text-[var(--text-secondary)]"> — “{item.review.note}”</span>}
            </div>
          )}
        </div>
        {!item.review && !flagging && !readOnly && (
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => decide('cleared')} data-testid={`review-clear-${item.id}`}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-1.5 text-[12px] font-bold text-emerald-200 disabled:opacity-50">
              <Check className="w-3.5 h-3.5" /> Looks fine
            </button>
            <button disabled={busy} onClick={() => setFlagging(true)} data-testid={`review-flag-${item.id}`}
              className="inline-flex items-center gap-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 px-3 py-1.5 text-[12px] font-bold text-red-200 disabled:opacity-50">
              <Flag className="w-3.5 h-3.5" /> Suspicious
            </button>
          </div>
        )}
      </div>
      {flagging && (
        <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); decide('suspicious'); }}>
          <label htmlFor={`review-note-${item.id}`} className="block text-[12px] text-[var(--text-secondary)]">What looks wrong? This is added to the case's internal notes.</label>
          <textarea id={`review-note-${item.id}`} rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] text-[13.5px] text-[var(--text-primary)] outline-none focus:border-[hsl(var(--blue-700))]" />
          <div className="flex gap-2">
            <button type="submit" disabled={busy || note.trim().length < 3} className="inline-flex items-center gap-1 rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 text-[12px] font-bold text-[var(--text-primary)] disabled:opacity-50">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Mark suspicious
            </button>
            <button type="button" onClick={() => setFlagging(false)} className="rounded-lg bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)] px-3 py-1.5 text-[12px] font-bold text-[var(--text-primary)]">Cancel</button>
          </div>
        </form>
      )}
    </li>
  );
}

export default function ReviewQueueTab() {
  const { token, admin } = useAdminAuth();
  const [state, setState] = useState('open');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setData(null);
    setError('');
    try {
      const r = await adminClient(token).get('/review-queue', { params: { state } });
      setData(r.data);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    }
  }, [token, state]);

  useEffect(() => { load(); }, [load]);

  const remove = (id) => setData((d) => ({ ...d, items: d.items.filter((i) => i.id !== id), total: d.total - 1 }));

  return (
    <div data-testid="admin-review-tab">
      <AdminHeader
        title="Document review"
        subtitle="AI scans with something worth a second look: MRZ check digits, dates that don't match, expired documents, unknown issuers, names that don't match the applicant. A flag is a reason to look, not proof of fraud."
      />
      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Review state">
        {STATES.map(([id, l]) => (
          <button key={id} onClick={() => setState(id)} aria-pressed={state === id}
            className={`h-9 px-3 rounded-lg text-[12.5px] font-bold ${state === id ? 'bg-[hsl(var(--blue-700))] text-white' : 'bg-[var(--glass-hover)] text-[var(--text-secondary)] hover:text-white'}`}>
            {l}{state === id && data ? ` · ${data.total}` : ''}
          </button>
        ))}
      </div>
      <Panel className="p-0">
        {error && <div role="alert" className="px-5 py-8 text-center text-red-300">Could not load the queue: {error} <button onClick={load} className="underline text-[var(--text-primary)]">Retry</button></div>}
        {!data && !error && <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-blue-300" /></div>}
        {data && data.items.length === 0 && (
          <div className="px-5 py-10 text-center text-[var(--text-secondary)]"><ShieldAlert className="w-5 h-5 inline mr-2" />Nothing here.</div>
        )}
        {data && data.items.length > 0 && (
          <ul>{data.items.map((i) => <ReviewRow key={i.id} item={i} token={token} readOnly={!canWrite(admin, 'cases')} onDecided={state === 'open' ? remove : load} />)}</ul>
        )}
      </Panel>
    </div>
  );
}

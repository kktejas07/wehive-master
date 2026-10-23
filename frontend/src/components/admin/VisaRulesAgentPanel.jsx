import { useCallback, useEffect, useState } from 'react';
import { Bot, Loader2, Play, Check } from 'lucide-react';
import { adminClient } from '../../lib/admin';
import { Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

// The Visa Rules Agent re-checks every country's visa requirement for Indian
// passports once a day and refreshes official decision times. Small batches of
// changes apply automatically; big batches wait here for an admin.
const LABEL = {
  visa_free: 'No visa', on_arrival: 'On arrival', evisa: 'eVisa', evisa_or_on_arrival: 'eVisa / on arrival',
  visa: 'Visa required', restricted: 'Restricted', not_applicable: 'N/A',
};

export default function VisaRulesAgentPanel({ token }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const load = useCallback(() => {
    adminClient(token).get('/agents/visa-rules/changes').then(r => setData(r.data)).catch(() => setData({ items: [], last_run: {} }));
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const runNow = async () => {
    setBusy(true);
    try {
      const r = await adminClient(token).post('/agents/visa-rules/run');
      toast({ title: 'Visa rules checked', description: r.data.status === 'ok'
        ? `${r.data.changes} change(s): ${r.data.applied} applied, ${r.data.held} held for review.`
        : `Source problem: ${r.data.error || r.data.status}. Nothing changed.` });
      load();
    } catch {
      toast({ title: 'Run failed', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const apply = async (id) => {
    try {
      await adminClient(token).post(`/agents/visa-rules/changes/${id}/apply`);
      load();
    } catch {
      toast({ title: 'Could not apply', variant: 'destructive' });
    }
  };

  const last = data?.last_run || {};
  return (
    <Panel>
      <div className="p-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-white"><Bot className="w-4 h-4" aria-hidden="true" /> Visa Rules Agent</div>
          <p className="text-[12.5px] text-slate-400 mt-1 max-w-xl">
            Checks every country's visa rules for Indian passports daily and refreshes official decision times (US, Canada, UK, Ireland).
            Up to 10 changes apply automatically; more are held here for review.
          </p>
          <p className="text-[12px] text-slate-400 mt-1">
            Last run: {last.started_at ? new Date(last.started_at).toLocaleString() : 'not yet'}
            {last.status ? ` · ${last.status} · ${last.rows ?? 0} countries read · ${last.changes ?? 0} change(s)` : ''}
          </p>
        </div>
        <button type="button" onClick={runNow} disabled={busy}
          className="h-10 px-4 rounded-lg bg-[hsl(var(--blue-700))] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Play className="w-4 h-4" aria-hidden="true" />} Run now
        </button>
      </div>
      {data?.items?.length > 0 && (
        <ul className="divide-y divide-white/5 border-t border-white/5">
          {data.items.slice(0, 15).map(c => (
            <li key={c.id} className="px-5 py-3 flex items-center justify-between gap-3 text-[13px]">
              <span className="text-slate-200">
                <span className="font-mono text-slate-400 mr-2">{c.iso2}</span>
                {LABEL[c.old] || c.old || '—'} → <strong className="text-white">{LABEL[c.new] || c.new}</strong>
                <span className="text-slate-500"> · “{c.wording}” · {c.detected_at ? new Date(c.detected_at).toLocaleDateString() : ''}</span>
              </span>
              {c.status === 'held' ? (
                <button type="button" onClick={() => apply(c.id)}
                  className="h-8 px-3 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 inline-flex items-center gap-1 font-semibold">
                  <Check className="w-3.5 h-3.5" aria-hidden="true" /> Apply
                </button>
              ) : <span className="text-[11px] uppercase tracking-[0.12em] text-emerald-400 font-bold">Applied</span>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

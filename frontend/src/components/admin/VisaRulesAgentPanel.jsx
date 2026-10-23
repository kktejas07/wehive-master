import { useCallback, useEffect, useState } from 'react';
import { Bot, Loader2, Play, Check, Undo2 } from 'lucide-react';
import { adminClient } from '../../lib/admin';
import { Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

// The Visa Rules Agent re-checks every country's visa requirement for Indian
// passports at server start and once a day, refreshes official decision times and
// each country's allowed stay / conditions. Every change applies automatically on
// a good read (about 190 countries); an admin can undo any of them here.
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
      toast({ title: 'Visa rules checked', description: r.data.summary
        || (r.data.status === 'source_error' ? `Source unavailable: ${r.data.error}. Nothing changed.` : r.data.status) });
      load();
    } catch {
      toast({ title: 'Run failed', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const act = async (id, action) => {
    try {
      await adminClient(token).post(`/agents/visa-rules/changes/${id}/${action}`);
      load();
    } catch {
      toast({ title: action === 'undo' ? 'Could not undo' : 'Could not apply', variant: 'destructive' });
    }
  };

  const last = data?.last_run || {};
  return (
    <Panel>
      <div className="p-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-white"><Bot className="w-4 h-4" aria-hidden="true" /> Visa Rules Agent</div>
          <p className="text-[12.5px] text-slate-400 mt-1 max-w-xl">
            Runs automatically at server start and every day: reads every country's visa rules for Indian passports,
            allowed stay and conditions, and refreshes official decision times (US, Canada, UK, Ireland).
            Changes apply automatically and admins get an email report; undo any change below.
          </p>
          <p className="text-[12px] text-slate-400 mt-1">
            Last run: {last.started_at ? new Date(last.started_at).toLocaleString() : 'not yet'}
            {last.status === 'ok' && ` · ${last.rows ?? 0} countries read · ${last.changes ? `${last.changes} change(s) applied` : 'no changes'}`}
            {last.status === 'parse_suspect' && ` · only ${last.rows ?? 0} countries read, nothing changed`}
            {last.status === 'source_error' && ' · source unavailable, nothing changed'}
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
              {c.status === 'held' && (
                <button type="button" onClick={() => act(c.id, 'apply')}
                  className="h-8 px-3 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 inline-flex items-center gap-1 font-semibold">
                  <Check className="w-3.5 h-3.5" aria-hidden="true" /> Apply
                </button>
              )}
              {c.status === 'applied' && (
                <button type="button" onClick={() => act(c.id, 'undo')}
                  className="h-8 px-3 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 inline-flex items-center gap-1 font-semibold">
                  <Undo2 className="w-3.5 h-3.5" aria-hidden="true" /> Undo
                </button>
              )}
              {c.status === 'undone' && <span className="text-[11px] uppercase tracking-[0.12em] text-slate-500 font-bold">Undone</span>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

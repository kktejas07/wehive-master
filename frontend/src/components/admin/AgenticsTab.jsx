import { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, Bot, Search, Telescope, Workflow, MessageSquare, CheckCircle2, XCircle, Lock } from 'lucide-react';
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

const inputCls = 'h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-[13.5px] text-white placeholder:text-slate-500';
const btnCls = 'h-10 px-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white text-[13.5px] font-bold disabled:opacity-60';
const labelCls = 'text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400';

function Flag({ ok, yes = 'Yes', no = 'No' }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-300"><CheckCircle2 className="w-3 h-3" /> {yes}</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11.5px] font-semibold text-red-300"><XCircle className="w-3 h-3" /> {no}</span>
  );
}

function Output({ children }) {
  return (
    <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/20 p-3 text-[12px] text-slate-200">
      {children}
    </pre>
  );
}

const pretty = (v) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2));

// One tool card: single text input + submit, shows raw result.
function ToolCard({ id, icon: Icon, title, hint, placeholder, minLen, disabled, onRun, render }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const run = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setResult(await onRun(text.trim()));
    } catch (err) {
      setResult(null);
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-blue-300" />
        <div className={labelCls}>{title}</div>
      </div>
      <p className="text-[12px] text-slate-400 mb-3">{hint}</p>
      <form className="flex flex-col sm:flex-row gap-3" onSubmit={run}>
        <input
          data-testid={`admin-agentics-${id}-input`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label={title}
          minLength={minLen}
          required
          className={`${inputCls} flex-1 min-w-0`}
        />
        <button data-testid={`admin-agentics-${id}-run`} type="submit" disabled={busy || disabled || text.trim().length < minLen} className={btnCls}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run'}
        </button>
      </form>
      {error && <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[12.5px] text-red-300">{error}</div>}
      {result && (render ? render(result) : <Output>{pretty(result)}</Output>)}
    </Panel>
  );
}

export default function AgenticsTab() {
  const { token, admin: me } = useAdminAuth();
  const { toast } = useToast();
  const writable = canWrite(me);
  const [status, setStatus] = useState(null);
  const [statusErr, setStatusErr] = useState('');
  const [loading, setLoading] = useState(true);

  // Workflow card has extra options so it gets its own state.
  const [task, setTask] = useState('');
  const [steps, setSteps] = useState({ research: true, analyze: true, answer: true });
  const [useStark, setUseStark] = useState(true);
  const [wfBusy, setWfBusy] = useState(false);
  const [wf, setWf] = useState(null);
  const [wfErr, setWfErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setStatusErr('');
    try {
      const r = await apiClient(token).get('/agentic/status');
      setStatus(r.data);
    } catch (e) {
      setStatus(null);
      setStatusErr(errText(e));
      toast({ title: 'Could not load agent status', description: errText(e) });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { load(); }, [load]);

  const runWorkflow = async (e) => {
    e.preventDefault();
    const chosen = ['research', 'analyze', 'answer'].filter((s) => steps[s]);
    setWfBusy(true);
    setWfErr('');
    try {
      const { data } = await apiClient(token).post('/agentic/workflow', { task: task.trim(), steps: chosen, use_stark: useStark });
      setWf(data);
    } catch (err) {
      setWf(null);
      setWfErr(errText(err));
    } finally {
      setWfBusy(false);
    }
  };

  const sources = status?.stark?.sources;
  const sourceRows = Array.isArray(sources)
    ? sources.map((s, i) => (typeof s === 'string' ? { name: s, detail: null } : { name: s.name || s.source || `Source ${i + 1}`, detail: s }))
    : sources && typeof sources === 'object'
      ? Object.entries(sources).map(([name, detail]) => ({ name, detail }))
      : [];

  return (
    <div data-testid="admin-agentics-tab">
      <AdminHeader
        title="Agentic AI"
        subtitle="Hive (orchestrator) and Stark (external research sub-agent). Check health and try the agents with a test prompt."
        action={
          <button
            data-testid="admin-agentics-refresh"
            onClick={load}
            disabled={loading}
            className="h-9 px-3 inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-[12.5px] font-bold text-white disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      {/* Status */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Panel>
          <div className="flex items-center gap-2 mb-3"><Bot className="w-4 h-4 text-blue-300" /><div className={labelCls}>Hive</div></div>
          {loading && !status ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-300" />
          ) : statusErr ? (
            <div className="text-[12.5px] text-red-300" data-testid="admin-agentics-status-error">{statusErr}</div>
          ) : (
            <dl className="space-y-2 text-[13.5px]">
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Orchestrator</dt><dd className="font-semibold text-slate-100 capitalize">{status?.hive?.orchestrator || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Model</dt><dd className="font-semibold text-slate-100">{status?.hive?.model || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">AI marketplace</dt><dd><Flag ok={!!status?.hive?.marketplace_available} yes="Available" no="Unavailable" /></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Ollama</dt><dd><Flag ok={!!status?.hive?.ollama_available} yes="Reachable" no="Unreachable" /></dd></div>
            </dl>
          )}
        </Panel>
        <Panel>
          <div className="flex items-center gap-2 mb-3"><Telescope className="w-4 h-4 text-blue-300" /><div className={labelCls}>Stark</div></div>
          {loading && !status ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-300" />
          ) : statusErr ? (
            <div className="text-[12.5px] text-slate-400">Status unavailable.</div>
          ) : (
            <>
              <div className="flex justify-between gap-3 text-[13.5px] mb-2"><span className="text-slate-400">Agent</span><Flag ok={!!status?.stark?.enabled} yes="Enabled" no="Disabled" /></div>
              {!status?.stark?.enabled && <p className="text-[11.5px] text-slate-400">Set STARK_ENABLED=1 on the server to turn Stark on.</p>}
            </>
          )}
          {status?.checked_at && <p className="mt-3 text-[11.5px] text-slate-400">Checked {new Date(status.checked_at + (status.checked_at.endsWith('Z') ? '' : 'Z')).toLocaleString('en-IN')}</p>}
        </Panel>
      </div>

      <Panel className="overflow-x-auto p-0 mb-6">
        <table className="min-w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-slate-400 bg-white/5">
              <th className="px-5 py-3">Stark data source</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && !status && (
              <tr><td colSpan={3} className="px-5 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline text-blue-300" /></td></tr>
            )}
            {!loading && sourceRows.length === 0 && (
              <tr><td colSpan={3} className="px-5 py-10 text-center text-slate-400"><Search className="w-5 h-5 inline mr-2" /> No sources reported.</td></tr>
            )}
            {sourceRows.map((s) => {
              const d = s.detail;
              const isObj = d && typeof d === 'object';
              const ok = isObj ? (d.ok ?? d.available ?? d.enabled ?? d.status === 'ok') : typeof d === 'boolean' ? d : true;
              const extra = isObj ? Object.entries(d).filter(([k]) => !['name', 'source', 'ok', 'available', 'enabled'].includes(k)).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ') : typeof d === 'string' && d !== s.name ? d : '';
              return (
                <tr key={s.name} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-5 py-3 font-bold text-white">{s.name}</td>
                  <td className="px-5 py-3"><Flag ok={!!ok} yes="Up" no="Down" /></td>
                  <td className="px-5 py-3 text-[12.5px] text-slate-400">{extra || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <AdminHeader title="Test the agents" subtitle="These call the live endpoints and may use AI quota. Results are not saved." />
      {!writable && (
        <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-[12.5px] text-amber-200 inline-flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" /> Your role is view-only, so the test tools are disabled.
        </div>
      )}

      <ToolCard
        id="hive"
        icon={MessageSquare}
        title="Ask Hive"
        hint="POST /agentic/hive/ask. Hive answers and hands off to Stark when external data is needed."
        placeholder="e.g. What are the latest Canada study permit changes?"
        minLen={1}
        disabled={!writable}
        onRun={async (q) => (await apiClient(token).post('/agentic/hive/ask', { question: q, use_stark: true })).data}
        render={(r) => (
          <div data-testid="admin-agentics-hive-result">
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Flag ok={!!r.ok} yes="Answered" no="Fallback" />
              <Flag ok={!!r.stark_delegated} yes="Stark delegated" no="No delegation" />
              <Flag ok={!!r.stark_context_used} yes="Context used" no="No context" />
              {r.model && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11.5px] font-semibold text-slate-200">{r.model}</span>}
            </div>
            {r.intents_detected?.length > 0 && (
              <div className="mt-2 text-[12px] text-slate-400">
                Intents: {r.intents_detected.map((i) => `${i.intent}${typeof i.score === 'number' ? ` (${i.score.toFixed(2)})` : ''}`).join(', ')}
              </div>
            )}
            <Output>{r.answer}</Output>
          </div>
        )}
      />

      <ToolCard
        id="search"
        icon={Search}
        title="Stark search"
        hint="POST /agentic/stark/search. Raw open-source lookup (Wikipedia, KG, arXiv, GitHub)."
        placeholder="Search query (min 2 characters)"
        minLen={2}
        disabled={!writable}
        onRun={async (q) => (await apiClient(token).post('/agentic/stark/search', { query: q, max_sources: 3 })).data}
      />

      <ToolCard
        id="research"
        icon={Telescope}
        title="Stark deep research"
        hint="POST /agentic/stark/research. Adds Wikipedia summaries and Knowledge Graph, and returns the RAG context."
        placeholder="Research topic (min 2 characters)"
        minLen={2}
        disabled={!writable}
        onRun={async (q) => (await apiClient(token).post('/agentic/stark/research', { query: q, max_sources: 3 })).data}
      />

      <ToolCard
        id="context"
        icon={Bot}
        title="RAG context preview"
        hint="GET /agentic/stark/context. The exact context text Stark would inject into a prompt."
        placeholder="Query"
        minLen={1}
        disabled={!writable}
        onRun={async (q) => (await apiClient(token).get('/agentic/stark/context', { params: { q } })).data}
        render={(r) => <Output>{r.context || '(empty context)'}</Output>}
      />

      <Panel className="mb-4">
        <div className="flex items-center gap-2 mb-1"><Workflow className="w-4 h-4 text-blue-300" /><div className={labelCls}>Run workflow</div></div>
        <p className="text-[12px] text-slate-400 mb-3">POST /agentic/workflow. Multi-step Hive + Stark run (min 5 characters).</p>
        <form onSubmit={runWorkflow} className="space-y-3">
          <textarea
            data-testid="admin-agentics-workflow-task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Describe the task, e.g. Compare Germany and Netherlands job-seeker visas"
            aria-label="Workflow task"
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[13.5px] text-white placeholder:text-slate-500"
          />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-slate-300">
            {['research', 'analyze', 'answer'].map((s) => (
              <label key={s} className="inline-flex items-center gap-1.5 capitalize">
                <input type="checkbox" checked={steps[s]} onChange={(e) => setSteps({ ...steps, [s]: e.target.checked })} /> {s}
              </label>
            ))}
            <label className="inline-flex items-center gap-1.5 sm:ml-auto">
              <input type="checkbox" checked={useStark} onChange={(e) => setUseStark(e.target.checked)} /> Use Stark
            </label>
            <button
              data-testid="admin-agentics-workflow-run"
              type="submit"
              disabled={wfBusy || !writable || task.trim().length < 5 || !Object.values(steps).some(Boolean)}
              className={btnCls}
            >
              {wfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run workflow'}
            </button>
          </div>
        </form>
        {wfErr && <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[12.5px] text-red-300">{wfErr}</div>}
        {wf && (
          <div data-testid="admin-agentics-workflow-result" className="mt-3">
            <div className="text-[12px] text-slate-400">{wf.steps_completed} step(s) completed</div>
            {wf.final_answer && (
              <>
                <div className={`${labelCls} mt-3`}>Final answer</div>
                <Output>{wf.final_answer}</Output>
              </>
            )}
            <Panel className="overflow-x-auto p-0 mt-3">
              <table className="min-w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-slate-400 bg-white/5">
                    <th className="px-4 py-2.5">Step</th>
                    <th className="px-4 py-2.5">Output</th>
                  </tr>
                </thead>
                <tbody>
                  {(wf.results || []).map((r, i) => (
                    <tr key={i} className="border-t border-white/5 align-top">
                      <td className="px-4 py-2.5 font-bold text-white capitalize whitespace-nowrap">{r.step}{r.source ? <span className="ml-2 text-[11.5px] font-semibold text-slate-400">({r.source})</span> : null}</td>
                      <td className="px-4 py-2.5 text-slate-300 whitespace-pre-wrap break-words max-w-[640px]">
                        {String(r.context ?? r.analysis ?? r.answer ?? '').slice(0, 1500) || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
        )}
      </Panel>
      <p className="mt-3 text-[11.5px] text-slate-400">
        Note: Stark and workflow endpoints require a signed-in user token on the server; if they return 401/403 for an admin session, the backend needs to accept admin tokens there.
      </p>
    </div>
  );
}

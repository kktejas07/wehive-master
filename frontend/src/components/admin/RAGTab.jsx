import { useEffect, useState, useCallback } from 'react';
import { Database, Loader2, RefreshCw, Trash2, Search, FileText, Server, Cpu, Upload, BarChart2 } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import { API } from '../../context/AuthContext';
import axios from 'axios';

function StatusBadge({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
      ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      {label}
    </span>
  );
}

export default function RAGTab() {
  const { admin, token } = useAdminAuth();
  const isSuper = !!admin?.is_super_admin;
  const { toast } = useToast();

  const [status, setStatus] = useState(null);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState('');
  const [query, setQuery] = useState('');
  const [retrieveK, setRetrieveK] = useState(4);
  const [retrieval, setRetrieval] = useState(null);
  const [retrieving, setRetrieving] = useState(false);
  const [qReply, setQReply] = useState(null);
  const [qBusy, setQBusy] = useState(false);
  const [qModel, setQModel] = useState('llama3.2');

  const [health, setHealth] = useState(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [s, c, h] = await Promise.all([
        axios.get(`${API}/rag/status`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/rag/collections`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/health`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
      ]);
      setStatus(s.data);
      setCollections(c.data.collections || []);
      if (h) setHealth(h.data);
    } catch (e) {
      toast({ title: 'Failed to load RAG status', description: e?.response?.data?.detail || e.message });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { refresh(); }, [refresh]);

  const ingest = async (kind) => {
    if (!token) return;
    setIngesting(kind);
    try {
      const path = kind === 'countries' ? '/rag/ingest/countries' : '/rag/ingest/universities';
      const r = await axios.post(`${API}${path}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: `Ingested ${kind}`, description: `${r.data.documents} docs, ${r.data.chunks} chunks` });
      await refresh();
    } catch (e) {
      toast({ title: 'Ingest failed', description: e?.response?.data?.detail || e.message });
    } finally {
      setIngesting('');
    }
  };

  const [evalLatest, setEvalLatest] = useState(null);
  const [evalHistory, setEvalHistory] = useState([]);
  const [evalLoading, setEvalLoading] = useState(false);

  const runEval = async () => {
    if (!token || !isSuper) return;
    try {
      await axios.post(`${API}/admin/rag/eval/run`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: 'RAGAS eval started', description: 'Results will appear in ~1 min once complete.' });
      setTimeout(refreshEval, 60000);
    } catch (e) {
      toast({ title: 'Eval failed to start', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    }
  };

  const refreshEval = useCallback(async () => {
    if (!token) return;
    setEvalLoading(true);
    try {
      const [l, h] = await Promise.all([
        axios.get(`${API}/admin/rag/eval/latest`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        axios.get(`${API}/admin/rag/eval/history?limit=10`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
      ]);
      if (l) setEvalLatest(l.data);
      setEvalHistory(h?.data || []);
    } finally {
      setEvalLoading(false);
    }
  }, [token]);

  useEffect(() => { refreshEval(); }, [refreshEval]);

  const [optHistory, setOptHistory] = useState([]);
  const [optLoading, setOptLoading] = useState(false);
  const [optRunning, setOptRunning] = useState(false);

  const runOptimizer = async () => {
    if (!token || !isSuper) return;
    setOptRunning(true);
    try {
      await axios.post(`${API}/admin/prompts/optimize`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: 'Optimizer started', description: 'Check history in ~30s once complete.' });
      setTimeout(refreshOptHistory, 35000);
    } catch (e) {
      toast({ title: 'Optimizer failed to start', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setOptRunning(false);
    }
  };

  const refreshOptHistory = useCallback(async () => {
    if (!token) return;
    setOptLoading(true);
    try {
      const r = await axios.get(`${API}/admin/prompts/optimize/history?limit=10`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }));
      setOptHistory(r?.data || []);
    } finally {
      setOptLoading(false);
    }
  }, [token]);

  useEffect(() => { refreshOptHistory(); }, [refreshOptHistory]);

  const [uploading, setUploading] = useState(false);
  const uploadDoc = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !token) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await axios.post(`${API}/admin/rag/upload`, form, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: `Added ${file.name}`, description: `${r.data.result?.chunks ?? 0} chunks · the chatbot can now answer from it` });
      await refresh();
    } catch (err) {
      toast({ title: 'Upload failed', description: err?.response?.data?.detail || err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const wipeCollection = async (name) => {
    if (!token) return;
    if (!window.confirm(`Wipe all chunks in "${name}"?`)) return;
    try {
      await axios.delete(`${API}/rag/collections/${name}`, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: `Wiped ${name}` });
      await refresh();
    } catch (e) {
      toast({ title: 'Delete failed', description: e?.response?.data?.detail || e.message });
    }
  };

  const runRetrieve = async () => {
    if (!query.trim() || !token) return;
    setRetrieving(true);
    setRetrieval(null);
    try {
      const r = await axios.post(`${API}/rag/retrieve`, {
        query: query.trim(),
        collections: collections.map(c => c.name),
        k: retrieveK,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setRetrieval(r.data);
    } catch (e) {
      toast({ title: 'Retrieve failed', description: e?.response?.data?.detail || e.message });
    } finally {
      setRetrieving(false);
    }
  };

  const runQuery = async () => {
    if (!query.trim() || !token) return;
    setQBusy(true);
    setQReply(null);
    try {
      const r = await axios.post(`${API}/rag/query`, {
        query: query.trim(),
        collections: collections.map(c => c.name),
        k: retrieveK,
        provider_id: 'ollama',
        model: qModel,
        max_tokens: 512,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setQReply(r.data);
    } catch (e) {
      toast({ title: 'RAG query failed', description: e?.response?.data?.detail || e.message });
    } finally {
      setQBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="RAG & Vector Store"
        subtitle="Qdrant hybrid search (BGE-M3) with ChromaDB fallback. Ingest, search, and ground LLM answers."
        right={
          <button onClick={refresh} disabled={loading} className="h-10 px-3 rounded-lg bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)] text-[12px] text-[var(--text-primary)] inline-flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel>
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-emerald-400" />
            <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Vector Store</div>
          </div>
          {status ? (
            <div className="space-y-2 text-[12px] text-[var(--text-secondary)]">
              <div className="flex items-center justify-between">
                <span>Qdrant</span>
                <StatusBadge ok={health?.checks?.qdrant === 'ok'} label={health?.checks?.qdrant || 'unknown'} />
              </div>
              <div className="flex items-center justify-between">
                <span>ChromaDB fallback</span>
                <span className="font-mono text-[var(--text-primary)]">{status.vector_store?.backend}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Collections</span>
                <span className="font-mono text-[var(--text-primary)]">{status.vector_store?.collections?.length || 0}</span>
              </div>
            </div>
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-[var(--text-secondary)]" />
          )}
        </Panel>

        <Panel>
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Ollama</div>
          </div>
          {status ? (
            <div className="space-y-2 text-[12px] text-[var(--text-secondary)]">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <StatusBadge ok={status.ollama?.available} label={status.ollama?.available ? 'Online' : 'Offline'} />
              </div>
              <div className="flex items-center justify-between">
                <span>Embed Model</span>
                <span className="font-mono text-[var(--text-primary)]">{status.ollama?.embed_model}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Host</span>
                <span className="font-mono text-[11px] text-[var(--text-secondary)]">{status.ollama?.host}</span>
              </div>
              {!status.ollama?.available && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px]">
                  Start Ollama locally (<code className="font-mono">ollama serve</code>) and pull a model: <code className="font-mono">ollama pull nomic-embed-text</code>
                </div>
              )}
            </div>
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-[var(--text-secondary)]" />
          )}
        </Panel>
      </div>

      <Panel>
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-emerald-400" />
          <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Collections</div>
        </div>
        {collections.length === 0 ? (
          <div className="text-[12px] text-[var(--text-secondary)] py-3">No collections yet. Use the buttons below to ingest data.</div>
        ) : (
          <div className="space-y-2">
            {collections.map(c => (
              <div key={c.name} className="flex items-center justify-between p-3 rounded-xl bg-[var(--glass-hover)]">
                <div>
                  <div className="text-[13px] font-mono text-[var(--text-primary)]">{c.name}</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">{c.count} chunks</div>
                </div>
                {isSuper && (
                  <button onClick={() => wipeCollection(c.name)} data-testid={`rag-wipe-${c.name}`} className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-300 hover:bg-red-500/25 text-[11px] font-bold inline-flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Wipe
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => ingest('countries')} disabled={!!ingesting} className="h-10 px-4 rounded-lg bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-[12px] font-semibold text-white disabled:opacity-50 inline-flex items-center gap-1.5">
            {ingesting === 'countries' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            Ingest Countries
          </button>
          <button onClick={() => ingest('universities')} disabled={!!ingesting} className="h-10 px-4 rounded-lg bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-[12px] font-semibold text-white disabled:opacity-50 inline-flex items-center gap-1.5">
            {ingesting === 'universities' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            Ingest Universities
          </button>
          <label
            data-testid="rag-upload"
            className={`h-10 px-4 rounded-lg bg-[var(--glass-hover)] hover:bg-[var(--glass-border)] text-[12px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 cursor-pointer focus-within:ring-2 focus-within:ring-blue-400 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload document
            <input type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" onChange={uploadDoc} className="sr-only" disabled={uploading} />
          </label>
        </div>
        <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
          PDF, .txt or .md up to 20 MB — visa guides, embassy checklists, FAQs. Uploads go to <span className="font-mono">wehive_kb</span>, which the chatbot searches first.
        </p>
      </Panel>

      <Panel>
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-emerald-400" />
          <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Try It</div>
        </div>
        <div className="space-y-3">
          <textarea value={query} onChange={e => setQuery(e.target.value)} rows={2} placeholder="Ask anything — e.g. 'Tell me about student visa for Canada' or 'Universities offering scholarships in Germany'"
            className="w-full rounded-xl bg-[var(--glass-hover)] border border-[var(--glass-border)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-emerald-500/50 resize-y" />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] text-[var(--text-secondary)]">k =
              <input type="number" min={1} max={20} value={retrieveK} onChange={e => setRetrieveK(parseInt(e.target.value) || 4)}
                className="ml-1 w-14 h-8 rounded-lg bg-[var(--glass-hover)] border border-[var(--glass-border)] px-2 text-[12px] text-[var(--text-primary)] outline-none" />
            </label>
            <label className="text-[11px] text-[var(--text-secondary)]">Model
              <input value={qModel} onChange={e => setQModel(e.target.value)}
                className="ml-1 h-8 rounded-lg bg-[var(--glass-hover)] border border-[var(--glass-border)] px-2 text-[12px] text-[var(--text-primary)] outline-none font-mono" />
            </label>
            <button onClick={runRetrieve} disabled={retrieving || !query.trim()} className="h-10 px-3 rounded-lg bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)] text-[12px] text-[var(--text-primary)] disabled:opacity-50 inline-flex items-center gap-1.5">
              {retrieving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Retrieve
            </button>
            <button onClick={runQuery} disabled={qBusy || !query.trim()} className="h-10 px-3 rounded-lg bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-[12px] font-semibold text-white disabled:opacity-50 inline-flex items-center gap-1.5">
              {qBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
              Ask LLM
            </button>
          </div>

          {retrieval && (
            <div className="mt-3 p-3 rounded-xl bg-[var(--glass-hover)] space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Retrieved Context</div>
              {retrieval.chunks?.length ? (
                retrieval.chunks.map((c, i) => (
                  <div key={i} className="text-[12px] text-[var(--text-primary)] whitespace-pre-wrap border-l-2 border-emerald-500/30 pl-3">{c}</div>
                ))
              ) : (
                <div className="text-[12px] text-[var(--text-secondary)]">No chunks retrieved.</div>
              )}
            </div>
          )}

          {qReply && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold">LLM Reply</div>
                <div className="text-[11px] text-[var(--text-secondary)] font-mono">{qReply.provider?.id}/{qReply.provider?.model}</div>
              </div>
              <div className="text-[13px] text-[var(--text-primary)] whitespace-pre-wrap">{qReply.reply}</div>
            </div>
          )}
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">RAG Quality (RAGAS)</div>
          </div>
          <div className="flex items-center gap-2">
            {isSuper && (
              <button onClick={runEval} className="h-8 px-3 rounded-lg bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-[11px] font-semibold text-white inline-flex items-center gap-1.5">
                Run Now
              </button>
            )}
            <button onClick={refreshEval} disabled={evalLoading} className="h-8 px-3 rounded-lg bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)] text-[11px] text-[var(--text-primary)] inline-flex items-center gap-1.5">
              <RefreshCw className={`w-3 h-3 ${evalLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
        {evalLatest ? (
          <div className="space-y-3">
            <div className="text-[11px] text-[var(--text-secondary)]">
              Last run: {evalLatest.finished_at ? new Date(evalLatest.finished_at).toLocaleString() : '—'} · {evalLatest.sample_size || 0} questions · status: <span className={evalLatest.status === 'ok' ? 'text-emerald-300' : 'text-amber-300'}>{evalLatest.status}</span>
            </div>
            {evalLatest.status === 'ok' && Object.keys(evalLatest.scores || {}).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(evalLatest.scores).map(([k, v]) => (
                  <div key={k} className="p-3 rounded-xl bg-[var(--glass-hover)] text-center">
                    <div className="text-[20px] font-bold text-[var(--text-primary)]">{(v * 100).toFixed(0)}<span className="text-[12px] text-[var(--text-secondary)]">%</span></div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mt-0.5">{k.replace(/_/g, ' ')}</div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-[var(--glass-hover)] overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round(v * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[12px] text-[var(--text-secondary)] py-2">{evalLatest.reason || 'No scores yet — install ragas and run the nightly eval.'}</div>
            )}
            {evalHistory.length > 1 && (
              <details className="text-[11px] text-[var(--text-secondary)]">
                <summary className="cursor-pointer hover:text-[var(--text-secondary)]">History ({evalHistory.length} runs)</summary>
                <div className="mt-2 space-y-1">
                  {evalHistory.map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-2 py-1 rounded-lg bg-[var(--glass-hover)]">
                      <span>{r.started_at ? new Date(r.started_at).toLocaleDateString() : '—'}</span>
                      <span className={r.status === 'ok' ? 'text-emerald-300' : 'text-amber-300'}>{r.status}</span>
                      <span>{r.sample_size || 0} q</span>
                      {r.scores?.faithfulness != null && <span>F: {(r.scores.faithfulness * 100).toFixed(0)}%</span>}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ) : evalLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[var(--text-secondary)]" />
        ) : (
          <div className="text-[12px] text-[var(--text-secondary)] py-2">No eval runs yet. The nightly job runs at 02:00 UTC, or <code className="font-mono">python -m backend.eval.ragas_evaluator</code> to run now.</div>
        )}
      </Panel>

      <Panel>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-violet-400" />
            <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Prompt Optimizer</div>
          </div>
          <div className="flex items-center gap-2">
            {isSuper && (
              <button onClick={runOptimizer} disabled={optRunning} className="h-8 px-3 rounded-lg bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-[11px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5">
                {optRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Run Optimizer
              </button>
            )}
            <button onClick={refreshOptHistory} disabled={optLoading} className="h-8 px-3 rounded-lg bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)] text-[11px] text-[var(--text-primary)] inline-flex items-center gap-1.5">
              <RefreshCw className={`w-3 h-3 ${optLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
        <div className="text-[11px] text-[var(--text-secondary)] mb-3">Reads recent RAGAS scores and suggests an improved Eva system prompt. Suggestions are stored for review — never auto-applied.</div>
        {optHistory.length > 0 ? (
          <div className="space-y-2">
            {optHistory.map((r, i) => (
              <details key={i} className="rounded-xl bg-[var(--glass-hover)] p-3 text-[11px]">
                <summary className="cursor-pointer flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">{r.started_at ? new Date(r.started_at).toLocaleString() : '—'}</span>
                  <span className="flex items-center gap-3 text-[var(--text-secondary)]">
                    {r.avg_faithfulness != null && <span>F: {(r.avg_faithfulness * 100).toFixed(0)}%</span>}
                    {r.avg_answer_relevancy != null && <span>R: {(r.avg_answer_relevancy * 100).toFixed(0)}%</span>}
                    <span className={r.status === 'ok' ? 'text-emerald-300' : r.status === 'skipped' ? 'text-[var(--text-secondary)]' : 'text-amber-300'}>{r.status}</span>
                  </span>
                </summary>
                {r.status === 'ok' && r.suggestion ? (
                  <div className="mt-2 space-y-1">
                    <div className="text-[var(--text-secondary)]">Weak dimension: <span className="text-amber-300">{r.weak_dimension}</span></div>
                    <pre className="mt-1 p-2 rounded-lg bg-[var(--glass)] text-[var(--text-secondary)] whitespace-pre-wrap font-mono text-[10px] max-h-48 overflow-y-auto">{r.suggestion}</pre>
                  </div>
                ) : (
                  <div className="mt-2 text-[var(--text-secondary)]">{r.reason || r.message || '—'}</div>
                )}
              </details>
            ))}
          </div>
        ) : optLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[var(--text-secondary)]" />
        ) : (
          <div className="text-[12px] text-[var(--text-secondary)] py-2">No optimizer runs yet. The nightly job runs at 03:00 UTC, or click Run Optimizer above.</div>
        )}
      </Panel>
    </div>
  );
}

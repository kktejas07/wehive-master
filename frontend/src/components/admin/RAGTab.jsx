import { useEffect, useState, useCallback } from 'react';
import { Database, Loader2, RefreshCw, Trash2, Search, FileText, Server, Cpu } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import { API } from '../../context/AuthContext';
import axios from 'axios';

function StatusBadge({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
      ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      {label}
    </span>
  );
}

export default function RAGTab() {
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const token = admin?.token || admin?.access_token;

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

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        axios.get(`${API}/rag/status`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/rag/collections`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setStatus(s.data);
      setCollections(c.data.collections || []);
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

  const wipeCollection = async (name) => {
    if (!token) return;
    if (!confirm(`Wipe all chunks in "${name}"?`)) return;
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
        subtitle="Local Ollama embeddings + ChromaDB. Ingest, search, and ground LLM answers."
        right={
          <button onClick={refresh} disabled={loading} className="h-9 px-3 rounded-full bg-white/5 hover:bg-white/10 text-[12px] text-slate-200 inline-flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel>
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-emerald-400" />
            <div className="text-[12px] font-bold uppercase tracking-wider text-slate-300">Vector Store</div>
          </div>
          {status ? (
            <div className="space-y-2 text-[12px] text-slate-300">
              <div className="flex items-center justify-between">
                <span>Backend</span>
                <span className="font-mono text-white">{status.vector_store?.backend}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Path</span>
                <span className="font-mono text-[11px] text-slate-400">{status.vector_store?.path}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Collections</span>
                <span className="font-mono text-white">{status.vector_store?.collections?.length || 0}</span>
              </div>
            </div>
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          )}
        </Panel>

        <Panel>
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <div className="text-[12px] font-bold uppercase tracking-wider text-slate-300">Ollama</div>
          </div>
          {status ? (
            <div className="space-y-2 text-[12px] text-slate-300">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <StatusBadge ok={status.ollama?.available} label={status.ollama?.available ? 'Online' : 'Offline'} />
              </div>
              <div className="flex items-center justify-between">
                <span>Embed Model</span>
                <span className="font-mono text-white">{status.ollama?.embed_model}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Host</span>
                <span className="font-mono text-[11px] text-slate-400">{status.ollama?.host}</span>
              </div>
              {!status.ollama?.available && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px]">
                  Start Ollama locally (<code className="font-mono">ollama serve</code>) and pull a model: <code className="font-mono">ollama pull nomic-embed-text</code>
                </div>
              )}
            </div>
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          )}
        </Panel>
      </div>

      <Panel>
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-emerald-400" />
          <div className="text-[12px] font-bold uppercase tracking-wider text-slate-300">Collections</div>
        </div>
        {collections.length === 0 ? (
          <div className="text-[12px] text-slate-400 py-3">No collections yet. Use the buttons below to ingest data.</div>
        ) : (
          <div className="space-y-2">
            {collections.map(c => (
              <div key={c.name} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div>
                  <div className="text-[13px] font-mono text-white">{c.name}</div>
                  <div className="text-[11px] text-slate-400">{c.count} chunks</div>
                </div>
                <button onClick={() => wipeCollection(c.name)} className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-300 hover:bg-red-500/25 text-[11px] font-bold inline-flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Wipe
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => ingest('countries')} disabled={!!ingesting} className="h-9 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[12px] font-bold text-white disabled:opacity-50 inline-flex items-center gap-1.5">
            {ingesting === 'countries' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            Ingest Countries
          </button>
          <button onClick={() => ingest('universities')} disabled={!!ingesting} className="h-9 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[12px] font-bold text-white disabled:opacity-50 inline-flex items-center gap-1.5">
            {ingesting === 'universities' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            Ingest Universities
          </button>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-emerald-400" />
          <div className="text-[12px] font-bold uppercase tracking-wider text-slate-300">Try It</div>
        </div>
        <div className="space-y-3">
          <textarea value={query} onChange={e => setQuery(e.target.value)} rows={2} placeholder="Ask anything — e.g. 'Tell me about student visa for Canada' or 'Universities offering scholarships in Germany'"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[13px] text-white outline-none focus:border-emerald-500/50 resize-y" />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] text-slate-400">k =
              <input type="number" min={1} max={20} value={retrieveK} onChange={e => setRetrieveK(parseInt(e.target.value) || 4)}
                className="ml-1 w-14 h-8 rounded-lg bg-white/5 border border-white/10 px-2 text-[12px] text-white outline-none" />
            </label>
            <label className="text-[11px] text-slate-400">Model
              <input value={qModel} onChange={e => setQModel(e.target.value)}
                className="ml-1 h-8 rounded-lg bg-white/5 border border-white/10 px-2 text-[12px] text-white outline-none font-mono" />
            </label>
            <button onClick={runRetrieve} disabled={retrieving || !query.trim()} className="h-9 px-3 rounded-full bg-white/5 hover:bg-white/10 text-[12px] text-slate-200 disabled:opacity-50 inline-flex items-center gap-1.5">
              {retrieving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Retrieve
            </button>
            <button onClick={runQuery} disabled={qBusy || !query.trim()} className="h-9 px-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[12px] font-bold text-white disabled:opacity-50 inline-flex items-center gap-1.5">
              {qBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
              Ask LLM
            </button>
          </div>

          {retrieval && (
            <div className="mt-3 p-3 rounded-xl bg-white/5 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Retrieved Context</div>
              {retrieval.chunks?.length ? (
                retrieval.chunks.map((c, i) => (
                  <div key={i} className="text-[12px] text-slate-200 whitespace-pre-wrap border-l-2 border-emerald-500/30 pl-3">{c}</div>
                ))
              ) : (
                <div className="text-[12px] text-slate-400">No chunks retrieved.</div>
              )}
            </div>
          )}

          {qReply && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">LLM Reply</div>
                <div className="text-[10px] text-slate-400 font-mono">{qReply.provider?.id}/{qReply.provider?.model}</div>
              </div>
              <div className="text-[13px] text-white whitespace-pre-wrap">{qReply.reply}</div>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

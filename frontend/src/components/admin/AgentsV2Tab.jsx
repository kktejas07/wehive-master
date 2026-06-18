import { useEffect, useState, useCallback } from 'react';
import { Bot, Loader2, RefreshCw, Trash2, Plus, Play, Save, X, Wrench, Cpu, Database } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import { API } from '../../context/AuthContext';
import axios from 'axios';

const PROVIDERS = [
  { id: 'ollama', name: 'Ollama (local)' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'google', name: 'Google Gemini' },
  { id: 'groq', name: 'Groq' },
  { id: 'openrouter', name: 'OpenRouter' },
];

const EMPTY_FORM = {
  id: '',
  name: '',
  role: '',
  description: '',
  prompt_id: 'agent.react',
  tools: '',
  provider_id: 'ollama',
  model: 'llama3.2',
  max_iterations: 6,
  max_tokens: 1024,
  temperature: 0.3,
  rag_collections: '',
  tags: '',
};

function AgentEditor({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(() => initial || EMPTY_FORM);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = () => {
    if (!form.id.trim() || !form.name.trim()) return;
    onSave({
      ...form,
      tools: form.tools.split(',').map(s => s.trim()).filter(Boolean),
      rag_collections: form.rag_collections.split(',').map(s => s.trim()).filter(Boolean),
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
      max_iterations: parseInt(form.max_iterations) || 6,
      max_tokens: parseInt(form.max_tokens) || 1024,
      temperature: parseFloat(form.temperature) || 0.3,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">ID</span>
          <input value={form.id} onChange={e => update('id', e.target.value)} disabled={!!initial}
            placeholder="hive_scholarship_match" className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none font-mono disabled:opacity-50" />
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Name</span>
          <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Scholarship Matchmaker"
            className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none" />
        </label>
      </div>
      <label className="block">
        <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Role</span>
        <input value={form.role} onChange={e => update('role', e.target.value)} placeholder="a scholarship matching assistant for Indian students"
          className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none" />
      </label>
      <label className="block">
        <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Description</span>
        <input value={form.description} onChange={e => update('description', e.target.value)}
          className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Prompt ID</span>
          <input value={form.prompt_id} onChange={e => update('prompt_id', e.target.value)}
            className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none font-mono" />
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Provider</span>
          <select value={form.provider_id} onChange={e => update('provider_id', e.target.value)}
            className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none">
            {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Model</span>
          <input value={form.model} onChange={e => update('model', e.target.value)}
            className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none font-mono" />
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Max Iterations</span>
          <input type="number" min={1} max={20} value={form.max_iterations} onChange={e => update('max_iterations', e.target.value)}
            className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none" />
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Max Tokens</span>
          <input type="number" min={50} max={4096} value={form.max_tokens} onChange={e => update('max_tokens', e.target.value)}
            className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none" />
        </label>
      </div>
      <label className="block">
        <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Tools (comma-separated registry names)</span>
        <input value={form.tools} onChange={e => update('tools', e.target.value)} placeholder="lookup_country, search_universities"
          className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[12px] text-white outline-none font-mono" />
      </label>
      <label className="block">
        <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">RAG Collections (comma-separated)</span>
        <input value={form.rag_collections} onChange={e => update('rag_collections', e.target.value)} placeholder="wehive_countries, wehive_universities"
          className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[12px] text-white outline-none font-mono" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Temperature (0-1)</span>
          <input type="number" step="0.1" min={0} max={1} value={form.temperature} onChange={e => update('temperature', e.target.value)}
            className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none" />
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Tags (comma-separated)</span>
          <input value={form.tags} onChange={e => update('tags', e.target.value)}
            className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none" />
        </label>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 h-10 rounded-full bg-white/5 hover:bg-white/10 text-[13px] font-bold text-slate-300 inline-flex items-center justify-center gap-1.5">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button onClick={submit} disabled={saving || !form.id.trim() || !form.name.trim()} className="flex-1 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[13px] font-bold text-white disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Agent
        </button>
      </div>
    </div>
  );
}

function RunPanel({ agent, token, onClose }) {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    if (!input.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await axios.post(`${API}/agents-v2/${agent.id}/run`, { input: input.trim() },
        { headers: { Authorization: `Bearer ${token}` } });
      setResult(r.data.run);
    } catch (e) {
      toast({ title: 'Agent run failed', description: e?.response?.data?.detail || e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111632] rounded-2xl border border-white/10 w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6 space-y-4 admin-scrollbar" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-white text-[16px]">{agent.name}</div>
            <div className="text-[11px] text-slate-400 font-mono">{agent.id} · {agent.provider_id}/{agent.model}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Input</span>
          <textarea value={input} onChange={e => setInput(e.target.value)} rows={3}
            placeholder="Ask the agent anything…"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[13px] text-white outline-none focus:border-emerald-500/50 resize-y" />
        </label>
        <button onClick={run} disabled={busy || !input.trim()} className="h-9 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[12px] font-bold text-white disabled:opacity-50 inline-flex items-center gap-1.5">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Run Agent
        </button>

        {result && (
          <div className="space-y-3 mt-2">
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">Final Answer</div>
                <div className="text-[10px] text-slate-400 font-mono">{result.duration_ms}ms</div>
              </div>
              <div className="text-[13px] text-white whitespace-pre-wrap">{result.final_answer}</div>
            </div>
            {result.steps?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">Trace ({result.steps.length} steps)</div>
                <div className="space-y-2">
                  {result.steps.map((s, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/5 text-[12px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-slate-500 font-mono">#{s.iteration}</span>
                        {s.tool_name && <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[10px]">TOOL: {s.tool_name}</span>}
                        {s.error && <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 font-mono text-[10px]">error</span>}
                        <span className="text-slate-500 ml-auto text-[10px]">{s.duration_ms}ms</span>
                      </div>
                      {s.tool_args && Object.keys(s.tool_args).length > 0 && (
                        <div className="text-slate-400 font-mono text-[11px] mb-1">args: {JSON.stringify(s.tool_args)}</div>
                      )}
                      {s.observation && (
                        <div className="text-slate-300 whitespace-pre-wrap border-l-2 border-emerald-500/30 pl-2 mt-1">
                          {String(s.observation).slice(0, 800)}
                        </div>
                      )}
                      {!s.tool_name && s.thought && (
                        <div className="text-slate-300 whitespace-pre-wrap">{String(s.thought).slice(0, 800)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentsV2Tab() {
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const token = admin?.token;

  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await axios.get(`${API}/agents-v2`, { headers: { Authorization: `Bearer ${token}` } });
      setAgents(r.data.agents || []);
    } catch (e) {
      toast({ title: 'Failed to load agents', description: e?.response?.data?.detail || e.message });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = async (spec) => {
    setSaving(true);
    try {
      await axios.post(`${API}/agents-v2`, spec, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: `Saved ${spec.id}` });
      setEditing(null);
      await refresh();
    } catch (e) {
      toast({ title: 'Save failed', description: e?.response?.data?.detail || e.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm(`Delete agent "${id}"?`)) return;
    try {
      await axios.delete(`${API}/agents-v2/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: `Deleted ${id}` });
      await refresh();
    } catch (e) {
      toast({ title: 'Delete failed', description: e?.response?.data?.detail || e.message });
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Agents V2"
        subtitle="Composable tool-using LLM agents. ReAct loop, RAG context, pluggable model."
        right={
          <div className="flex gap-2">
            <button onClick={refresh} className="h-9 px-3 rounded-full bg-white/5 hover:bg-white/10 text-[12px] text-slate-200 inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button onClick={() => setEditing(EMPTY_FORM)} className="h-9 px-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[12px] font-bold text-white inline-flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Agent
            </button>
          </div>
        }
      />

      {editing && (
        <Panel>
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-emerald-400" />
            <div className="text-[12px] font-bold uppercase tracking-wider text-slate-300">
              {editing.id ? `Edit ${editing.id}` : 'New Agent'}
            </div>
          </div>
          <AgentEditor initial={editing.id ? editing : null} onSave={save} onCancel={() => setEditing(null)} saving={saving} />
        </Panel>
      )}

      <Panel>
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-4 h-4 text-emerald-400" />
          <div className="text-[12px] font-bold uppercase tracking-wider text-slate-300">All Agents ({agents.length})</div>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 py-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : agents.length === 0 ? (
          <div className="text-[12px] text-slate-400 py-3">No agents yet. Create one to get started.</div>
        ) : (
          <div className="space-y-2">
            {agents.map(a => (
              <div key={a.id} className="p-3 rounded-xl bg-white/5 hover:bg-white/[0.07]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-[13px] font-mono text-white font-bold">{a.id}</code>
                      <span className="text-[12px] text-slate-300">{a.name}</span>
                    </div>
                    {a.description && <div className="text-[12px] text-slate-400 mb-1.5">{a.description}</div>}
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 font-mono inline-flex items-center gap-1">
                        <Cpu className="w-2.5 h-2.5" /> {a.provider_id}/{a.model || 'default'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 font-mono">
                        prompt: {a.prompt_id}
                      </span>
                      {a.tools?.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono inline-flex items-center gap-1">
                          <Wrench className="w-2.5 h-2.5" /> {a.tools.length} tools
                        </span>
                      )}
                      {a.rag_collections?.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono inline-flex items-center gap-1">
                          <Database className="w-2.5 h-2.5" /> {a.rag_collections.length} RAG
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setRunning(a)} className="px-2.5 py-1 rounded-full bg-emerald-600/80 hover:bg-emerald-500 text-[11px] font-bold text-white inline-flex items-center gap-1">
                      <Play className="w-3 h-3" /> Run
                    </button>
                    <button onClick={() => setEditing(a)} className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[11px] text-slate-200">
                      Edit
                    </button>
                    <button onClick={() => remove(a.id)} className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-300 hover:bg-red-500/25 text-[11px] font-bold inline-flex items-center gap-1">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {running && <RunPanel agent={running} token={token} onClose={() => setRunning(null)} />}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { FileText, Loader2, RefreshCw, Trash2, Plus, Edit3, Save, X, Code, Tag } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import { API } from '../../context/AuthContext';
import axios from 'axios';

const EMPTY_FORM = {
  id: '',
  version: 1,
  description: '',
  tags: '',
  variables: '',
  system: '',
  user: '',
};

function PromptEditor({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(() => initial ? {
    id: initial.id,
    version: initial.version || 1,
    description: initial.description || '',
    tags: (initial.tags || []).join(', '),
    variables: (initial.variables || []).join(', '),
    system: initial.system || '',
    user: initial.user || '',
  } : EMPTY_FORM);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.id.trim()) return;
    if (!form.system.trim() && !form.user.trim()) return;
    onSave({
      id: form.id.trim(),
      version: form.version ? parseInt(form.version) : undefined,
      description: form.description,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      variables: form.variables.split(',').map(t => t.trim()).filter(Boolean),
      system: form.system,
      user: form.user,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">ID</span>
          <input value={form.id} onChange={e => update('id', e.target.value)} disabled={!!initial}
            placeholder="system.hive" className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none font-mono disabled:opacity-50" />
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Version</span>
          <input type="number" min={1} value={form.version} onChange={e => update('version', e.target.value)}
            className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none" />
        </label>
      </div>
      <label className="block">
        <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Description</span>
        <input value={form.description} onChange={e => update('description', e.target.value)}
          className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Tags (comma-separated)</span>
          <input value={form.tags} onChange={e => update('tags', e.target.value)} placeholder="agent, react"
            className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none" />
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Variables (comma-separated)</span>
          <input value={form.variables} onChange={e => update('variables', e.target.value)} placeholder="user_input, context"
            className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none font-mono" />
        </label>
      </div>
      <label className="block">
        <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">System Prompt</span>
        <textarea value={form.system} onChange={e => update('system', e.target.value)} rows={6}
          placeholder="You are {{ agent_name }}, {{ agent_role }}."
          className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[12px] text-white outline-none font-mono resize-y" />
      </label>
      <label className="block">
        <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">User Template</span>
        <textarea value={form.user} onChange={e => update('user', e.target.value)} rows={4}
          placeholder="{{ user_input }}"
          className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[12px] text-white outline-none font-mono resize-y" />
      </label>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 h-10 rounded-full bg-white/5 hover:bg-white/10 text-[13px] font-bold text-slate-300 inline-flex items-center justify-center gap-1.5">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button onClick={submit} disabled={saving || !form.id.trim()} className="flex-1 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[13px] font-bold text-white disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Prompt
        </button>
      </div>
    </div>
  );
}

export default function PromptsTab() {
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const token = admin?.token;

  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await axios.get(`${API}/prompts`, { headers: { Authorization: `Bearer ${token}` } });
      setPrompts(r.data.prompts || []);
    } catch (e) {
      toast({ title: 'Failed to load prompts', description: e?.response?.data?.detail || e.message });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { refresh(); }, [refresh]);

  const openEditor = (prompt) => setEditing(prompt || { id: '', version: 1, description: '', tags: [], variables: [], system: '', user: '' });

  const save = async (payload) => {
    setSaving(true);
    try {
      await axios.post(`${API}/prompts`, payload, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: `Saved ${payload.id}` });
      setEditing(null);
      await refresh();
    } catch (e) {
      toast({ title: 'Save failed', description: e?.response?.data?.detail || e.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id, version) => {
    if (!confirm(`Delete prompt "${id}" v${version}?`)) return;
    try {
      await axios.delete(`${API}/prompts/${id}?version=${version}`, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: `Deleted ${id}` });
      await refresh();
    } catch (e) {
      toast({ title: 'Delete failed', description: e?.response?.data?.detail || e.message });
    }
  };

  const reloadAll = async () => {
    try {
      await axios.post(`${API}/prompts/reload`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: 'Prompts reloaded' });
      await refresh();
    } catch (e) {
      toast({ title: 'Reload failed', description: e?.response?.data?.detail || e.message });
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Local Prompts"
        subtitle="Versioned prompt templates. YAML defaults + Mongo overrides. Used by agents and Hive."
        right={
          <div className="flex gap-2">
            <button onClick={reloadAll} className="h-9 px-3 rounded-full bg-white/5 hover:bg-white/10 text-[12px] text-slate-200 inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Reload
            </button>
            <button onClick={() => openEditor(null)} className="h-9 px-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[12px] font-bold text-white inline-flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Prompt
            </button>
          </div>
        }
      />

      {editing && (
        <Panel>
          <div className="flex items-center gap-2 mb-3">
            <Edit3 className="w-4 h-4 text-emerald-400" />
            <div className="text-[12px] font-bold uppercase tracking-wider text-slate-300">
              {editing.id ? `Edit ${editing.id}` : 'New Prompt'}
            </div>
          </div>
          <PromptEditor initial={editing.id ? editing : null} onSave={save} onCancel={() => setEditing(null)} saving={saving} />
        </Panel>
      )}

      <Panel>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <div className="text-[12px] font-bold uppercase tracking-wider text-slate-300">All Prompts ({prompts.length})</div>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 py-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : prompts.length === 0 ? (
          <div className="text-[12px] text-slate-400 py-3">No prompts yet.</div>
        ) : (
          <div className="space-y-2">
            {prompts.map(p => (
              <div key={p.id} className="p-3 rounded-xl bg-white/5 hover:bg-white/[0.07]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-[13px] font-mono text-white font-bold">{p.id}</code>
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-slate-300 font-mono">v{p.version}</span>
                      {p.source && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-[10px] text-emerald-300 font-mono">{p.source}</span>
                      )}
                    </div>
                    {p.description && <div className="text-[12px] text-slate-300 mb-1.5">{p.description}</div>}
                    {p.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {p.tags.map(t => (
                          <span key={t} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-slate-400">
                            <Tag className="w-2.5 h-2.5" /> {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {p.variables?.length > 0 && (
                      <div className="text-[10px] text-slate-500 font-mono">vars: {p.variables.join(', ')}</div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditor(p)} className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[11px] text-slate-200 inline-flex items-center gap-1">
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => remove(p.id, p.version)} className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-300 hover:bg-red-500/25 text-[11px] font-bold inline-flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

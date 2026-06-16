import { useState, useEffect, useRef, useCallback } from 'react';
import { Building2, Globe, Upload, RefreshCw, Loader2, Database, FileSpreadsheet, CheckCircle2, Search, Edit3, Trash2, X, Save, ChevronDown, ChevronUp, ExternalLink, Plus, Sparkles } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, apiClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

const FIELDS = [
  { key: 'id', label: 'ID', editable: false, type: 'text' },
  { key: 'name', label: 'Name', editable: true, type: 'text' },
  { key: 'short_name', label: 'Short Name', editable: true, type: 'text' },
  { key: 'country_name', label: 'Country', editable: true, type: 'text' },
  { key: 'country', label: 'Code', editable: true, type: 'text' },
  { key: 'rank', label: 'Rank', editable: true, type: 'number' },
  { key: 'qs_rank', label: 'QS Rank', editable: true, type: 'number' },
  { key: 'times_rank', label: 'THE Rank', editable: true, type: 'number' },
  { key: 'type', label: 'Type', editable: true, type: 'text' },
  { key: 'established', label: 'Founded', editable: true, type: 'number' },
  { key: 'students', label: 'Students', editable: true, type: 'number' },
  { key: 'intl_students', label: 'Intl Students', editable: true, type: 'number' },
  { key: 'tuition_usd', label: 'Tuition $', editable: true, type: 'number' },
  { key: 'living_cost_usd', label: 'Living Cost $', editable: true, type: 'number' },
  { key: 'avg_salary_usd', label: 'Avg Salary $', editable: true, type: 'number' },
  { key: 'scholarships', label: 'Scholarships', editable: true, type: 'boolean' },
  { key: 'gre_required', label: 'GRE', editable: true, type: 'boolean' },
  { key: 'gmat_required', label: 'GMAT', editable: true, type: 'boolean' },
  { key: 'ielts_min', label: 'IELTS Min', editable: true, type: 'number' },
  { key: 'toefl_min', label: 'TOEFL Min', editable: true, type: 'number' },
  { key: 'acceptance_rate', label: 'Acceptance Rate', editable: true, type: 'text' },
  { key: 'employment_rate', label: 'Employment Rate', editable: true, type: 'text' },
  { key: 'website', label: 'Website', editable: true, type: 'text' },
  { key: 'image_url', label: 'Image URL', editable: true, type: 'text' },
  { key: 'location', label: 'Location', editable: true, type: 'text' },
  { key: 'description', label: 'Description', editable: true, type: 'textarea' },
];

const LIST_COLUMNS = ['name', 'country_name', 'rank', 'tuition_usd', 'students', 'scholarships', 'ielts_min'];

export default function UniversitiesTab() {
  const { token } = useAdminAuth();
  const { toast } = useToast();

  // Stats
  const [stats, setStats] = useState({ total: 0, countries: 0 });

  // List
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [skip, setSkip] = useState(0);
  const [listBusy, setListBusy] = useState(false);
  const limit = 25;

  // Editor
  const [editing, setEditing] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [saving, setSaving] = useState(false);

  // Bulk panels (collapsible)
  const [bulkOpen, setBulkOpen] = useState(false);

  // Loaders
  const [seedFile, setSeedFile] = useState(null);
  const [seedDryRun, setSeedDryRun] = useState(true);
  const [seedBusy, setSeedBusy] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const seedRef = useRef(null);

  const [enrichFile, setEnrichFile] = useState(null);
  const [enrichThreshold, setEnrichThreshold] = useState(88);
  const [enrichInsertMissing, setEnrichInsertMissing] = useState(false);
  const [enrichDryRun, setEnrichDryRun] = useState(true);
  const [enrichBusy, setEnrichBusy] = useState(false);
  const [enrichResult, setEnrichResult] = useState(null);
  const [enrichOverrides, setEnrichOverrides] = useState('');
  const enrichRef = useRef(null);

  const [scThreshold, setScThreshold] = useState(88);
  const [scInsertMissing, setScInsertMissing] = useState(false);
  const [scDryRun, setScDryRun] = useState(true);
  const [scBusy, setScBusy] = useState(false);
  const [scResult, setScResult] = useState(null);

  const [reSeedBusy, setReSeedBusy] = useState(false);
  const [reSeedResult, setReSeedResult] = useState(null);

  const [aiEnrichBusy, setAiEnrichBusy] = useState(false);
  const [aiEnrichResult, setAiEnrichResult] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await adminClient(token).get('/universities/stats');
      setStats(data);
    } catch { /* ignore */ }
  }, [token]);

  const loadList = useCallback(async (q = query, c = countryFilter, sk = skip) => {
    setListBusy(true);
    try {
      const params = { limit, skip: sk };
      if (q.trim()) params.q = q.trim();
      if (c.trim()) params.country = c.trim().toLowerCase();
      const { data } = await adminClient(token).get('/universities', { params });
      setItems(data.items);
      setTotal(data.total);
    } catch { toast({ title: 'Failed to load universities' }); }
    setListBusy(false);
  }, [token, query, countryFilter, skip, toast]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadList(); }, []);

  const search = () => { setSkip(0); loadList(query, countryFilter, 0); };

  const openEditor = (item) => {
    setEditing(item.id);
    setEditDraft({ ...item });
  };

  const closeEditor = () => { setEditing(null); setEditDraft({}); };

  const updateDraft = (key, value) => {
    setEditDraft(prev => ({ ...prev, [key]: value }));
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const patch = {};
      FIELDS.filter(f => f.editable).forEach(f => {
        const v = editDraft[f.key];
        const orig = items.find(i => i.id === editing)?.[f.key];
        if (JSON.stringify(v) !== JSON.stringify(orig)) {
          patch[f.key] = f.type === 'number' ? (v === '' || v === null ? undefined : Number(v)) : v;
        }
      });
      if (Object.keys(patch).length === 0) { toast({ title: 'No changes' }); setSaving(false); return; }
      await adminClient(token).patch(`/universities/${editing}`, patch);
      toast({ title: 'Updated' });
      closeEditor();
      loadList();
      loadStats();
    } catch (e) {
      toast({ title: 'Save failed', description: e.response?.data?.detail || e.message });
    }
    setSaving(false);
  };

  // Bulk ops
  const handleSeed = async () => {
    if (!seedFile) return;
    setSeedBusy(true); setSeedResult(null);
    const form = new FormData();
    form.append('file', seedFile);
    form.append('dry_run', String(seedDryRun));
    try {
      const { data } = await adminClient(token).post('/universities/seed-from-csv', form);
      setSeedResult(data);
      toast({ title: seedDryRun ? 'Dry-run complete' : 'CSV seeded', description: `${data.valid_docs} docs.` });
      if (!seedDryRun) { loadList(); loadStats(); }
    } catch (e) {
      toast({ title: 'Seed failed', description: e.response?.data?.detail || e.message });
    }
    setSeedBusy(false);
  };

  const handleEnrich = async () => {
    if (!enrichFile) return;
    setEnrichBusy(true); setEnrichResult(null);
    const form = new FormData();
    form.append('file', enrichFile);
    form.append('threshold', String(enrichThreshold));
    form.append('insert_missing', String(enrichInsertMissing));
    form.append('dry_run', String(enrichDryRun));
    if (enrichOverrides.trim()) form.append('column_overrides', enrichOverrides.trim());
    try {
      const { data } = await adminClient(token).post('/universities/enrich-from-csv', form);
      setEnrichResult(data);
      toast({ title: enrichDryRun ? 'Dry-run' : 'Enrichment applied', description: `${data.updated} updated.` });
      if (!enrichDryRun) { loadList(); loadStats(); }
    } catch (e) {
      toast({ title: 'Enrichment failed', description: e.response?.data?.detail || e.message });
    }
    setEnrichBusy(false);
  };

  const handleScorecard = async () => {
    setScBusy(true); setScResult(null);
    const form = new FormData();
    form.append('threshold', String(scThreshold));
    form.append('insert_missing', String(scInsertMissing));
    form.append('dry_run', String(scDryRun));
    try {
      const { data } = await adminClient(token).post('/universities/enrich-scorecard', form);
      setScResult(data);
      toast({ title: scDryRun ? 'Dry-run' : 'Scorecard done', description: `${data.updated} updated.` });
      if (!scDryRun) { loadList(); loadStats(); }
    } catch (e) {
      toast({ title: 'Scorecard failed', description: e.response?.data?.detail || e.message });
    }
    setScBusy(false);
  };

  const handleAIEnrich = async () => {
    setAiEnrichBusy(true); setAiEnrichResult(null);
    try {
      const { data } = await apiClient(token).post('/ai/universities/enrich-missing');
      setAiEnrichResult(data);
      toast({ title: 'AI enrichment', description: `${data.enriched} universities enriched.` });
      loadList(); loadStats();
    } catch (e) {
      toast({ title: 'AI enrichment failed', description: e.response?.data?.detail || e.message });
    }
    setAiEnrichBusy(false);
  };

  const handleReSeed = async () => {
    setReSeedBusy(true); setReSeedResult(null);
    try {
      const { data } = await adminClient(token).post('/universities/re-seed');
      setReSeedResult(data.result);
      toast({ title: 'Re-seed complete' });
      loadList(); loadStats();
    } catch (e) {
      toast({ title: 'Re-seed failed', description: e.response?.data?.detail || e.message });
    }
    setReSeedBusy(false);
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(skip / limit) + 1;

  return (
    <div data-testid="admin-universities-tab">
      <AdminHeader
        title="Universities"
        subtitle="Browse, edit, and bulk-manage university data."
        right={
          <div className="flex items-center gap-2 text-[13px]">
            <div className="flex items-center gap-3 text-slate-400 font-semibold">
              <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {stats.total}</span>
              <span className="inline-flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {stats.countries}</span>
            </div>
          </div>
        }
      />

      {/* ── Search + Filters ── */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Search name, country..." className="w-full h-10 pl-9 pr-4 rounded-xl bg-[#111632] border border-white/10 text-[13px] text-white placeholder:text-slate-500 outline-none focus:border-sky-500" />
        </div>
        <input value={countryFilter} onChange={e => setCountryFilter(e.target.value)} placeholder="Country code (us, gb...)" className="h-10 px-4 rounded-xl bg-[#111632] border border-white/10 text-[13px] text-white placeholder:text-slate-500 outline-none focus:border-sky-500 w-40" />
        <button onClick={search} className="h-10 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[13px] font-bold">Search</button>
        <button onClick={() => { setQuery(''); setCountryFilter(''); setSkip(0); loadList('', '', 0); }} className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-[13px] font-bold">Clear</button>
      </div>

      {/* ── Bulk ops toggle ── */}
      <button onClick={() => setBulkOpen(!bulkOpen)} className="flex items-center gap-2 mb-3 text-[12px] font-bold text-slate-400 hover:text-white transition">
        {bulkOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        Bulk operations (seed, enrich, scorecard, re-seed)
      </button>

      {bulkOpen && (
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          {/* Seed */}
          <Panel className="!p-4">
            <h4 className="text-[13px] font-bold text-white mb-2 flex items-center gap-1.5"><Upload className="w-3.5 h-3.5 text-sky-300" /> Seed from CSV</h4>
            <div className="flex flex-wrap gap-2 items-center">
              <input ref={seedRef} type="file" accept=".csv" onChange={e => setSeedFile(e.target.files[0])} className="text-[11px] text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-white/10 file:text-[11px] file:font-bold file:text-slate-200" />
              <label className="flex items-center gap-1 text-[11px] text-slate-400"><input type="checkbox" checked={seedDryRun} onChange={e => setSeedDryRun(e.target.checked)} className="accent-[hsl(var(--accent))]" /> Dry run</label>
              <button disabled={!seedFile || seedBusy} onClick={handleSeed} className="inline-flex items-center gap-1 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-2.5 py-1.5 text-[11px] font-bold">{seedBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />} Go</button>
            </div>
            {seedResult && <div className="mt-2 p-2 rounded-lg bg-black/30 text-[11px] font-mono text-slate-300 max-h-24 overflow-y-auto">{JSON.stringify(seedResult, null, 2)}</div>}
          </Panel>

          {/* Enrich */}
          <Panel className="!p-4">
            <h4 className="text-[13px] font-bold text-white mb-2 flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-amber-300" /> Enrich from CSV</h4>
            <div className="flex flex-wrap gap-2 items-center">
              <input ref={enrichRef} type="file" accept=".csv" onChange={e => setEnrichFile(e.target.files[0])} className="text-[11px] text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-white/10 file:text-[11px] file:font-bold file:text-slate-200" />
              <label className="flex items-center gap-1 text-[11px] text-slate-400"><input type="checkbox" checked={enrichDryRun} onChange={e => setEnrichDryRun(e.target.checked)} className="accent-[hsl(var(--accent))]" /> Dry run</label>
              <button disabled={!enrichFile || enrichBusy} onClick={handleEnrich} className="inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-2.5 py-1.5 text-[11px] font-bold">{enrichBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />} Go</button>
            </div>
            {enrichResult && <div className="mt-2 p-2 rounded-lg bg-black/30 text-[11px] font-mono text-slate-300 max-h-24 overflow-y-auto">{JSON.stringify(enrichResult, null, 2)}</div>}
          </Panel>

          {/* Scorecard */}
          <Panel className="!p-4">
            <h4 className="text-[13px] font-bold text-white mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> College Scorecard</h4>
            <div className="flex flex-wrap gap-2 items-center">
              <label className="flex items-center gap-1 text-[11px] text-slate-400"><input type="checkbox" checked={scDryRun} onChange={e => setScDryRun(e.target.checked)} className="accent-[hsl(var(--accent))]" /> Dry run</label>
              <button disabled={scBusy} onClick={handleScorecard} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-2.5 py-1.5 text-[11px] font-bold">{scBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Run</button>
            </div>
            {scResult && <div className="mt-2 p-2 rounded-lg bg-black/30 text-[11px] font-mono text-slate-300 max-h-24 overflow-y-auto">{JSON.stringify(scResult, null, 2)}</div>}
          </Panel>

          {/* AI Enrichment */}
          <Panel className="!p-4">
            <h4 className="text-[13px] font-bold text-white mb-2 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-purple-300" /> AI Enrich Missing</h4>
            <p className="text-[10px] text-slate-500 mb-2">Batch-fills template descriptions, courses, facilities for bare universities.</p>
            <button disabled={aiEnrichBusy} onClick={handleAIEnrich} className="inline-flex items-center gap-1 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-2.5 py-1.5 text-[11px] font-bold">{aiEnrichBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Enrich with AI</button>
            {aiEnrichResult && <div className="mt-2 p-2 rounded-lg bg-black/30 text-[11px] font-mono text-slate-300 max-h-24 overflow-y-auto">{JSON.stringify(aiEnrichResult, null, 2)}</div>}
          </Panel>

          {/* Re-seed */}
          <Panel className="!p-4">
            <h4 className="text-[13px] font-bold text-white mb-2 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 text-red-300" /> Re-seed</h4>
            <button disabled={reSeedBusy} onClick={handleReSeed} className="inline-flex items-center gap-1 rounded-lg bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-50 text-white px-2.5 py-1.5 text-[11px] font-bold">{reSeedBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Re-seed from static</button>
            {reSeedResult && <div className="mt-2 p-2 rounded-lg bg-black/30 text-[11px] font-mono text-slate-300 max-h-24 overflow-y-auto">{JSON.stringify(reSeedResult, null, 2)}</div>}
          </Panel>
        </div>
      )}

      {/* ── List ── */}
      <Panel className="overflow-hidden">
        {items === null ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-[14px]">No universities found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="text-left py-2.5 px-2">Name</th>
                    <th className="text-left py-2.5 px-2">Country</th>
                    <th className="text-right py-2.5 px-2">Rank</th>
                    <th className="text-right py-2.5 px-2">Tuition</th>
                    <th className="text-right py-2.5 px-2">Students</th>
                    <th className="text-center py-2.5 px-2">Schol</th>
                    <th className="text-center py-2.5 px-2">IELTS</th>
                    <th className="text-right py-2.5 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="py-2.5 px-2 text-white font-semibold truncate max-w-[220px]">{u.name}</td>
                      <td className="py-2.5 px-2 text-slate-300">{u.country_name} {u.flag}</td>
                      <td className="py-2.5 px-2 text-right text-slate-300">{u.rank || '—'}</td>
                      <td className="py-2.5 px-2 text-right text-slate-300">{u.tuition_usd ? `$${u.tuition_usd.toLocaleString()}` : '—'}</td>
                      <td className="py-2.5 px-2 text-right text-slate-300">{u.students ? u.students.toLocaleString() : '—'}</td>
                      <td className="py-2.5 px-2 text-center">{u.scholarships ? <span className="text-emerald-400">Yes</span> : <span className="text-slate-600">—</span>}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{u.ielts_min || '—'}</td>
                      <td className="py-2.5 px-2 text-right">
                        <button onClick={() => openEditor(u)} className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 px-2.5 py-1.5 text-[11px] font-bold transition"><Edit3 className="w-3 h-3" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                <div className="text-[12px] text-slate-500">{total} total</div>
                <div className="flex gap-1">
                  <button disabled={currentPage <= 1} onClick={() => { setSkip(s => Math.max(0, s - limit)); loadList(query, countryFilter, Math.max(0, skip - limit)); }} className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-[11px] font-bold">Prev</button>
                  <span className="h-8 px-3 flex items-center text-[12px] text-slate-400">{currentPage} / {totalPages}</span>
                  <button disabled={currentPage >= totalPages} onClick={() => { setSkip(s => s + limit); loadList(query, countryFilter, skip + limit); }} className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-[11px] font-bold">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </Panel>

      {/* ── Edit Modal ── */}
      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeEditor}>
          <div className="rounded-2xl bg-[#111632] border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#111632] z-10 flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="text-[16px] font-bold text-white truncate max-w-[400px]">{editDraft.name || 'Edit University'}</h3>
              <button onClick={closeEditor} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"><X className="w-4 h-4 text-slate-400" /></button>
            </div>

            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {FIELDS.filter(f => f.editable).map(f => (
                <div key={f.key}>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">{f.label}</label>
                  {f.type === 'boolean' ? (
                    <select value={editDraft[f.key] === true ? 'true' : editDraft[f.key] === false ? 'false' : ''} onChange={e => updateDraft(f.key, e.target.value === 'true' ? true : e.target.value === 'false' ? false : null)} className="w-full h-9 px-3 rounded-xl bg-black/30 border border-white/10 text-[12px] text-white outline-none focus:border-sky-500">
                      <option value="">—</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : f.type === 'number' ? (
                    <input type="number" value={editDraft[f.key] ?? ''} onChange={e => updateDraft(f.key, e.target.value === '' ? null : Number(e.target.value))} className="w-full h-9 px-3 rounded-xl bg-black/30 border border-white/10 text-[12px] text-white outline-none focus:border-sky-500" />
                  ) : f.type === 'textarea' ? (
                    <textarea value={editDraft[f.key] || ''} onChange={e => updateDraft(f.key, e.target.value)} rows={3} className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-[12px] text-white outline-none focus:border-sky-500 resize-none" />
                  ) : f.key === 'image_url' ? (
                    <div className="space-y-2">
                      <input type="text" value={editDraft[f.key] || ''} onChange={e => updateDraft(f.key, e.target.value)} placeholder="https://..." className="w-full h-9 px-3 rounded-xl bg-black/30 border border-white/10 text-[12px] text-white outline-none focus:border-sky-500" />
                      {editDraft.image_url && (
                        <img src={editDraft.image_url} alt="" className="w-full h-24 rounded-lg object-cover bg-black/50" onError={e => { e.target.style.display = 'none' }} />
                      )}
                    </div>
                  ) : (
                    <input type="text" value={editDraft[f.key] || ''} onChange={e => updateDraft(f.key, e.target.value)} className="w-full h-9 px-3 rounded-xl bg-black/30 border border-white/10 text-[12px] text-white outline-none focus:border-sky-500" />
                  )}
                </div>
              ))}
            </div>

            {/* List fields (courses, intakes, accreditation, facilities) */}
            {['courses', 'popular_courses', 'intakes', 'accreditation', 'facilities'].map(listKey => (
              <div key={listKey} className="px-5 mb-3">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">{listKey.replace(/_/g, ' ')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {(editDraft[listKey] || []).map((item, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5 text-[11px] text-slate-300">
                      {item}
                      <button onClick={() => updateDraft(listKey, (editDraft[listKey] || []).filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                  <AddListItem onAdd={v => updateDraft(listKey, [...(editDraft[listKey] || []), v])} />
                </div>
              </div>
            ))}

            <div className="sticky bottom-0 bg-[#111632] flex justify-end gap-2 p-5 border-t border-white/5">
              <button onClick={closeEditor} className="h-10 px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[13px] font-bold">Cancel</button>
              <button disabled={saving} onClick={saveEdit} className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-50 text-white text-[13px] font-bold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddListItem({ onAdd }) {
  const [show, setShow] = useState(false);
  const [val, setVal] = useState('');
  return (
    <span className="inline-flex items-center">
      {show ? (
        <span className="flex gap-1">
          <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal(''); } }} className="w-24 h-6 px-2 rounded-lg bg-black/30 border border-white/10 text-[11px] text-white outline-none" autoFocus />
          <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(''); } }} className="text-emerald-400 hover:text-emerald-300"><Plus className="w-3 h-3" /></button>
        </span>
      ) : (
        <button onClick={() => setShow(true)} className="text-slate-500 hover:text-slate-300"><Plus className="w-3.5 h-3.5" /></button>
      )}
    </span>
  );
}

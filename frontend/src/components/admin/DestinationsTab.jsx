import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Upload, Cloud, CheckCircle2, XCircle, Image as ImageIcon,
  Search, Trash2, RefreshCw, FileUp, X, Database, ArrowUpDown,
  Grid3X3, List, Download, MoreVertical,
} from 'lucide-react';
import { adminClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import Pagination from './Pagination';

function PreviewModal({ item, onClose, onRefresh, r2PublicUrl }) {
  const { toast } = useToast();
  const [regenerating, setRegenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const client = adminClient();
      const res = await client.post(`/destinations/regenerate?country=${encodeURIComponent(item.country)}`);
      toast({ title: `Regenerated ${item.country}`, variant: 'success' });
      onRefresh();
    } catch (e) {
      toast({ title: 'Regeneration failed', description: e.response?.data?.detail || e.message, variant: 'error' });
    } finally {
      setRegenerating(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const client = adminClient();
      const form = new FormData();
      form.append('file', file);
      await client.post(`/destinations/upload-image?country=${encodeURIComponent(item.country)}`, form);
      toast({ title: `Uploaded ${file.name}`, variant: 'success' });
      onRefresh();
    } catch (e) {
      toast({ title: 'Upload failed', description: e.response?.data?.detail || e.message, variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${item.country} from R2?`)) return;
    setDeleting(true);
    try {
      const client = adminClient();
      await client.delete(`/destinations/r2-image?country=${encodeURIComponent(item.country)}`);
      toast({ title: `Deleted ${item.country} from R2`, variant: 'success' });
      onRefresh();
    } catch (e) {
      toast({ title: 'Delete failed', description: e.response?.data?.detail || e.message, variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-lg w-full rounded-2xl bg-[#111632] border border-white/10 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition">
          <X className="w-4 h-4" />
        </button>
        <div className="aspect-[2/3] bg-black/50">
          <img
            src={item.onR2 && r2PublicUrl ? `${r2PublicUrl}/destinations/${item.filename}` : `/images/destinations/${item.filename}`}
            alt={item.country}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-bold text-white">{item.country}</h3>
              <p className="text-[11px] text-slate-400 font-mono">{item.filename}</p>
            </div>
            {item.onR2 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-bold">
                <CheckCircle2 className="w-3 h-3" /> on R2
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-500/15 text-slate-400 text-[11px] font-bold">
                <Cloud className="w-3 h-3" /> local only
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <label className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold transition cursor-pointer">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
              {uploading ? 'Uploading...' : 'Replace Image'}
              <input type="file" accept="image/webp,image/png,image/jpeg" className="hidden" onChange={handleUpload} />
            </label>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[hsl(var(--accent))]/15 hover:bg-[hsl(var(--accent))]/25 text-[hsl(var(--accent))] text-[12px] font-bold transition disabled:opacity-50"
            >
              {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {regenerating ? 'Generating...' : 'Regen via AI'}
            </button>
            {item.onR2 && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-[12px] font-bold transition disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {deleting ? 'Deleting...' : 'Delete from R2'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DestinationsTab() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [r2Status, setR2Status] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [results, setResults] = useState(null);
  const [syncProgress, setSyncProgress] = useState({ uploaded: 0, skipped: 0, failed: 0, total: 0, current: 0, log: [] });
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);
  const [sortBy, setSortBy] = useState('name-asc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [r2PublicUrl, setR2PublicUrl] = useState('');
  const [r2Cached, setR2Cached] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const client = adminClient();
      const [destRes, r2Res, r2SettingsRes] = await Promise.allSettled([
        client.get('/destinations'),
        client.get('/destinations/r2-status'),
        client.get('/settings/r2'),
      ]);
      const dests = destRes.value?.data?.items || [];
      const statusMap = {};
      if (r2Res.value?.data?.items) {
        for (const s of r2Res.value.data.items) {
          statusMap[s.filename] = s.onR2;
        }
      }
      setItems(dests);
      setR2Status(statusMap);
      setR2Cached(r2Res.value?.data?.cached || false);
      const r2Cfg = r2SettingsRes.value?.data?.config || {};
      setR2PublicUrl((r2Cfg.public_url || '').replace(/\/$/, ''));
    } catch (e) {
      toast({ title: 'Failed to load destinations', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefreshR2 = async () => {
    setLoading(true);
    try {
      const client = adminClient();
      const res = await client.get('/destinations/r2-status?refresh=true');
      const statusMap = {};
      for (const s of res.data.items || []) {
        statusMap[s.filename] = s.onR2;
      }
      setR2Status(statusMap);
      setR2Cached(false);
    } catch (e) {
      toast({ title: 'R2 status refresh failed', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const client = adminClient();
      await client.post('/destinations/seed-manifest');
      toast({ title: 'Manifest seeded successfully', variant: 'success' });
      fetchAll();
    } catch (e) {
      toast({ title: 'Seed failed', description: e.response?.data?.detail || e.message, variant: 'error' });
    } finally {
      setSeeding(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setResults(null);
    setSyncProgress({ uploaded: 0, skipped: 0, failed: 0, total: 0, current: 0, log: [] });

    try {
      const token = adminClient().defaults?.headers?.Authorization?.split(' ')[1] || '';
      const baseUrl = process.env.REACT_APP_BACKEND_URL || 'https://api.wehive.co.in';
      const response = await fetch(`${baseUrl}/api/admin/destinations/sync-to-r2-stream`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'text/event-stream' },
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.event === 'start') {
                setSyncProgress(prev => ({ ...prev, total: data.total }));
              } else if (data.event === 'progress') {
                setSyncProgress(prev => ({
                  ...prev,
                  current: data.index,
                  uploaded: data.uploaded,
                  skipped: data.skipped,
                  failed: data.failed,
                  log: [...prev.log, `[${data.index}/${data.total}] ${data.filename}: ${data.status}`],
                }));
              } else if (data.event === 'complete') {
                setSyncProgress(prev => ({ ...prev, uploaded: data.uploaded, skipped: data.skipped, failed: data.failed }));
                if (data.failed > 0) {
                  toast({ title: `Synced ${data.uploaded + data.skipped}/${data.total} (${data.failed} failed)`, variant: 'error' });
                } else {
                  toast({ title: `All ${data.total} images synced to R2`, variant: 'success' });
                }
              }
            } catch {}
          }
        }
      }
      fetchAll();
    } catch (e) {
      toast({ title: 'Sync failed', description: e.message, variant: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const r2Count = Object.values(r2Status).filter(Boolean).length;
  const localCount = items.length - r2Count;

  const getImageUrl = (filename, onR2) => {
    if (onR2 && r2PublicUrl) return `${r2PublicUrl}/destinations/${filename}`;
    return `/images/destinations/${filename}`;
  };

  const filtered = items
    .filter((item) => {
      const matchesSearch = item.country.toLowerCase().includes(search.toLowerCase());
      if (statusFilter === 'all') return matchesSearch;
      const onR2 = r2Status[item.filename];
      if (statusFilter === 'r2') return matchesSearch && onR2;
      if (statusFilter === 'local') return matchesSearch && !onR2;
      return matchesSearch;
    })
    .sort((a, b) => {
      const aR2 = r2Status[a.filename] ? 1 : 0;
      const bR2 = r2Status[b.filename] ? 1 : 0;
      switch (sortBy) {
        case 'name-asc': return a.country.localeCompare(b.country);
        case 'name-desc': return b.country.localeCompare(a.country);
        case 'r2-first': return bR2 - aR2 || a.country.localeCompare(b.country);
        case 'r2-last': return aR2 - bR2 || a.country.localeCompare(b.country);
        default: return 0;
      }
    });

  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--accent))]" />
      </div>
    );
  }

  return (
    <div>
      <AdminHeader
        title="Destination Images"
        subtitle={`Manage ${items.length || '...'} AI-generated country illustrations — upload, regenerate, or sync to Cloudflare R2 CDN`}
        right={
          <div className="flex items-center gap-2">
            {r2Cached && (
              <button
                onClick={handleRefreshR2}
                disabled={loading}
                className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-bold text-[12px] transition"
                title="Force refresh R2 status cache"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-50 text-white font-bold text-[13px] transition"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {syncing ? 'Uploading...' : 'Upload All to R2'}
            </button>
          </div>
        }
      />

      {syncing && syncProgress.total > 0 && (
        <Panel className="mb-4 border-[hsl(var(--accent))]/20">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-bold text-white flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[hsl(var(--accent))]" />
                Syncing to R2 ({syncProgress.current}/{syncProgress.total})
              </h4>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-emerald-400 font-semibold">{syncProgress.uploaded} new</span>
                <span className="text-slate-400">{syncProgress.skipped} already there</span>
                {syncProgress.failed > 0 && <span className="text-red-400 font-semibold">{syncProgress.failed} failed</span>}
              </div>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--accent))] to-emerald-400 transition-all duration-300"
                style={{ width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%` }}
              />
            </div>
            <div className="max-h-32 overflow-y-auto space-y-0.5 text-[10px] text-slate-500 font-mono">
              {syncProgress.log.slice(-8).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        </Panel>
      )}

      {results && (
        <Panel className="mb-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-[hsl(var(--accent))]" />
              <span className="text-[15px] font-bold text-white">Sync Complete</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-[13px] text-emerald-400 font-semibold">{results.uploaded} uploaded</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-500" />
              <span className="text-[13px] text-slate-400 font-semibold">{results.skipped} already existed</span>
            </div>
            {results.failed > 0 && (
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-[13px] text-red-400 font-semibold">{results.failed} failed</span>
              </div>
            )}
          </div>
        </Panel>
      )}

      {results?.failed > 0 && (
        <Panel className="mb-6 border-red-500/20">
          <h4 className="text-[13px] font-bold text-red-400 mb-3">Failed Uploads</h4>
          <div className="space-y-1">
            {results.results.filter(r => r.status === 'failed').map(r => (
              <div key={r.filename} className="flex items-center gap-2 text-[12px] text-red-300">
                <XCircle className="w-3 h-3 shrink-0" />
                <span className="font-mono">{r.filename}</span>
                <span className="text-slate-500">— {r.error}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search countries..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-black/30 border border-white/10 text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-[hsl(var(--accent))] transition"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl bg-black/30 border border-white/10 text-[12px] font-semibold text-slate-300 outline-none focus:border-[hsl(var(--accent))] transition cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="r2">On R2</option>
          <option value="local">Local Only</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-10 px-3 rounded-xl bg-black/30 border border-white/10 text-[12px] font-semibold text-slate-300 outline-none focus:border-[hsl(var(--accent))] transition cursor-pointer"
        >
          <option value="name-asc">A → Z</option>
          <option value="name-desc">Z → A</option>
          <option value="r2-first">R2 First</option>
          <option value="r2-last">Local First</option>
        </select>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${viewMode === 'grid' ? 'bg-white/15 text-white' : 'text-slate-500 hover:text-white'}`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${viewMode === 'list' ? 'bg-white/15 text-white' : 'text-slate-500 hover:text-white'}`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-3 text-[12px]">
          <span className="text-slate-400">{items.length} total</span>
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> {r2Count} on R2
          </span>
          <span className="flex items-center gap-1 text-slate-400 font-semibold">
            <Cloud className="w-3 h-3" /> {localCount} local
          </span>
        </div>
      </div>

      {preview && (
        <PreviewModal item={preview} onClose={() => setPreview(null)} onRefresh={fetchAll} r2PublicUrl={r2PublicUrl} />
      )}

      <Panel>
        {viewMode === 'grid' ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {paginated.map((item) => {
              const onR2 = r2Status[item.filename];
              return (
                <div
                  key={item.filename}
                  className="rounded-xl overflow-hidden bg-black/30 border border-white/5 group cursor-pointer hover:border-white/20 transition"
                  onClick={() => setPreview({ ...item, onR2 })}
                >
                  <div className="aspect-[2/3] bg-black/50 overflow-hidden relative">
                    <img
                      src={getImageUrl(item.filename, onR2)}
                      alt={item.country}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2">
                      {onR2 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/60 backdrop-blur-sm text-white text-[9px] font-bold">
                          <CheckCircle2 className="w-2.5 h-2.5" /> R2
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/60 backdrop-blur-sm text-white text-[9px] font-bold">
                          <Cloud className="w-2.5 h-2.5" /> local
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="text-[11px] font-bold text-white truncate">{item.country}</div>
                    <div className="text-[10px] text-slate-500 truncate font-mono">{item.filename}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-[40px_1fr_120px_100px] gap-3 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5">
              <span></span>
              <span>Country</span>
              <span>Status</span>
              <span>File</span>
            </div>
            {paginated.map((item, idx) => {
              const onR2 = r2Status[item.filename];
              return (
                <div
                  key={item.filename}
                  className="grid grid-cols-[40px_1fr_120px_100px] gap-3 px-4 py-2.5 items-center rounded-lg hover:bg-white/5 cursor-pointer transition"
                  onClick={() => setPreview({ ...item, onR2 })}
                >
                  <span className="text-[10px] text-slate-600 font-mono w-8 text-center">{idx + page * pageSize + 1}</span>
                  <div>
                    <div className="text-[12px] font-semibold text-white">{item.country}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{item.filename}</div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${onR2 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                    {onR2 ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Cloud className="w-2.5 h-2.5" />}
                    {onR2 ? 'R2' : 'Local'}
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono truncate">{item.filename}</span>
                </div>
              );
            })}
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Database className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-[16px] font-bold text-white mb-1">No Destination Data</p>
            <p className="text-[13px] mb-5">manifest.json not found on server. Seed the data from the Git repository.</p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-50 text-white font-bold text-[13px] transition"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              {seeding ? 'Seeding...' : 'Seed Manifest from Repo'}
            </button>
          </div>
        )}
        {items.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <ImageIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-[14px] font-semibold">No countries match "{search}"</p>
          </div>
        )}

        {filtered.length > 0 && <Pagination skip={page * pageSize} limit={pageSize} total={filtered.length} onPageChange={(s) => setPage(Math.floor(s / pageSize))} />}
      </Panel>
    </div>
  );
}

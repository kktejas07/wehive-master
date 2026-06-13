import { useEffect, useState } from 'react';
import { Loader2, Upload, Cloud, CheckCircle2, XCircle, Image as ImageIcon } from 'lucide-react';
import { adminClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

export default function DestinationsTab() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const client = adminClient();
        const res = await client.get('/destinations');
        setItems(res.data.items || []);
      } catch (e) {
        toast({ title: 'Failed to load destinations', variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setResults(null);
    try {
      const client = adminClient();
      const res = await client.post('/destinations/sync-to-r2');
      setResults(res.data);
      const { uploaded, skipped, failed, total } = res.data;
      if (failed > 0) {
        toast({ title: `Synced ${uploaded + skipped}/${total} (${failed} failed)`, variant: 'error' });
      } else {
        toast({ title: `All ${total} images synced to R2 ✓`, variant: 'success' });
      }
    } catch (e) {
      toast({ title: 'Sync failed', description: e.response?.data?.detail || e.message, variant: 'error' });
    } finally {
      setSyncing(false);
    }
  };

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
        subtitle="Manage AI-generated country illustrations — upload to Cloudflare R2 CDN for faster delivery"
        right={
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-50 text-white font-bold text-[13px] transition"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {syncing ? 'Uploading...' : 'Upload All to R2'}
          </button>
        }
      />

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

      <Panel>
        <div className="flex items-center gap-2.5 mb-5">
          <ImageIcon className="w-4 h-4 text-slate-400" />
          <span className="text-[13px] text-slate-400 font-semibold">{items.length} destination images</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <div key={item.filename} className="rounded-xl overflow-hidden bg-black/30 border border-white/5 group">
              <div className="aspect-[2/3] bg-black/50 overflow-hidden">
                <img
                  src={`/images/destinations/${item.filename}`}
                  alt={item.country}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-2.5">
                <div className="text-[11px] font-bold text-white truncate">{item.country}</div>
                <div className="text-[10px] text-slate-500 truncate font-mono">{item.filename}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

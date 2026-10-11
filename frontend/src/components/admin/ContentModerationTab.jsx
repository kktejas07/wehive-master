import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, ExternalLink, Newspaper } from 'lucide-react';
import { apiClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

// Aggregated news and blog posts arrive as `pending`; nothing is published
// until an admin approves it here.
const KINDS = { news: 'News', blogs: 'Blogs' };
const LIMIT = 20;

export default function ContentModerationTab() {
  const [kind, setKind] = useState('news');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const { toast } = useToast();

  const fetchPending = () => {
    setLoading(true);
    apiClient().get(`/${kind}/pending`, { params: { page, limit: LIMIT } })
      .then(r => setData(r.data))
      .catch(() => {
        setData({ items: [], total: 0, pages: 0 });
        toast({ title: `Failed to load pending ${KINDS[kind].toLowerCase()}`, variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPending();
  }, [kind, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAction = async (id, action) => {
    setBusy(id);
    try {
      await apiClient().post(`/${kind}/${id}/${action}`);
      toast({ title: action === 'approve' ? 'Approved and published' : 'Rejected' });
      // Step back a page if this was the last item on it.
      if (data.items.length === 1 && page > 1) setPage(p => p - 1);
      else fetchPending();
    } catch (e) {
      toast({
        title: e.response?.status === 404 ? 'Item no longer exists' : `Failed to ${action}`,
        variant: 'destructive',
      });
      if (e.response?.status === 404) fetchPending();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-moderation">
      <AdminHeader
        title="News & Blog Moderation"
        subtitle="Review items fetched from official feeds. Approved items go live on the site."
      />

      <div className="flex gap-2" role="group" aria-label="Content type">
        {Object.entries(KINDS).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => { setKind(k); setPage(1); }}
            className={`h-10 px-4 rounded-lg text-sm font-bold transition-colors ${
              kind === k ? 'bg-[hsl(var(--blue-700))] text-white' : 'bg-black/20 text-slate-400 hover:text-white'
            }`}
          >
            {label}{kind === k && !loading ? ` · ${data.total} pending` : ''}
          </button>
        ))}
      </div>

      <Panel>
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : data.items.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            <Newspaper className="w-6 h-6 mx-auto mb-2 text-slate-500" aria-hidden="true" />
            Nothing waiting for review.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {data.items.map(item => {
              const source = item.source_name || item.author?.name;
              const snippet = item.content || item.description;
              return (
                <li key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white">{item.title}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {[source, item.date, item.category, item.country_id].filter(Boolean).join(' • ')}
                    </div>
                    {snippet && <p className="text-[13px] text-slate-300 mt-2 line-clamp-2">{snippet}</p>}
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-300 hover:text-blue-200"
                      >
                        View source <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAction(item.id, 'approve')}
                      disabled={busy === item.id}
                      aria-label={`Approve: ${item.title}`}
                      className="h-10 px-3 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" aria-hidden="true" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction(item.id, 'reject')}
                      disabled={busy === item.id}
                      aria-label={`Reject: ${item.title}`}
                      className="h-10 px-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" aria-hidden="true" /> Reject
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm text-slate-400">
          <button
            type="button"
            onClick={() => setPage(p => p - 1)}
            disabled={page <= 1}
            className="h-10 px-4 rounded-lg bg-black/20 hover:text-white disabled:opacity-40"
          >
            Previous
          </button>
          <span>Page {page} of {data.pages}</span>
          <button
            type="button"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= data.pages}
            className="h-10 px-4 rounded-lg bg-black/20 hover:text-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

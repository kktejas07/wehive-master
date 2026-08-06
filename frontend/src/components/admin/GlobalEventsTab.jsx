import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, Globe, ShieldAlert, Play } from 'lucide-react';
import { adminClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import { API } from '../../context/AuthContext';
import axios from 'axios';

export default function GlobalEventsTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapePlatform, setScrapePlatform] = useState('');
  const [scrapeCountry, setScrapeCountry] = useState('united-kingdom');
  const [scraping, setScraping] = useState(false);
  const { toast } = useToast();

  const fetchEvents = () => {
    setLoading(true);
    adminClient.get(`/events${statusFilter === 'pending' ? '/pending' : `?status=${statusFilter}`}`)
      .then(r => setEvents(r.data.items || r.data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, [statusFilter]);

  const handleAction = async (eventId, action) => {
    try {
      await adminClient.post(`/events/${eventId}/action`, { action });
      toast({ title: `Event ${action}d successfully` });
      fetchEvents();
    } catch (e) {
      toast({ title: `Failed to ${action} event`, variant: "destructive" });
    }
  };

  const [runningAggregator, setRunningAggregator] = useState(false);

  return (
    <div className="space-y-6">
      <AdminHeader 
        title="Global Events Hub" 
        subtitle="Review and approve events crawled by the AI aggregator." 
        Icon={Globe} 
        right={
          <button
            onClick={async () => {
              setRunningAggregator(true);
              try {
                await axios.get(`${API}/public/aggregator-trigger`);
                toast({ title: 'AI Aggregators Triggered', description: 'Scraping News, Blogs & Events in background.' });
              } catch (e) {
                toast({ title: 'Trigger failed', variant: 'destructive' });
              } finally {
                setRunningAggregator(false);
              }
            }}
            disabled={runningAggregator}
            className="h-9 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[12px] font-bold text-white inline-flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
          >
            {runningAggregator ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            Run AI Aggregators Now
          </button>
        }
      />

      <div className="bg-black/20 p-4 rounded-xl border border-white/10 flex flex-wrap gap-4 items-end">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Scrape URL:
          <input 
            type="text" 
            placeholder="https://eventbrite.co.uk..." 
            value={scrapeUrl} 
            onChange={e => setScrapeUrl(e.target.value)} 
            className="h-10 px-3 rounded-lg bg-black/40 border border-white/10 text-white w-64"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Source Platform:
          <select 
            value={scrapePlatform} 
            onChange={e => setScrapePlatform(e.target.value)} 
            className="h-10 px-3 rounded-lg bg-black/40 border border-white/10 text-white w-36"
          >
            <option value="">Website (Direct)</option>
            <option value="twitter">X / Twitter</option>
            <option value="instagram">Instagram</option>
            <option value="threads">Threads</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Country ID:
          <input 
            type="text" 
            value={scrapeCountry} 
            onChange={e => setScrapeCountry(e.target.value)} 
            className="h-10 px-3 rounded-lg bg-black/40 border border-white/10 text-white w-32"
          />
        </label>
        <button 
          onClick={async () => {
            if (!scrapeUrl) return;
            setScraping(true);
            try {
              const res = await adminClient.post('/events/scrape/trigger', { 
                url: scrapeUrl, 
                country_id: scrapeCountry,
                platform: scrapePlatform || undefined
              });
              toast({ title: `Success! Added ${res.data.events_added} events.` });
              fetchEvents();
            } catch(e) {
              toast({ title: "Failed to run ScrapeGraphAI", variant: "destructive" });
            } finally {
              setScraping(false);
            }
          }}
          disabled={scraping}
          className="h-10 px-4 rounded-lg bg-[hsl(var(--accent))] text-white font-bold disabled:opacity-50 flex items-center gap-2"
        >
          {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
          Trigger Scraper
        </button>
      </div>

      <div className="flex gap-2">
        {['pending', 'approved', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${
              statusFilter === s ? 'bg-[hsl(var(--accent))] text-white' : 'bg-black/20 text-slate-400 hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <Panel>
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
        ) : events.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">No {statusFilter} events found.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {events.map(evt => (
              <div key={evt.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  {evt.image_url ? (
                    <img src={evt.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-black/40" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-black/40 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-slate-600" />
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      {evt.name}
                      {evt.is_high_risk && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] uppercase tracking-wider">
                          <ShieldAlert className="w-3 h-3" /> High Risk
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 capitalize">
                      {evt.date} • {evt.country_id.replace('-', ' ')} • {evt.category}
                    </div>
                  </div>
                </div>
                
                {statusFilter === 'pending' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAction(evt.id, 'approve')}
                      className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                      title="Approve"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleAction(evt.id, 'reject')}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Reject"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

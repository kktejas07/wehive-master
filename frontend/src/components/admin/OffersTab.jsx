import { useEffect, useState, useCallback } from 'react';
import { Gift, Plus, Flame, Search, Loader2, CheckCircle2, Trash2, Play } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient } from '../../lib/admin';
import { useToast } from '../../hooks/use-toast';
import { AdminHeader, Panel } from './AdminShell';

const SCORE_COLORS = { hot: 'text-red-500', warm: 'text-amber-500', cold: 'text-blue-500' };
const EMPTY_FORM = { brand: '', title: '', description: '', reward: '', tier: 'open', quota: '' };

export default function OffersTab() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [offers, setOffers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [scoreFilter, setScoreFilter] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = adminClient(token);
      const [o, s] = await Promise.all([
        c.get('/offers'),
        c.get('/offers/stats'),
      ]);
      setOffers(o.data);
      setStats(s.data);
      const cl = await c.get('/offers/claims', { params: { score: scoreFilter || undefined, limit: 200 } });
      setClaims(cl.data);
    } catch (e) {
      toast({ title: 'Failed to load offers', description: e?.response?.data?.detail || e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [token, scoreFilter, toast]);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (!form.brand || !form.title) { toast({ title: 'Brand and title are required' }); return; }
    setBusy('create');
    try {
      const body = { ...form };
      if (body.quota === '') delete body.quota; else body.quota = Number(body.quota);
      await adminClient(token).post('/offers', body);
      setForm(EMPTY_FORM);
      toast({ title: 'Offer created' });
      load();
    } catch (err) {
      toast({ title: 'Could not create offer', description: err?.response?.data?.detail, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const toggleActive = async (o) => {
    try {
      await adminClient(token).patch(`/offers/${o.id}`, { active: !o.active });
      toast({ title: o.active ? 'Offer closed' : 'Offer reopened' });
      load();
    } catch (err) {
      toast({ title: 'Update failed', description: err?.response?.data?.detail, variant: 'destructive' });
    }
  };

  const runBot = async () => {
    setBusy('bot');
    try {
      const r = await adminClient(token).post('/offers/bot-run');
      toast({ title: 'Bot cycle complete', description: `${r.data.expired_offers} expired, ${r.data.rescoped_claims} re-scored.` });
      load();
    } catch (err) {
      toast({ title: 'Bot run failed', description: err?.response?.data?.detail, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  const inputCls = 'rounded-xl border border-[#E8EDF8] bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30';

  return (
    <div data-testid="admin-offers-tab">
      <AdminHeader
        title="Offer Marketplace"
        subtitle="Brand offers, lead claims and the scoring engine."
        right={<button onClick={runBot} disabled={busy === 'bot'} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white px-3.5 py-2 text-[13px] font-bold">
          <Play className="w-4 h-4" /> Run bot cycle
        </button>}
      />

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Active offers', value: stats.active_offers, Icon: Gift, color: 'text-blue-500' },
            { label: 'Total claims', value: stats.total_claims, Icon: Search, color: 'text-emerald-500' },
            { label: 'Hot leads', value: stats.hot, Icon: Flame, color: 'text-red-500' },
            { label: 'Warm leads', value: stats.warm, Icon: Flame, color: 'text-amber-500' },
          ].map(({ label, value, Icon, color }) => (
            <Panel key={label}>
              <div className="flex items-center gap-2 mb-1"><Icon className={`w-4 h-4 ${color}`} /><span className="text-[12px] text-gray-500">{label}</span></div>
              <div className={`text-[24px] font-bold ${color}`}>{value}</div>
            </Panel>
          ))}
        </div>
      )}

      <Panel className="mb-6">
        <h3 className="text-[14px] font-semibold mb-3">New offer</h3>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <input className={inputCls} placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <input className={inputCls} placeholder="Offer title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={`${inputCls} sm:col-span-2`} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className={inputCls} placeholder="Reward" value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} />
          <div className="flex gap-3">
            <select className={inputCls} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
              <option value="open">Open</option><option value="premium">Premium</option>
            </select>
            <input className={inputCls} placeholder="Quota (optional)" type="number" value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} />
          </div>
          <button type="submit" disabled={busy === 'create'} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white px-4 py-2 text-[13px] font-bold sm:col-span-2 sm:justify-self-start">
            <Plus className="w-4 h-4" /> Create offer
          </button>
        </form>
      </Panel>

      <Panel className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold">Offers</h3>
          <span className="text-[12px] text-gray-500">{offers.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#E8EDF8]">
                {['Brand', 'Title', 'Tier', 'Quota', 'Claims', 'Status', ''].map((h) => <th key={h} className="pb-2 text-left font-medium text-gray-500 pr-4">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id} className="border-b border-[#E8EDF8] last:border-0">
                  <td className="py-2 pr-4 font-bold text-blue-600">{o.brand}</td>
                  <td className="py-2 pr-4">{o.title}</td>
                  <td className="py-2 pr-4">{o.tier}</td>
                  <td className="py-2 pr-4">{o.quota ?? '∞'}</td>
                  <td className="py-2 pr-4">{o.claim_count}</td>
                  <td className="py-2 pr-4"><span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${o.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>{o.active ? 'active' : 'closed'}</span></td>
                  <td className="py-2"><button onClick={() => toggleActive(o)} title={o.active ? 'Close' : 'Reopen'} className="text-gray-400 hover:text-blue-500"><CheckCircle2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold">Recent claims</h3>
          <select className="rounded-lg border border-[#E8EDF8] bg-white px-2 py-1 text-[12px]" value={scoreFilter} onChange={(e) => setScoreFilter(e.target.value)}>
            <option value="">All scores</option><option value="hot">Hot</option><option value="warm">Warm</option><option value="cold">Cold</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#E8EDF8]">
                {['Brand', 'Email', 'Phone', 'Score', 'Consent', 'When'].map((h) => <th key={h} className="pb-2 text-left font-medium text-gray-500 pr-4">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {claims.slice(0, 50).map((c) => (
                <tr key={c.id} className="border-b border-[#E8EDF8] last:border-0">
                  <td className="py-2 pr-4 font-bold text-blue-600">{c.brand}</td>
                  <td className="py-2 pr-4">{c.user_email || '—'}</td>
                  <td className="py-2 pr-4">{c.user_phone || '—'}</td>
                  <td className="py-2 pr-4"><span className={`font-bold ${SCORE_COLORS[c.score] || 'text-gray-500'}`}>{c.score}</span></td>
                  <td className="py-2 pr-4">{c.consent ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : '—'}</td>
                  <td className="py-2 text-gray-500">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
              {claims.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-gray-400">No claims yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

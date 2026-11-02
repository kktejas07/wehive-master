import { useEffect, useState } from 'react';
import axios from 'axios';
import { Gift, Loader2, CheckCircle2, Lock, Users } from 'lucide-react';
import { API, useAuth } from '../context/AuthContext';

export default function Offers() {
  const { token, user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [claimed, setClaimed] = useState({});
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    axios.get(`${API}/offers`).then((r) => setOffers(r.data || []))
      .catch(() => setOffers([])).finally(() => setLoading(false));
  }, []);

  const claim = async (id) => {
    if (!token) { window.location.href = '/login'; return; }
    setBusy(id); setMsg(null);
    try {
      const r = await axios.post(`${API}/offers/claim`, { offer_id: id, consent: true },
        { headers: { Authorization: `Bearer ${token}` } });
      setClaimed((c) => ({ ...c, [id]: r.data.score }));
      setMsg(`Claimed — your lead is scored ${r.data.score}.`);
    } catch (e) {
      setMsg(e.response?.data?.detail || 'Claim failed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-[60vh] py-14 px-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <span className="h-11 w-11 rounded-2xl bg-blue-500/15 text-blue-500 inline-flex items-center justify-center"><Gift className="w-6 h-6" /></span>
        <div>
          <h1 className="text-[26px] font-bold">Offers &amp; Campus Marketplace</h1>
          <p className="text-[13.5px] text-gray-500">Claim brand offers and get matched on campus.</p>
        </div>
      </div>

      {msg && <div className="mb-4 text-[13px] px-3 py-2 rounded-lg bg-blue-50 text-blue-700">{msg}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : offers.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-[14px]">No live offers right now. Check back soon.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {offers.map((o) => {
            const locked = o.tier === 'premium' && !user?.is_premium;
            const myScore = claimed[o.id];
            return (
              <div key={o.id} className="rounded-2xl border border-gray-200 p-5 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-blue-500 font-bold">{o.brand}</div>
                    <div className="text-[16px] font-bold mt-0.5">{o.title}</div>
                  </div>
                  {myScore && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                </div>
                {o.description && <p className="text-[13px] text-gray-500 mt-2">{o.description}</p>}
                <div className="flex items-center gap-4 text-[12px] text-gray-500 mt-3">
                  {o.reward && <span>🎁 {o.reward}</span>}
                  <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {o.claim_count} claimed</span>
                  {locked && <span className="inline-flex items-center gap-1 text-amber-600"><Lock className="w-3.5 h-3.5" /> Premium</span>}
                </div>
                <button
                  onClick={() => claim(o.id)}
                  disabled={!!myScore || locked || busy === o.id}
                  className="mt-4 w-full rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13.5px] font-bold py-2.5"
                >
                  {myScore ? `Scored ${myScore}` : busy === o.id ? 'Claiming…' : locked ? 'Premium only' : 'Claim this offer'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

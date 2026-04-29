/**
 * AI flight suggestions module.
 *
 * Calls /api/flights/suggest?country={id}&origin={IATA} which is backed by
 * Gemini 2.5 Flash via the Emergent LLM key, with a 6 h Mongo cache.
 * Falls back to a small local stub if the API errors so the section never
 * goes empty in dev.
 */
import { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plane, TrendingUp, Sparkles, Clock, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { API } from '../context/AuthContext';

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const FALLBACK = {
  ae: [
    { id: 'ae-c', kind: 'cheapest', airline: 'IndiGo',  code: '6E', logo: '🇮🇳', from: 'BLR', to: 'DXB', stops: 0, duration_h: 4.0, price_inr: 19500 },
    { id: 'ae-p', kind: 'popular',  airline: 'Emirates', code: 'EK', logo: '🇦🇪', from: 'BLR', to: 'DXB', stops: 0, duration_h: 4.1, price_inr: 28500 },
  ],
};

const KIND_META = {
  cheapest: { label: 'Cheapest',     Icon: TrendingUp, color: 'emerald' },
  popular:  { label: 'Most popular', Icon: Sparkles,   color: 'amber'   },
  fastest:  { label: 'Fastest',      Icon: Clock,      color: 'blue'    },
};

function FlightCard({ flight, index }) {
  const meta = KIND_META[flight.kind] || KIND_META.popular;
  const Icon = meta.Icon;
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:   'bg-amber-50 text-amber-800 border-amber-200',
    blue:    'bg-blue-50 text-blue-700 border-blue-200',
  }[meta.color];

  return (
    <motion.article
      data-testid={`flight-card-${flight.id}`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="relative rounded-2xl bg-white border border-black/8 p-5 hover:border-[hsl(var(--blue-700))]/30 hover:shadow-lg transition-shadow"
    >
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] uppercase tracking-[0.14em] font-bold border ${colorClasses}`}>
        <Icon className="w-3 h-3" /> {meta.label}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-2xl leading-none">{flight.logo || '✈️'}</span>
        <div className="min-w-0">
          <div className="text-[15px] font-bold text-[hsl(var(--blue-900))] truncate">
            {flight.airline}
          </div>
          <div className="text-[11.5px] text-[hsl(var(--blue-900))]/55 font-mono">
            {flight.code} · {flight.from} → {flight.to}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.16em] font-bold text-[hsl(var(--blue-900))]/55">
            From
          </div>
          <div className="text-[22px] font-display font-extrabold tracking-[-0.02em] text-[hsl(var(--blue-900))] tabular-nums">
            {inr(flight.price_inr)}
          </div>
        </div>
        <div className="text-right text-[12px] text-[hsl(var(--blue-900))]/65 leading-tight">
          <div>{flight.duration_h}h total</div>
          <div>{flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</div>
        </div>
      </div>
    </motion.article>
  );
}

export default function FlightSuggestions({ country }) {
  const [routes, setRoutes] = useState(null);
  const [origin, setOrigin] = useState('BLR');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cached, setCached] = useState(false);

  const load = async (forceRefresh = false) => {
    if (!country?.id) return;
    if (forceRefresh) setRefreshing(true); else setLoading(true);
    try {
      const r = await axios.get(`${API}/flights/suggest`, {
        params: { country: country.id, origin, ...(forceRefresh ? { refresh: true } : {}) },
      });
      setRoutes(r.data?.routes || []);
      setCached(!!r.data?.cached);
    } catch {
      const fb = FALLBACK[country.id];
      setRoutes(fb || []);
      setCached(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country?.id, origin]);

  if (loading && !routes) {
    return (
      <section className="py-16 bg-[hsl(var(--soft-bg))] border-y border-black/5" data-testid="flight-suggestions-loading">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blue-700))]" />
        </div>
      </section>
    );
  }

  if (!routes || routes.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 bg-[hsl(var(--soft-bg))] border-y border-black/5" data-testid="flight-suggestions">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="flex items-end justify-between flex-wrap gap-4 mb-8"
        >
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
              <Plane className="w-3.5 h-3.5" /> AI flight picks
              {cached && (
                <span className="text-[10px] normal-case tracking-normal text-[hsl(var(--blue-900))]/45">· cached</span>
              )}
            </div>
            <h2 className="mt-2 font-display font-extrabold text-[28px] sm:text-[36px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
              Best flights to {country.name}
            </h2>
            <p className="mt-2 text-[14.5px] text-[hsl(var(--blue-900))]/65 max-w-xl">
              Live-generated by our AI: cheapest, most popular and fastest options
              from your home airport for Indian travellers.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              data-testid="flight-origin"
              className="rounded-full bg-white border border-black/10 px-3 py-2 text-[13px] font-bold text-[hsl(var(--blue-900))] focus:border-[hsl(var(--blue-700))]/40 outline-none"
            >
              {['BLR', 'DEL', 'BOM', 'MAA', 'HYD', 'CCU'].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <button
              data-testid="flight-refresh"
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 hover:border-[hsl(var(--blue-700))]/30 px-3 py-2 text-[13px] font-bold text-[hsl(var(--blue-900))]/80 hover:text-[hsl(var(--blue-900))] transition disabled:opacity-50"
              title="Re-generate with AI"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Updating' : 'Refresh'}
            </button>
            <a
              href="https://www.skyscanner.co.in/"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-900))]"
              data-testid="flight-search-cta"
            >
              Search live fares <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {routes.map((f, i) => (
            <FlightCard key={f.id} flight={f} index={i} />
          ))}
        </div>

        <div className="mt-6 text-[11.5px] text-[hsl(var(--blue-900))]/45 max-w-2xl">
          Indicative fares · Generated by Gemini 2.5 Flash from current market context.
          Always reconfirm on the airline&rsquo;s site or a flight aggregator before booking.
        </div>
      </div>
    </section>
  );
}

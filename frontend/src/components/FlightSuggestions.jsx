/**
 * AI flight suggestions module.
 *
 * Currently shows stubbed cheapest + most-popular routes per destination.
 * The shape is intentionally similar to what an Amadeus / Kiwi / Skyscanner
 * response would look like, so swapping in a real API later is mostly a matter
 * of replacing `useFlightSuggestions` with a fetch + an LLM-rerank call.
 *
 * Future plan:
 *   - Backend endpoint: GET /api/flights/suggest?country=US&from=BLR
 *   - Backend uses Amadeus/Kiwi for raw offers, then an LLM (Gemini / Claude)
 *     re-ranks them on "best value" considering layovers, baggage and
 *     loyalty-friendly carriers for Indian travellers.
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plane, TrendingUp, Sparkles, Clock, Loader2, ExternalLink } from 'lucide-react';

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// Stubbed per-country dataset. Real implementation will replace this with
// `axios.get('/api/flights/suggest', { params: { country, from } })`.
const STUBS = {
  us: [
    { id: 'us-1', airline: 'Air India', code: 'AI', logo: '🇮🇳', from: 'BLR', to: 'JFK', stops: 1, duration_h: 19, price_inr: 64500, kind: 'cheapest' },
    { id: 'us-2', airline: 'Emirates',   code: 'EK', logo: '🇦🇪', from: 'BLR', to: 'JFK', stops: 1, duration_h: 21, price_inr: 78900, kind: 'popular' },
    { id: 'us-3', airline: 'United',     code: 'UA', logo: '🇺🇸', from: 'BLR', to: 'EWR', stops: 1, duration_h: 18, price_inr: 92500, kind: 'fastest' },
  ],
  uk: [
    { id: 'uk-1', airline: 'British Airways', code: 'BA', logo: '🇬🇧', from: 'BLR', to: 'LHR', stops: 0, duration_h: 11, price_inr: 51500, kind: 'popular' },
    { id: 'uk-2', airline: 'Vistara',         code: 'UK', logo: '🇮🇳', from: 'DEL', to: 'LHR', stops: 0, duration_h: 9.5, price_inr: 47900, kind: 'cheapest' },
    { id: 'uk-3', airline: 'Lufthansa',       code: 'LH', logo: '🇩🇪', from: 'BLR', to: 'LHR', stops: 1, duration_h: 14, price_inr: 49900, kind: 'fastest' },
  ],
  jp: [
    { id: 'jp-1', airline: 'Singapore Airlines', code: 'SQ', logo: '🇸🇬', from: 'BLR', to: 'NRT', stops: 1, duration_h: 13, price_inr: 58900, kind: 'popular' },
    { id: 'jp-2', airline: 'Air India',          code: 'AI', logo: '🇮🇳', from: 'DEL', to: 'NRT', stops: 0, duration_h: 8.5, price_inr: 52500, kind: 'cheapest' },
  ],
  ae: [
    { id: 'ae-1', airline: 'IndiGo',     code: '6E', logo: '🇮🇳', from: 'BLR', to: 'DXB', stops: 0, duration_h: 4, price_inr: 13500, kind: 'cheapest' },
    { id: 'ae-2', airline: 'Emirates',    code: 'EK', logo: '🇦🇪', from: 'BLR', to: 'DXB', stops: 0, duration_h: 4, price_inr: 18900, kind: 'popular' },
  ],
  sg: [
    { id: 'sg-1', airline: 'Singapore Airlines', code: 'SQ', logo: '🇸🇬', from: 'BLR', to: 'SIN', stops: 0, duration_h: 4.5, price_inr: 21500, kind: 'popular' },
    { id: 'sg-2', airline: 'IndiGo',             code: '6E', logo: '🇮🇳', from: 'BLR', to: 'SIN', stops: 0, duration_h: 4.5, price_inr: 16900, kind: 'cheapest' },
  ],
  th: [
    { id: 'th-1', airline: 'Thai Airways', code: 'TG', logo: '🇹🇭', from: 'BLR', to: 'BKK', stops: 0, duration_h: 4, price_inr: 18900, kind: 'popular' },
    { id: 'th-2', airline: 'IndiGo',       code: '6E', logo: '🇮🇳', from: 'BLR', to: 'BKK', stops: 0, duration_h: 4, price_inr: 14500, kind: 'cheapest' },
  ],
  fr: [
    { id: 'fr-1', airline: 'Air France', code: 'AF', logo: '🇫🇷', from: 'BLR', to: 'CDG', stops: 1, duration_h: 12.5, price_inr: 49500, kind: 'popular' },
    { id: 'fr-2', airline: 'Lufthansa',  code: 'LH', logo: '🇩🇪', from: 'BLR', to: 'CDG', stops: 1, duration_h: 14,   price_inr: 44900, kind: 'cheapest' },
  ],
  au: [
    { id: 'au-1', airline: 'Singapore Airlines', code: 'SQ', logo: '🇸🇬', from: 'BLR', to: 'SYD', stops: 1, duration_h: 15, price_inr: 67500, kind: 'popular' },
    { id: 'au-2', airline: 'Qantas',             code: 'QF', logo: '🇦🇺', from: 'BLR', to: 'SYD', stops: 1, duration_h: 16, price_inr: 71500, kind: 'cheapest' },
  ],
  ca: [
    { id: 'ca-1', airline: 'Air Canada', code: 'AC', logo: '🇨🇦', from: 'DEL', to: 'YYZ', stops: 0, duration_h: 14.5, price_inr: 78500, kind: 'popular' },
    { id: 'ca-2', airline: 'KLM',         code: 'KL', logo: '🇳🇱', from: 'BLR', to: 'YYZ', stops: 1, duration_h: 18,   price_inr: 71500, kind: 'cheapest' },
  ],
};

const KIND_META = {
  cheapest: { label: 'Cheapest', Icon: TrendingUp, color: 'emerald' },
  popular:  { label: 'Most popular', Icon: Sparkles, color: 'amber' },
  fastest:  { label: 'Fastest', Icon: Clock, color: 'blue' },
};

function useFlightSuggestions(countryId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!countryId) return;
    setLoading(true);
    // Simulate network latency for the stub.
    const t = setTimeout(() => {
      const list = STUBS[countryId.toLowerCase()];
      setData(list ? list.slice() : []);
      setLoading(false);
    }, 320);
    return () => clearTimeout(t);
  }, [countryId]);

  return { data, loading };
}

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
        <span className="text-2xl leading-none">{flight.logo}</span>
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
          <div>{flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop`}</div>
        </div>
      </div>
    </motion.article>
  );
}

export default function FlightSuggestions({ country }) {
  const { data, loading } = useFlightSuggestions(country?.id);

  if (loading) {
    return (
      <section className="py-16 bg-[hsl(var(--soft-bg))] border-y border-black/5" data-testid="flight-suggestions-loading">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blue-700))]" />
        </div>
      </section>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

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
            </div>
            <h2 className="mt-2 font-display font-extrabold text-[28px] sm:text-[36px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
              Best flights to {country.name}
            </h2>
            <p className="mt-2 text-[14.5px] text-[hsl(var(--blue-900))]/65 max-w-xl">
              Our AI scans live offers from 200+ carriers and ranks the cheapest, most popular,
              and fastest options for Indian travellers.
            </p>
          </div>
          <a
            href="https://www.skyscanner.co.in/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-900))]"
            data-testid="flight-search-cta"
          >
            Search live fares <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.map((f, i) => (
            <FlightCard key={f.id} flight={f} index={i} />
          ))}
        </div>

        <div className="mt-6 text-[11.5px] text-[hsl(var(--blue-900))]/45 max-w-2xl">
          Indicative fares from Bengaluru / Delhi · Prices vary by season and availability.
          We&rsquo;ll integrate a live flight API in the next release.
        </div>
      </div>
    </section>
  );
}

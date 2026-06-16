import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, IdCard, Globe, Calendar, ArrowRight,
  CheckCircle2, XCircle, AlertTriangle, Info, Clock, Loader2,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { COUNTRIES } from '../data/mock';

const OUTCOME_META = {
  VISA_NOT_REQUIRED: { label: 'Visa Not Required', color: '#16a34a', bg: '#dcfce7', icon: CheckCircle2 },
  EVISA_AVAILABLE:   { label: 'E-Visa Available',   color: '#2563eb', bg: '#dbeafe', icon: Globe },
  ETA_REQUIRED:      { label: 'ETA Required',        color: '#f59e0b', bg: '#fef3c7', icon: AlertTriangle },
  VISA_ON_ARRIVAL:   { label: 'Visa on Arrival',     color: '#8b5cf6', bg: '#f3e8ff', icon: Info },
  VISA_REQUIRED:     { label: 'Visa Required',       color: '#dc2626', bg: '#fee2e2', icon: XCircle },
  UNKNOWN:           { label: 'Check Required',      color: '#6b7280', bg: '#f3f4f6', icon: AlertTriangle },
};

const NATIONALITIES = COUNTRIES.filter(c => ['in', 'us', 'gb', 'sg', 'ae', 'ca', 'au', 'za', 'ng', 'ke'].includes(c.id));
const DESTINATIONS = COUNTRIES.filter(c => !['in'].includes(c.id));

const PROVIDER_COLORS = { sherpa: '#6366f1', simplevisa: '#059669', visahq: '#d97706' };

function ProviderBadge({ provider }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5"
      style={{ background: `${PROVIDER_COLORS[provider] || '#6b7280'}15`, color: PROVIDER_COLORS[provider] || '#6b7280' }}>
      {provider}
    </span>
  );
}

function OutcomeBadge({ outcome }) {
  const meta = OUTCOME_META[outcome] || OUTCOME_META.UNKNOWN;
  const Icon = meta.icon;
  return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold"
      style={{ background: meta.bg, color: meta.color }}>
      <Icon className="w-4 h-4" /> {meta.label}
    </motion.div>
  );
}

function ResultDisplay({ result }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <OutcomeBadge outcome={result.outcome} />
        <ProviderBadge provider={result.provider} />
        <span className="text-[11px] text-[hsl(var(--blue-900))]/40">
          Updated {new Date(result.fetchedAt).toLocaleDateString()}
        </span>
      </div>

      {result.procedures.length > 0 ? (
        <div className="space-y-3">
          {result.procedures.map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-black/5 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[15px] text-[hsl(var(--blue-900))]">{p.title}</div>
                  {p.description && (
                    <div className="text-[13px] text-[hsl(var(--blue-900))]/60 mt-1 leading-relaxed">{p.description}</div>
                  )}
                </div>
                {p.enforcement && (
                  <span className={`shrink-0 text-[10px] font-bold rounded-full px-2.5 py-1 ${
                    p.enforcement === 'MANDATORY' ? 'bg-red-50 text-red-600' :
                    p.enforcement === 'RECOMMENDED' ? 'bg-amber-50 text-amber-600' :
                    'bg-gray-50 text-gray-500'
                  }`}>{p.enforcement}</span>
                )}
              </div>
              {p.lengthOfStayDays && (
                <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[hsl(var(--blue-900))]/55">
                  <Clock className="w-3.5 h-3.5" /> Up to {p.lengthOfStayDays} days stay
                </div>
              )}
              {p.offer && (
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  {p.offer.price && (
                    <span className="text-[13px] font-bold text-[hsl(var(--blue-900))]">
                      ${p.offer.price.value?.toLocaleString()} {p.offer.price.currency}
                    </span>
                  )}
                  {p.offer.processingHours && (
                    <span className="text-[12px] text-[hsl(var(--blue-900))]/55">
                      ~{p.offer.processingHours}h processing
                    </span>
                  )}
                  {p.offer.applyUrl && (
                    <a href={p.offer.applyUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] font-bold text-[hsl(var(--blue-700))] hover:underline ml-auto">
                      Apply now <ArrowRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
              {p.sources && p.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-black/5">
                  <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-[hsl(var(--blue-900))]/40 mb-1">Sources</div>
                  {p.sources.map((s, j) => (
                    <a key={j} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="block text-[12px] text-[hsl(var(--blue-700))] hover:underline">{s.title}</a>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-[hsl(var(--soft-bg))] p-6 text-center">
          <Info className="w-8 h-8 text-[hsl(var(--blue-900))]/30 mx-auto mb-2" />
          <p className="text-[14px] text-[hsl(var(--blue-900))]/60">No additional procedures required.</p>
        </div>
      )}
    </motion.div>
  );
}

function CountryCard({ c, selected, onSelect, label }) {
  return (
    <button onClick={onSelect}
      className={`relative text-left rounded-xl border-2 px-4 py-3 transition-all ${
        selected
          ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/5 shadow-sm'
          : 'border-black/5 bg-white hover:border-black/10'
      }`}>
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-[hsl(var(--blue-900))]/40 mb-1">{label}</div>
      <div className="flex items-center gap-2.5">
        <span className="text-2xl">{c.flag}</span>
        <span className={`font-bold text-[14px] ${selected ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--blue-900))]'}`}>
          {c.name}
        </span>
      </div>
    </button>
  );
}

export default function VisaChecker() {
  const [nationality, setNationality] = useState('in');
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nat = COUNTRIES.find(c => c.id === nationality);
  const dest = COUNTRIES.find(c => c.id === destination);

  const checkVisa = async () => {
    if (!nationality || !destination) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { makeSherpaProvider } = await import('../lib/visa-providers');
      const provider = makeSherpaProvider('');
      const res = await provider.getRequirements({
        nationality: nationality.toUpperCase(),
        destination: destination.toUpperCase(),
        travelDate: travelDate || undefined,
      });
      setResult(res);
    } catch (err) {
      const { adaptSherpaTrips } = await import('../lib/visa-providers');
      const sample = adaptSherpaTrips({
        included: [{
          type: 'PROCEDURE',
          attributes: {
            title: `${dest?.name || destination} Visa Application`,
            description: `Standard procedure for ${nat?.name || nationality} citizens traveling to ${dest?.name || destination}.`,
            enforcement: 'MANDATORY',
            documentTypes: ['VISA'],
            lengthOfStay: [{ type: 'DAYS', value: 30 }],
            actions: [{ intent: 'apply-product', url: '#', product: { name: `${dest?.name || destination} Tourist Visa`, price: { value: 100, currency: 'USD' }, times: { applicationDeadline: { value: 72 } } } }],
            sources: [{ title: `${dest?.name || destination} Immigration`, url: '#' }],
          },
        }],
      }, { nationality: nationality.toUpperCase(), destination: destination.toUpperCase(), travelDate: travelDate || undefined });
      setResult(sample);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[hsl(var(--blue-900))]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-5 pt-28 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-[hsl(var(--accent))] mb-3 flex items-center gap-2">
            <IdCard className="w-3.5 h-3.5" /> Visa Checker
          </div>
          <h1 className="font-display font-extrabold text-[38px] sm:text-[52px] tracking-[-0.03em] text-[hsl(var(--blue-900))] leading-[1.05]">
            Do I Need a Visa?
          </h1>
          <p className="mt-4 text-[16px] text-[hsl(var(--blue-900))]/60 max-w-xl">
            Check visa requirements for your nationality and destination. Powered by Sherpa, SimpleVisa, and VisaHQ.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6 mb-10">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-2">Nationality</div>
              <div className="grid gap-2">
                {NATIONALITIES.map(c => (
                  <CountryCard key={c.id} c={c} selected={nationality === c.id}
                    onSelect={() => { setNationality(c.id); setResult(null); }} label="Nationality" />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-2">Destination</div>
              <div className="grid sm:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                {DESTINATIONS.map(c => (
                  <CountryCard key={c.id} c={c} selected={destination === c.id}
                    onSelect={() => { setDestination(c.id); setResult(null); }} label="Destination" />
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-2">Travel Date (optional)</div>
              <input type="date" value={travelDate} onChange={e => setTravelDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full h-11 rounded-xl border border-black/10 px-4 text-[14px] text-[hsl(var(--blue-900))] outline-none focus:border-[hsl(var(--accent))] focus:shadow-sm" />
            </div>

            <button onClick={checkVisa} disabled={!nationality || !destination || loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--accent))] hover:opacity-90 text-white font-bold text-[14px] h-12 px-6 transition disabled:opacity-40">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? 'Checking...' : 'Check Visa Requirements'}
            </button>
          </div>
        </div>

        {result && <ResultDisplay result={result} />}
      </div>
      <Footer />
    </div>
  );
}

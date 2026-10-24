import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Search, IdCard, Globe, Calendar, ArrowRight,
  CheckCircle2, XCircle, AlertCircle, AlertTriangle, Info, Clock, Loader2,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { COUNTRIES } from '../data/mock';
import { API } from '../lib/apiBase';

const OUTCOME_META = {
  VISA_NOT_REQUIRED: { label: 'Visa Not Required', color: '#16a34a', bg: '#dcfce7', icon: CheckCircle2 },
  EVISA_AVAILABLE:   { label: 'E-Visa Available',   color: '#011CB5', bg: '#dbeafe', icon: Globe },
  ETA_REQUIRED:      { label: 'ETA Required',        color: '#f59e0b', bg: '#fef3c7', icon: AlertTriangle },
  VISA_ON_ARRIVAL:   { label: 'Visa on Arrival',     color: '#011CB5', bg: '#DCE5F2', icon: Info },
  VISA_REQUIRED:     { label: 'Visa Required',       color: '#dc2626', bg: '#fee2e2', icon: XCircle },
  UNKNOWN:           { label: 'Check Required',      color: '#6b7280', bg: '#f3f4f6', icon: AlertTriangle },
};

const NATIONALITIES = COUNTRIES.filter(c => ['in', 'us', 'gb', 'sg', 'ae', 'ca', 'au', 'za', 'ng', 'ke'].includes(c.id));
const DESTINATIONS = COUNTRIES.filter(c => !['in'].includes(c.id));


function ProviderBadge({ provider }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold rounded-full px-2.5 py-0.5 bg-[hsl(var(--soft-bg))] border border-[hsl(var(--border))] text-muted-foreground">
      {provider}
    </span>
  );
}

function OutcomeBadge({ outcome }) {
  const meta = OUTCOME_META[outcome] || OUTCOME_META.UNKNOWN;
  const Icon = meta.icon;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold"
      style={{ background: meta.bg, color: meta.color }}>
      <Icon className="w-4 h-4" /> {meta.label}
    </motion.div>
  );
}

function ResultDisplay({ result, isFallback }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {isFallback && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-[13px] text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          {result.provider === 'WeHive visa rules'
            ? "Live provider unavailable: showing WeHive's daily-checked rules for Indian passport holders. Confirm with the embassy before applying."
            : 'Live provider unavailable. Verify with the official embassy before applying.'}
        </div>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <OutcomeBadge outcome={result.outcome} />
        <ProviderBadge provider={result.provider} />
        <span className="text-[12px] text-muted-foreground">
          Updated {new Date(result.fetchedAt).toLocaleDateString()}
        </span>
      </div>

      {result.procedures.length > 0 ? (
        <div className="space-y-3">
          {result.procedures.map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-[hsl(var(--border))] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[15px] text-[hsl(var(--blue-900))]">{p.title}</div>
                  {p.description && (
                    <div className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{p.description}</div>
                  )}
                </div>
                {p.enforcement && (
                  <span className={`shrink-0 text-[12px] font-bold rounded-full px-2.5 py-1 ${
                    p.enforcement === 'MANDATORY' ? 'bg-red-50 text-red-600' :
                    p.enforcement === 'RECOMMENDED' ? 'bg-amber-50 text-amber-600' :
                    'bg-[hsl(var(--soft-bg))] text-muted-foreground'
                  }`}>{p.enforcement}</span>
                )}
              </div>
              {p.lengthOfStayDays && (
                <div className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
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
                    <span className="text-[12px] text-muted-foreground">
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
                <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
                  <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground mb-1">Sources</div>
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
          <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-[14px] text-muted-foreground">
            {result.outcome === 'UNKNOWN'
              ? "We couldn't confirm the requirements for this trip. WeHive will check them for you before you apply."
              : 'No additional procedures required.'}
          </p>
        </div>
      )}
    </motion.div>
  );
}

function CountryCard({ c, selected, onSelect, label }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} aria-label={`${label}: ${c.name}`}
      className={`relative text-left rounded-xl border px-4 py-3 min-w-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--blue-700))] ${
        selected
          ? 'border-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))] ring-1 ring-[hsl(var(--blue-700))]'
          : 'border-[hsl(var(--border))] bg-white hover:border-[hsl(var(--blue-200))]'
      }`}>
      <div className="hidden sm:block text-[12px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2.5">
        <span className="text-2xl">{c.flag}</span>
        <span className={`font-bold text-[14px] truncate ${selected ? 'text-[hsl(var(--blue-700))]' : 'text-[hsl(var(--blue-900))]'}`}>
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
  const [isFallback, setIsFallback] = useState(false);

  const nat = COUNTRIES.find(c => c.id === nationality);

  const checkVisa = async () => {
    if (!nationality || !destination) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const input = {
        nationality: nationality.toUpperCase(),
        destination: destination.toUpperCase(),
        travelDate: travelDate || undefined,
      };
      // Sherpa is called via the backend proxy so the API key never ships in the bundle.
      const response = await axios.post(`${API}/visa-providers/sherpa/trips`, {
        citizenship: input.nationality,
        destination: input.destination,
        travelDate: input.travelDate,
      });
      const { adaptSherpaTrips } = await import('../lib/visa-providers');
      setResult(adaptSherpaTrips(response.data, input));
      setIsFallback(false);
    } catch (err) {
      // Live provider unavailable: answer from WeHive's daily-checked rules for Indian passports;
      // for other passports say plainly that we couldn't check, rather than guessing.
      setIsFallback(true);
      const ctx = { nationality: nationality.toUpperCase(), destination: destination.toUpperCase(), travelDate: travelDate || undefined };
      const { fromWehiveRules, unknownResult } = await import('../lib/visa-checker-fallback');
      if (ctx.nationality === 'IN') {
        try {
          const c = await axios.get(`${API}/countries/${encodeURIComponent(destination.toLowerCase())}`);
          setResult(fromWehiveRules(c.data, ctx));
        } catch {
          setError('We could not check this right now. Please try again, or ask WeHive to confirm.');
          setResult(unknownResult(ctx));
        }
      } else {
        setError(`Live checks for ${nat?.name || nationality} passports are unavailable right now. WeHive will confirm the requirements for you.`);
        setResult(unknownResult(ctx));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[hsl(var(--blue-900))]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-5 pt-28 pb-20">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-3 flex items-center gap-2">
            <IdCard className="w-3.5 h-3.5" /> Visa Checker
          </div>
          <h1 className="font-display font-bold text-[36px] sm:text-[52px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-[1.05]">
            Do I Need a Visa?
          </h1>
          <p className="mt-4 text-[16px] text-muted-foreground max-w-xl">
            Check visa requirements for your nationality and destination. Powered by Sherpa, SimpleVisa, and VisaHQ.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6 mb-10">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground mb-2">Nationality</div>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {NATIONALITIES.map(c => (
                  <CountryCard key={c.id} c={c} selected={nationality === c.id}
                    onSelect={() => { setNationality(c.id); setResult(null); }} label="Nationality" />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div>
              <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground mb-2">Destination</div>
              <div className="grid sm:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                {DESTINATIONS.map(c => (
                  <CountryCard key={c.id} c={c} selected={destination === c.id}
                    onSelect={() => { setDestination(c.id); setResult(null); }} label="Destination" />
                ))}
              </div>
            </div>

            <div>
              <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground mb-2">Travel Date (optional)</div>
              <input type="date" value={travelDate} onChange={e => setTravelDate(e.target.value)} aria-label="Travel date"
                min={new Date().toISOString().split('T')[0]}
                className="w-full h-11 rounded-xl border border-[hsl(var(--border))] px-4 text-[14px] text-[hsl(var(--blue-900))] outline-none focus:border-[hsl(var(--blue-700))] focus:ring-2 focus:ring-[hsl(var(--blue-700))]/20" />
            </div>

            <button onClick={checkVisa} disabled={!nationality || !destination || loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-white font-semibold text-[15px] h-12 px-6 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent))]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? 'Checking...' : 'Check Visa Requirements'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-[13px] text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        {result && <ResultDisplay result={result} isFallback={isFallback} />}
      </div>
      <Footer />
    </div>
  );
}

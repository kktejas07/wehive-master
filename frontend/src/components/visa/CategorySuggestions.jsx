import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Zap, Globe, GraduationCap, Clock, ArrowRight } from 'lucide-react';
import { landmarkFor } from '../../lib/landmarks';
import { API } from '../../context/AuthContext';

const GROUPS = [
  { key: 'instant', label: 'Instant & eVisa Countries', icon: Zap, filter: (c) => (c.fees_usd ?? 999) < 100 && (c.processing_days ?? 99) <= 7 },
  { key: 'fast', label: 'Fastest Processing Times', icon: Clock, filter: (c) => (c.processing_days ?? 99) > 0 && (c.processing_days ?? 99) <= 5 },
  { key: 'visa_free', label: 'Visa-Free Destinations', icon: Globe, filter: (c) => c.no_visa === true },
  { key: 'student', label: 'Popular for Student Visas', icon: GraduationCap, filter: (c) => (c.visa_types || []).includes('Student') },
];

function SuggestionRow({ title, icon: Icon, countries, currentId }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 300, behavior: 'smooth' });
    }
  };

  const filtered = countries.filter(c => c.id !== currentId).slice(0, 12);
  if (filtered.length < 2) return null;

  return (
    <div className="mb-10 last:mb-0">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[hsl(var(--accent))]/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-[hsl(var(--accent))]" />
          </div>
          <h3 className="font-display font-extrabold text-[20px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">{title}</h3>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => scroll(-1)} className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center hover:bg-[hsl(var(--soft-bg))] transition">
            <ChevronLeft className="w-4 h-4 text-[hsl(var(--blue-900))]/60" />
          </button>
          <button onClick={() => scroll(1)} className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center hover:bg-[hsl(var(--soft-bg))] transition">
            <ChevronRight className="w-4 h-4 text-[hsl(var(--blue-900))]/60" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
        {filtered.map((c) => (
          <Link key={c.id} to={`/visa/${c.id}`} className="snap-start shrink-0 group block">
            <div className="w-[170px] rounded-2xl overflow-hidden border border-black/5 bg-white hover:shadow-lg hover:border-[hsl(var(--accent))]/30 transition-all duration-300">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={landmarkFor(c) || ''}
                  alt={c.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3">
                  <div className="text-[13px] font-bold text-white truncate">{c.name}</div>
                </div>
              </div>
              <div className="px-3 py-2.5 flex items-center justify-between">
                <span className="text-[11px] text-[hsl(var(--blue-900))]/50 font-medium">
                  {c.processing_days > 0 ? `${c.processing_days} days` : 'Instant'}
                </span>
                <span className="text-[12px] font-bold text-[hsl(var(--accent))]">
                  {c.fees_inr > 0 ? `₹${c.fees_inr.toLocaleString()}` : 'Free'}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function CategorySuggestions({ currentId }) {
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    axios.get(`${API}/countries`).then(r => setCountries(r.data || [])).catch(() => {});
  }, []);

  if (countries.length === 0) return null;

  const enriched = countries.map(c => {
    const cats = c.categories || {};
    const types = Object.keys(cats);
    const first = cats[types[0]] || {};
    return {
      ...c,
      visa_types: c.visa_types || types,
      processing_days: first.processing_days,
      fees_inr: first.fees_inr,
      fees_usd: first.fees_usd,
      no_visa: c.no_visa,
    };
  });

  return (
    <section className="py-20 bg-[hsl(var(--soft-bg))] border-y border-black/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="mb-10">
          <h2 className="font-display font-extrabold text-[28px] sm:text-[36px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
            Explore visas by category
          </h2>
          <p className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/60 max-w-xl">
            Find the right visa for your travel needs across our curated categories.
          </p>
        </div>
        {GROUPS.map(g => (
          <SuggestionRow
            key={g.key}
            title={g.label}
            icon={g.icon}
            countries={enriched.filter(g.filter)}
            currentId={currentId}
          />
        ))}
      </div>
    </section>
  );
}

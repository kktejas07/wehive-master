import { useState } from 'react';
import { ArrowRight, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import FilterBar, { DEFAULT_FILTERS } from './FilterBar';
import { COUNTRIES, BRAND } from '../data/mock';
import HeroSearchLive from './HeroSearchLive';

function TrustPill() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white border border-black/5 shadow-sm px-3.5 py-1.5 text-[12.5px]">
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-[hsl(var(--blue-900))] font-semibold">12,000+ visas processed</span>
      <span className="text-[hsl(var(--blue-900))]/40">·</span>
      <span className="text-[hsl(var(--blue-900))]/70">98.6% approval</span>
    </div>
  );
}

function HeroSearch({ query, setQuery }) {
  return <HeroSearchLive query={query} setQuery={setQuery} />;
}

function CountrySuggestions({ items, label }) {
  return (
    <div className="mt-5">
      <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--blue-900))]/50 mb-3 text-center">
        {label}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {items.map((c) => (
          <Link
            key={c.id}
            to={`/visa/${c.id}`}
            className="group inline-flex items-center gap-2 rounded-full bg-white border border-black/5 hover:border-[hsl(var(--blue-700))]/30 px-3.5 py-2 text-[13.5px] font-bold text-[hsl(var(--blue-900))]/80 hover:text-[hsl(var(--blue-700))] hover:shadow-sm transition"
          >
            <span className="text-base leading-none">{c.flag}</span>
            <span>{c.name}</span>
            <span className="text-[hsl(var(--blue-900))]/40 group-hover:text-[hsl(var(--accent))] transition-colors">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Hero({ filters, onFilters }) {
  const [query, setQuery] = useState('');
  const top = COUNTRIES.filter((c) => c.popular).slice(0, 6);

  const f = filters || DEFAULT_FILTERS;
  const setF = onFilters || (() => {});

  return (
    <section className="relative pt-32 pb-16 sm:pt-36 sm:pb-24 overflow-hidden bg-grain">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-white" />
        <div className="absolute inset-0 bg-dots opacity-60" />
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-[hsl(var(--blue-50))] blur-3xl opacity-90" />
        <div className="absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-[#FEE5E7] blur-3xl opacity-90" />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative">
        <div className="flex justify-center mb-7">
          <TrustPill />
        </div>

        <h1 className="text-center mx-auto max-w-5xl font-display font-extrabold text-[44px] leading-[1.02] sm:text-[68px] sm:leading-[1.0] lg:text-[80px] tracking-[-0.035em] text-[hsl(var(--blue-900))] text-balance">
          New visa.{' '}
          <span className="text-[hsl(var(--accent))]">Start now.</span>
        </h1>
        <p className="text-center mx-auto max-w-2xl mt-5 text-[16px] sm:text-[18px] leading-relaxed text-[hsl(var(--blue-900))]/65">
          Bridging dreams, connecting continents — your visa, your voyage, our
          expertise. Filter by visa type, delivery speed, documents and travel
          dates.
        </p>

        <div className="mt-10">
          <FilterBar value={f} onChange={setF} />
        </div>

        <div className="mt-8 mx-auto max-w-3xl">
          <HeroSearch query={query} setQuery={setQuery} />
          {!query && (
            <CountrySuggestions
              items={top}
              label="Most requested this week"
            />
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            href={`tel:${BRAND.phoneRaw}`}
            className="inline-flex items-center gap-2 rounded-full bg-white border border-black/8 hover:border-[hsl(var(--accent))]/40 text-[hsl(var(--blue-900))] px-5 py-3 text-[14px] font-bold transition"
          >
            <Phone className="w-4 h-4 text-[hsl(var(--accent))]" />
            {BRAND.phone}
          </a>
        </div>
      </div>
    </section>
  );
}

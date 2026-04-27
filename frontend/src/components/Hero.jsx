import { useState } from 'react';
import { Search, ArrowRight, ShieldCheck, Phone, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { COUNTRIES, BRAND } from '../data/mock';

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
  return (
    <div className="relative rounded-2xl bg-white border border-black/5 shadow-[0_24px_60px_-30px_rgba(10,44,138,0.45)] p-1.5 flex items-center gap-1.5">
      <div className="flex-1 flex items-center gap-3 pl-4">
        <Search className="w-4 h-4 text-[hsl(var(--blue-900))]/45" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Where are you headed? — try USA, UK, Canada…"
          className="w-full bg-transparent border-0 outline-none focus:outline-none placeholder:text-[hsl(var(--blue-900))]/40 text-[15px] py-3 text-[hsl(var(--blue-900))]"
        />
      </div>
      <Button className="rounded-xl btn-accent text-white h-12 px-5 shadow-sm font-semibold">
        Find my visa
        <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
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
            className="group inline-flex items-center gap-2 rounded-full bg-white border border-black/5 hover:border-[hsl(var(--blue-700))]/30 px-3.5 py-2 text-[13.5px] font-semibold text-[hsl(var(--blue-900))]/80 hover:text-[hsl(var(--blue-700))] hover:shadow-sm transition"
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

function HeroMetaCard() {
  return (
    <div className="hidden lg:flex flex-col gap-3 absolute right-8 top-32 w-[280px]">
      <div className="rounded-2xl bg-white border border-black/5 shadow-[0_20px_50px_-25px_rgba(10,44,138,0.4)] p-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[hsl(var(--blue-700))] font-bold">
          <ShieldCheck className="w-3.5 h-3.5" /> Approved on time
        </div>
        <div className="mt-2 font-display text-[20px] font-bold text-[hsl(var(--blue-900))] leading-tight">
          “USA B1/B2 stamped in 11 days.”
        </div>
        <div className="mt-2 text-[12px] text-[hsl(var(--blue-900))]/55">
          Priya · Bangalore · 2 mins ago
        </div>
        <div className="mt-3 flex items-center gap-1 text-[hsl(var(--accent))]">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className="w-3.5 h-3.5 fill-current" />
          ))}
          <span className="ml-1 text-[12px] font-semibold text-[hsl(var(--blue-900))]/70">4.9 / 5</span>
        </div>
      </div>
      <a
        href={`tel:${BRAND.phoneRaw}`}
        className="rounded-2xl bg-[hsl(var(--blue-700))] text-white p-5 hover:bg-[hsl(var(--blue-500))] transition-colors group"
      >
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/65 font-bold">Talk to a counsellor</div>
          <Phone className="w-4 h-4 text-white/80 group-hover:text-white" />
        </div>
        <div className="mt-2 font-display text-[22px] font-bold tracking-tight">{BRAND.phone}</div>
        <div className="mt-1 text-[12px] text-white/70">{BRAND.hours}</div>
      </a>
    </div>
  );
}

export default function Hero() {
  const [query, setQuery] = useState('');
  const top = COUNTRIES.filter((c) => c.popular).slice(0, 6);
  const filtered = query
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : top;

  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden bg-grain">
      {/* Soft background */}
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

        <h1 className="text-center mx-auto max-w-5xl font-display font-extrabold text-[44px] leading-[1.02] sm:text-[68px] sm:leading-[1.0] lg:text-[84px] tracking-[-0.035em] text-[hsl(var(--blue-900))] text-balance">
          New visa.{' '}
          <span className="text-[hsl(var(--accent))]">Start now.</span>
        </h1>
        <p className="text-center mx-auto max-w-2xl mt-6 text-[17px] sm:text-[19px] leading-relaxed text-[hsl(var(--blue-900))]/65">
          Bridging dreams, connecting continents — your visa, your voyage, our
          expertise. {BRAND.name} turns global aspirations into approved
          stamps, with end‑to‑end support from Ballari to your boarding gate.
        </p>

        <div className="mt-10 mx-auto max-w-3xl">
          <HeroSearch query={query} setQuery={setQuery} />
          <CountrySuggestions
            items={filtered}
            label={query ? 'Matching destinations' : 'Most requested this week'}
          />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-500))] text-white px-5 py-3 text-[14px] font-semibold transition"
          >
            Work visa
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 rounded-full bg-white border border-black/8 hover:border-[hsl(var(--blue-700))]/30 text-[hsl(var(--blue-900))] px-5 py-3 text-[14px] font-semibold transition"
          >
            Immigration
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href={`tel:${BRAND.phoneRaw}`}
            className="inline-flex items-center gap-2 rounded-full bg-white border border-black/8 hover:border-[hsl(var(--accent))]/40 text-[hsl(var(--blue-900))] px-5 py-3 text-[14px] font-semibold transition"
          >
            <Phone className="w-4 h-4 text-[hsl(var(--accent))]" />
            {BRAND.phone}
          </a>
        </div>
      </div>
    </section>
  );
}

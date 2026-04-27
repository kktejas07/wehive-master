import { useState } from 'react';
import { Search, Calendar, FileText, Plane, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { COUNTRIES } from '../data/mock';
import { Link } from 'react-router-dom';

export default function Hero() {
  const [query, setQuery] = useState('');
  const top = COUNTRIES.filter((c) => c.popular).slice(0, 6);
  const filtered = query
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : top;

  return (
    <section className="relative pt-32 pb-16 sm:pt-36 sm:pb-24 overflow-hidden bg-grain">
      {/* Soft background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[hsl(var(--cream))]" />
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-[hsl(var(--navy-100))] blur-3xl opacity-70" />
        <div className="absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-[#FCE6E8] blur-3xl opacity-70" />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Top trust pill */}
        <div className="flex justify-center mb-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-black/5 shadow-sm px-3.5 py-1.5 text-[12.5px]">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[hsl(var(--navy-900))] font-medium">
              700,000+ visas processed
            </span>
            <span className="text-[hsl(var(--navy-900))]/40">·</span>
            <span className="text-[hsl(var(--navy-900))]/70">99.2% approval</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-center mx-auto max-w-5xl text-[40px] leading-[1.05] sm:text-[64px] sm:leading-[1.02] lg:text-[78px] font-semibold tracking-[-0.02em] text-[hsl(var(--navy-900))]">
          Visas, the way{' '}
          <span className="font-serif-display italic font-normal text-[hsl(var(--accent))]">
            travel
          </span>{' '}
          should feel.
        </h1>
        <p className="text-center mx-auto max-w-2xl mt-6 text-[17px] sm:text-[19px] leading-relaxed text-[hsl(var(--navy-900))]/65">
          Apply in minutes. Approved on time, every time. Backed by the only
          on‑time guarantee in the industry — we refund you if we are even a
          day late.
        </p>

        {/* Search bar */}
        <div className="mt-10 mx-auto max-w-3xl">
          <div className="relative rounded-2xl bg-white border border-black/5 shadow-[0_24px_60px_-30px_rgba(15,42,95,0.35)] p-1.5 flex items-center gap-1.5">
            <div className="flex-1 flex items-center gap-3 pl-4">
              <Search className="w-4 h-4 text-[hsl(var(--navy-900))]/45" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Where are you headed?  — try Japan, USA, France…"
                className="w-full bg-transparent border-0 outline-none focus:outline-none placeholder:text-[hsl(var(--navy-900))]/40 text-[15px] py-3 text-[hsl(var(--navy-900))]"
              />
            </div>
            <Button className="rounded-xl btn-navy text-white h-12 px-5 shadow-sm">
              <span>Find my visa</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Suggestions */}
          <div className="mt-5">
            <div className="text-[12px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--navy-900))]/50 mb-3 text-center">
              {query ? 'Matching destinations' : 'Most requested this week'}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {filtered.map((c) => (
                <Link
                  key={c.id}
                  to={`/visa/${c.id}`}
                  className="group inline-flex items-center gap-2 rounded-full bg-white border border-black/5 hover:border-[hsl(var(--navy-700))]/30 px-3.5 py-2 text-[13.5px] font-medium text-[hsl(var(--navy-900))]/80 hover:text-[hsl(var(--navy-900))] hover:shadow-sm transition"
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span>{c.name}</span>
                  <span className="text-[hsl(var(--navy-900))]/40 group-hover:text-[hsl(var(--accent))] transition-colors">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
          {[
            { icon: Plane, label: 'Any time' },
            { icon: FileText, label: 'All visa types' },
            { icon: Calendar, label: 'Any documents' },
            { icon: Sparkles, label: 'Holidays' },
          ].map((chip) => (
            <button
              key={chip.label}
              className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur border border-black/5 hover:bg-white px-4 py-2 text-[13px] text-[hsl(var(--navy-900))]/75 hover:text-[hsl(var(--navy-900))] transition-colors"
            >
              <chip.icon className="w-3.5 h-3.5" />
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

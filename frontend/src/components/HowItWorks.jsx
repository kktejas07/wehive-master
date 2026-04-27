import { ScanLine, ShieldCheck, Headphones, Lock, ArrowUpRight } from 'lucide-react';
import { FEATURES, STEPS, STATS } from '../data/mock';

const ICONS = { ScanLine, ShieldCheck, Headphones, Lock };

export default function HowItWorks() {
  return (
    <section id="how" className="relative py-20 sm:py-28 bg-white border-y border-black/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Section header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.16em] font-semibold text-[hsl(var(--accent))]">
            How Wehive works
          </div>
          <h2 className="mt-3 text-[34px] sm:text-[48px] leading-[1.05] font-semibold tracking-tight text-[hsl(var(--navy-900))]">
            Three steps. Zero stress.{' '}
            <span className="font-serif-display italic font-normal text-[hsl(var(--navy-700))]">
              One promise.
            </span>
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[hsl(var(--navy-900))]/65 max-w-2xl">
            Built by ex‑immigration officers and product designers from
            Stripe, Notion and Airbnb — we redesigned the visa from the ground
            up.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-7">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className="relative rounded-2xl border border-black/5 bg-[hsl(var(--cream))] p-7 card-lift"
            >
              <div className="flex items-center justify-between">
                <div className="font-serif-display text-[64px] leading-none text-[hsl(var(--navy-700))]">
                  0{s.id}
                </div>
                <ArrowUpRight className="w-5 h-5 text-[hsl(var(--navy-900))]/30" />
              </div>
              <h3 className="mt-3 text-[22px] font-semibold tracking-tight text-[hsl(var(--navy-900))]">
                {s.title}
              </h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[hsl(var(--navy-900))]/65">
                {s.desc}
              </p>
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3.5 h-px w-7 bg-black/10" />
              )}
            </div>
          ))}
        </div>

        {/* Features grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => {
            const Icon = ICONS[f.icon] || ShieldCheck;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-black/5 bg-white p-6 hover:border-[hsl(var(--navy-700))]/15 transition"
              >
                <div className="h-11 w-11 rounded-xl bg-[hsl(var(--navy-50))] flex items-center justify-center text-[hsl(var(--navy-700))]">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="mt-5 text-[16.5px] font-semibold tracking-tight text-[hsl(var(--navy-900))]">
                  {f.title}
                </h4>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[hsl(var(--navy-900))]/65">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Stats strip */}
        <div className="mt-16 rounded-3xl bg-[hsl(var(--navy-900))] text-white p-8 sm:p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-stripes opacity-30 pointer-events-none" />
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="font-serif-display text-[44px] sm:text-[54px] leading-none">
                  {s.value}
                </div>
                <div className="mt-2 text-[13.5px] text-white/65">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

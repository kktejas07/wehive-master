import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ShieldCheck, Globe2, Heart, Compass } from 'lucide-react';
import { STATS } from '../data/mock';

export default function About() {
  return (
    <div className="bg-[hsl(var(--cream))]">
      <Navbar />
      <section className="pt-32 pb-16">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.16em] font-semibold text-[hsl(var(--accent))]">
            About Wehive
          </div>
          <h1 className="mt-3 text-[44px] sm:text-[68px] leading-[1.04] font-semibold tracking-tight text-[hsl(var(--navy-900))]">
            We believe a visa{' '}
            <span className="font-serif-display italic font-normal text-[hsl(var(--navy-700))]">should never</span>{' '}
            stand between you and a memory.
          </h1>
          <p className="mt-6 text-[18px] leading-relaxed text-[hsl(var(--navy-900))]/65 max-w-2xl">
            Wehive was founded in 2023 by a former U.S. consular officer and a
            small team of designers from Stripe, Notion and Airbnb. After
            personally watching thousands of travelers miss weddings,
            interviews and reunions because of paperwork, we set out to fix it
            — with software that is honest about timelines and a guarantee
            that puts our money where our mouth is.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white border-y border-black/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-serif-display text-[48px] leading-none text-[hsl(var(--navy-900))]">{s.value}</div>
              <div className="mt-2 text-[13.5px] text-[hsl(var(--navy-900))]/65">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid md:grid-cols-2 gap-6">
          {[
            { icon: ShieldCheck, t: 'Honesty over hype', d: 'If a visa takes 14 days, we say 14 days. We do not promise instant approvals we cannot deliver.' },
            { icon: Globe2, t: 'Built for the world', d: 'Operations in 18 cities, 11 languages, and an embassy network spanning 150+ countries.' },
            { icon: Heart, t: 'Travel changes lives', d: 'We donate 1% of every visa to organizations that fund refugee documentation worldwide.' },
            { icon: Compass, t: 'Designed end‑to‑end', d: 'Every screen, email and SMS is crafted in‑house. No off‑the‑shelf forms, no copy‑pasted templates.' },
          ].map((v) => (
            <div key={v.t} className="rounded-3xl bg-white border border-black/5 p-8 card-lift">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--navy-50))] text-[hsl(var(--navy-700))]">
                <v.icon className="w-5 h-5" />
              </span>
              <h3 className="mt-5 text-[22px] font-semibold tracking-tight text-[hsl(var(--navy-900))]">{v.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[hsl(var(--navy-900))]/65">{v.d}</p>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Check, Star } from 'lucide-react';
import { Button } from '../components/ui/button';
import { PLANS } from '../data/mock';

export default function Pricing() {
  return (
    <div className="bg-[hsl(var(--cream))]">
      <Navbar />
      <section className="pt-32 pb-12">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.16em] font-semibold text-[hsl(var(--accent))]">
            Pricing
          </div>
          <h1 className="mt-3 text-[44px] sm:text-[64px] leading-[1.04] font-semibold tracking-tight text-[hsl(var(--navy-900))]">
            Fair, flat prices.{' '}
            <span className="font-serif-display italic font-normal text-[hsl(var(--navy-700))]">No surprises.</span>
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-[hsl(var(--navy-900))]/65 max-w-xl mx-auto">
            Government fees are passed through at cost. The only thing you pay
            us for is making the visa effortless.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid md:grid-cols-3 gap-5">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`relative rounded-3xl p-8 card-lift ${
                p.highlighted
                  ? 'bg-[hsl(var(--navy-900))] text-white border border-white/10 shadow-[0_30px_70px_-30px_rgba(15,42,95,0.6)]'
                  : 'bg-white text-[hsl(var(--navy-900))] border border-black/5'
              }`}
            >
              {p.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-[hsl(var(--accent))] text-white text-[11px] uppercase tracking-[0.14em] font-semibold px-3 py-1">
                  <Star className="w-3 h-3 fill-current" /> Most popular
                </div>
              )}
              <div className="text-[12px] uppercase tracking-[0.14em] font-semibold opacity-65">{p.tag}</div>
              <h3 className="mt-2 text-[26px] font-semibold tracking-tight">{p.name}</h3>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-serif-display text-[64px] leading-none">${p.price}</span>
                <span className="opacity-65">/ visa</span>
              </div>
              <Button
                className={`mt-6 w-full rounded-full h-12 ${
                  p.highlighted
                    ? 'bg-white text-[hsl(var(--navy-900))] hover:bg-white/90'
                    : 'btn-navy text-white'
                }`}
              >
                Choose {p.name}
              </Button>
              <ul className="mt-7 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[14.5px]">
                    <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full ${
                      p.highlighted ? 'bg-white/12 text-white' : 'bg-[hsl(var(--navy-50))] text-[hsl(var(--navy-700))]'
                    }`}>
                      <Check className="w-3 h-3" />
                    </span>
                    <span className="opacity-90">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}

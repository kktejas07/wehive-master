import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Check, Star } from 'lucide-react';
import { Button } from '../components/ui/button';
import { PLANS } from '../data/mock';

function PlanCard({ plan }) {
  const isHi = plan.highlighted;
  return (
    <div
      className={`relative rounded-3xl p-8 card-lift ${
        isHi
          ? 'bg-[hsl(var(--blue-900))] text-white border border-white/10 shadow-[0_30px_70px_-30px_rgba(10,44,138,0.6)]'
          : 'bg-white text-[hsl(var(--blue-900))] border border-black/5'
      }`}
    >
      {isHi && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-[hsl(var(--accent))] text-white text-[11px] uppercase tracking-[0.16em] font-bold px-3 py-1">
          <Star className="w-3 h-3 fill-current" /> Most popular
        </div>
      )}
      <div className="text-[11px] uppercase tracking-[0.16em] font-bold opacity-65">{plan.tag}</div>
      <h3 className="mt-2 font-display font-extrabold text-[28px] tracking-[-0.025em]">{plan.name}</h3>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="font-display font-extrabold text-[64px] leading-none tracking-[-0.04em]">${plan.price}</span>
        <span className="opacity-65">/ visa</span>
      </div>
      <Button
        className={`mt-6 w-full rounded-full h-12 font-bold ${
          isHi
            ? 'bg-white text-[hsl(var(--blue-900))] hover:bg-white/90'
            : 'btn-primary text-white'
        }`}
      >
        Choose {plan.name}
      </Button>
      <ul className="mt-7 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[14.5px]">
            <span
              className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full ${
                isHi ? 'bg-white/12 text-white' : 'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))]'
              }`}
            >
              <Check className="w-3 h-3" />
            </span>
            <span className="opacity-90">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Pricing() {
  return (
    <div className="bg-white">
      <Navbar />
      <section className="pt-32 pb-12 bg-[hsl(var(--soft-bg))] border-b border-black/5">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
            Pricing
          </div>
          <h1 className="mt-3 font-display font-extrabold text-[44px] sm:text-[68px] leading-[1.02] tracking-[-0.035em] text-[hsl(var(--blue-900))]">
            Fair, flat prices.{' '}
            <span className="text-[hsl(var(--accent))]">No surprises.</span>
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-[hsl(var(--blue-900))]/65 max-w-xl mx-auto">
            Government fees are passed through at cost. The only thing you pay
            us for is making the visa effortless.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid md:grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}

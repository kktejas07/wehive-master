import { motion } from 'framer-motion';
import { Clock, ShieldCheck } from 'lucide-react';

function FadeIn({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function ETATracker({ country }) {
  if (!country) return null;

  const delivery = country.delivery || {};
  const standardDays = delivery.standard_days || delivery.rush_days || 0;
  if (standardDays <= 0) return null;

  const now = new Date();
  const eta = new Date(now);
  eta.setDate(eta.getDate() + standardDays);

  const etaStr = eta.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const etaTime = eta.toLocaleTimeString('en-IN', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

  const countryName = country.name || '';

  return (
    <section className="py-16 bg-[hsl(var(--soft-bg))] border-y border-black/5">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <FadeIn>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[11px] uppercase tracking-[0.14em] font-bold mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            Guaranteed delivery
          </div>
          <h2 className="font-display font-extrabold text-[28px] sm:text-[36px] tracking-[-0.03em] text-[hsl(var(--blue-900))] leading-[1.15]">
            Get your {countryName} visa on or before
          </h2>
          <div className="mt-4 inline-block rounded-2xl bg-white border border-black/5 shadow-lg px-8 py-5">
            <div className="font-display font-extrabold text-[36px] sm:text-[44px] tracking-[-0.02em] text-[hsl(var(--accent))]">
              {etaStr}
            </div>
            <div className="flex items-center justify-center gap-2 mt-1 text-[14px] text-[hsl(var(--blue-900))]/50">
              <Clock className="w-4 h-4" />
              by {etaTime}
            </div>
          </div>
          <p className="mt-4 text-[14px] text-[hsl(var(--blue-900))]/50 max-w-md mx-auto">
            No ambiguity. Know exactly when your visa will arrive before you apply.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

import { motion } from 'framer-motion';
import { Clock, ShieldCheck } from 'lucide-react';

function FadeIn({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay, ease: [0.2, 0.8, 0.2, 1] }}
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
    <section className="py-16 md:py-24 bg-[hsl(var(--soft-bg))] border-y border-[hsl(var(--border))]">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <FadeIn>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-100))] text-[hsl(var(--blue-700))] text-[12px] uppercase tracking-[0.14em] font-bold mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            Guaranteed delivery
          </div>
          <h2 className="font-display font-bold text-[28px] sm:text-[36px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-[1.15]">
            Get your {countryName} visa on or before
          </h2>
          <div className="mt-4 inline-block rounded-2xl bg-white border border-[hsl(var(--border))] shadow-sm px-6 sm:px-8 py-5">
            <div className="font-display font-bold text-[36px] sm:text-[44px] tracking-[-0.02em] text-[hsl(var(--blue-700))]">
              {etaStr}
            </div>
            <div className="flex items-center justify-center gap-2 mt-1 text-[14px] text-muted-foreground">
              <Clock className="w-4 h-4" />
              by {etaTime}
            </div>
          </div>
          <p className="mt-4 text-[16px] text-muted-foreground max-w-md mx-auto">
            No ambiguity. Know exactly when your visa will arrive before you apply.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

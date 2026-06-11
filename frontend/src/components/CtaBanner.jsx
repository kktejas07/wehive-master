import { ArrowRight, Phone, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { BRAND } from '../data/mock';
import Reveal from './Reveal';

const METRICS = [
  { id: 'm1', k: 'Avg. processing', v: '7.2 days' },
  { id: 'm2', k: 'On‑time rate', v: '99.4%' },
  { id: 'm3', k: 'Refund cases', v: '<0.6%' },
];

function MetricCard({ k, v }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-white/55 font-bold">{k}</div>
      <div className="mt-1 text-[15px] font-bold">{v}</div>
    </div>
  );
}

export default function CtaBanner() {
  return (
    <section id="contact" className="relative py-16 sm:py-24 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="relative rounded-[28px] overflow-hidden bg-[hsl(var(--blue-900))] text-white p-8 sm:p-12 lg:p-16">
          <motion.div
            initial={{ opacity: 0.3, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full bg-[hsl(var(--accent))]/25 blur-3xl"
          />
          <motion.div
            initial={{ opacity: 0.3, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.1, ease: 'easeOut' }}
            className="absolute -bottom-32 -left-32 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl"
          />

          <div className="relative grid lg:grid-cols-12 gap-8 sm:gap-10 items-center">
            <Reveal direction="right" className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-white/70">
                Ready when you are
              </div>
              <h2 className="mt-3 font-display font-extrabold text-[30px] sm:text-[44px] lg:text-[58px] leading-[1.05] tracking-[-0.035em]">
                The visa, sorted{' '}
                <span className="text-[hsl(var(--accent))]">before your coffee.</span>
              </h2>
              <p className="mt-4 sm:mt-5 text-[15px] sm:text-[18px] leading-relaxed text-white/70 max-w-xl">
                Walk into our Ballari office, call us, or start online. Pay
                Call us, or start online. Pay

                Walk into our Hyderabad office, call us, or start online. Pay

                only when you are ready to submit.
              </p>
              <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3">
                <Button className="rounded-full bg-white text-[hsl(var(--blue-900))] hover:bg-white/90 h-12 px-6 font-bold">
                  Start my application
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <a
                  href={`tel:${BRAND.phoneRaw}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] hover:bg-[hsl(var(--red-600))] text-white h-12 px-5 font-bold transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {BRAND.phone}
                </a>
                <a
                  href={`mailto:${BRAND.email}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 hover:border-white/40 text-white h-12 px-5 font-semibold transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {BRAND.email}
                </a>
              </div>
            </Reveal>
            <Reveal direction="left" delay={0.12} className="lg:col-span-5">
              <div className="rounded-2xl bg-white/8 border border-white/12 backdrop-blur p-5 sm:p-6">
                <div className="text-[11px] uppercase tracking-[0.16em] text-white/55 font-bold">Live</div>
                <div className="mt-2 font-display font-extrabold text-[26px] sm:text-[32px] leading-tight">
                  “Visa for Tokyo approved.”
                </div>
                <div className="mt-2 text-[13px] text-white/60">
                  Daniel C. · 2 minutes ago
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {METRICS.map((m) => (
                    <MetricCard key={m.id} k={m.k} v={m.v} />
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

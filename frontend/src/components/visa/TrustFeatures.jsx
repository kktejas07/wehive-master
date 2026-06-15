import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';

const FEATURES = [
  'Real-time tracking of your visa',
  'Precise ETA, no guesswork',
  'Transparent pricing; no hidden fees',
  '100% digital process',
];

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

export default function TrustFeatures({ countryName }) {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <FadeIn>
          <h2 className="font-display font-extrabold text-[32px] sm:text-[42px] tracking-[-0.03em] text-[hsl(var(--blue-900))] text-center leading-[1.1]">
            Visa application made<br />
            <span className="text-[hsl(var(--accent))]">simple and reliable</span>
          </h2>
        </FadeIn>

        <div className="mt-14 max-w-3xl mx-auto">
          {/* Table header */}
          <FadeIn delay={0.1}>
            <div className="grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_140px_140px] gap-4 items-center px-4 sm:px-6 pb-4 border-b border-black/10">
              <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]" />
              <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--blue-900))]/40 text-center">Others</span>
              <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--blue-700))] text-center">We Hive</span>
            </div>
          </FadeIn>

          {/* Feature rows */}
          <div className="divide-y divide-black/5">
            {FEATURES.map((feature, i) => (
              <FadeIn key={i} delay={0.1 + i * 0.05}>
                <div className="grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_140px_140px] gap-4 items-center px-4 sm:px-6 py-4 sm:py-5 hover:bg-[hsl(var(--soft-bg))] transition rounded-lg">
                  <span className="text-[14px] sm:text-[15px] font-semibold text-[hsl(var(--blue-900))]">{feature}</span>
                  <div className="flex justify-center">
                    <XCircle className="w-5 h-5 text-red-300" />
                  </div>
                  <div className="flex justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

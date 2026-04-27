import { motion } from 'framer-motion';
import { PRESS } from '../data/mock';
import Reveal from './Reveal';

export default function PressStrip() {
  return (
    <section className="relative py-10 sm:py-12 bg-[hsl(var(--soft-bg))] border-y border-black/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--blue-900))]/55 font-bold mb-6 sm:mb-7">
          <span className="h-px w-8 bg-black/10" /> Featured in <span className="h-px w-8 bg-black/10" />
        </Reveal>
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 items-center">
          {PRESS.map((p, i) => (
            <motion.div
              key={p}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              whileHover={{ y: -2 }}
              className="font-display text-center text-[16px] sm:text-[22px] lg:text-[24px] font-bold tracking-[-0.02em] text-[hsl(var(--blue-900))]/55 hover:text-[hsl(var(--blue-900))] transition-colors cursor-default"
            >
              {p}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

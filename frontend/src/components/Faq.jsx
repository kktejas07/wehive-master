import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { FAQS } from '../data/mock';
import Reveal from './Reveal';

function FaqItem({ item, isOpen, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="w-full text-left py-6 group flex items-start gap-6"
    >
      <div className="flex-1">
        <div className="text-[17px] sm:text-[19px] font-bold tracking-tight text-[hsl(var(--blue-900))] group-hover:text-[hsl(var(--blue-700))] transition">
          {item.q}
        </div>
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            isOpen ? 'grid-rows-[1fr] mt-3' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <p className="text-[15px] leading-relaxed text-[hsl(var(--blue-900))]/65 max-w-3xl">
              {item.a}
            </p>
          </div>
        </div>
      </div>
      <span className="shrink-0 mt-1 inline-flex items-center justify-center h-9 w-9 rounded-full border border-black/10 text-[hsl(var(--blue-900))] group-hover:border-[hsl(var(--accent))]/40 group-hover:text-[hsl(var(--accent))] transition">
        {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </span>
    </button>
  );
}

export default function Faq() {
  const [openId, setOpenId] = useState(FAQS[0]?.id ?? null);
  return (
    <section className="relative py-16 sm:py-24 lg:py-28 bg-[hsl(var(--soft-bg))] border-y border-black/5">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
            FAQ
          </div>
          <h2 className="mt-3 text-[28px] sm:text-[40px] lg:text-[44px] leading-[1.08] font-display font-extrabold tracking-[-0.03em] text-[hsl(var(--blue-900))]">
            Questions, answered.{' '}
            <span className="text-[hsl(var(--accent))]">Honestly.</span>
          </h2>
        </Reveal>
        <div className="mt-10 sm:mt-12 divide-y divide-black/8 border-y border-black/8">
          {FAQS.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.3) }}
            >
              <FaqItem
                item={item}
                isOpen={openId === item.id}
                onToggle={() => setOpenId(openId === item.id ? null : item.id)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

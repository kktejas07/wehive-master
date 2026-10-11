import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { FAQS } from '../data/mock';
import Reveal from './Reveal';

function FaqItem({ item, isOpen, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className="w-full text-left py-5 sm:py-6 group flex items-start gap-4 sm:gap-6"
    >
      <div className="flex-1">
        <div className="text-[17px] sm:text-[18px] font-semibold text-[hsl(var(--blue-900))] group-hover:text-[hsl(var(--blue-700))] transition-colors duration-200">
          {item.q}
        </div>
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            isOpen ? 'grid-rows-[1fr] mt-3' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <p className="text-[16px] leading-relaxed text-muted-foreground max-w-3xl">
              {item.a}
            </p>
          </div>
        </div>
      </div>
      <span className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-full border border-[hsl(var(--border))] bg-white text-[hsl(var(--blue-900))] group-hover:border-[hsl(var(--blue-700))]/40 group-hover:text-[hsl(var(--blue-700))] transition-colors duration-200" aria-hidden="true">
        {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </span>
    </button>
  );
}

export default function Faq() {
  const [openId, setOpenId] = useState(FAQS[0]?.id ?? null);
  return (
    <section className="relative py-16 md:py-24 bg-[hsl(var(--soft-bg))] border-y border-[hsl(var(--border))]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto">
          <div className="text-[12px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--blue-700))]">
            FAQ
          </div>
          <h2 className="mt-3 text-[28px] sm:text-[36px] leading-[1.15] font-display font-bold tracking-[-0.02em] text-[hsl(var(--blue-900))]">
            Questions, answered.
          </h2>
        </Reveal>
        <div className="mt-10 sm:mt-12 rounded-2xl bg-white border border-[hsl(var(--border))] shadow-sm px-5 sm:px-8 divide-y divide-[hsl(var(--border))]">
          {FAQS.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.2), ease: 'easeOut' }}
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

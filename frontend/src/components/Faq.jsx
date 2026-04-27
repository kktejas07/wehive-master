import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { FAQS } from '../data/mock';

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
    <section className="relative py-20 sm:py-28 bg-[hsl(var(--soft-bg))] border-y border-black/5">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
            FAQ
          </div>
          <h2 className="mt-3 text-[34px] sm:text-[44px] leading-[1.04] font-display font-extrabold tracking-[-0.03em] text-[hsl(var(--blue-900))]">
            Questions, answered.{' '}
            <span className="text-[hsl(var(--accent))]">Honestly.</span>
          </h2>
        </div>
        <div className="mt-12 divide-y divide-black/8 border-y border-black/8">
          {FAQS.map((item) => (
            <FaqItem
              key={item.id}
              item={item}
              isOpen={openId === item.id}
              onToggle={() => setOpenId(openId === item.id ? null : item.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

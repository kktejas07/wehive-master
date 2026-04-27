import { Quote, Star } from 'lucide-react';
import { TESTIMONIALS } from '../data/mock';
import Reveal from './Reveal';

function TestimonialCard({ t, instance }) {
  return (
    <article className="shrink-0 w-[360px] sm:w-[420px] rounded-2xl bg-white border border-black/5 p-6 shadow-[0_10px_30px_-20px_rgba(10,44,138,0.25)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[hsl(var(--accent))]">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={`${t.id}-${instance}-star-${i}`} className="w-3.5 h-3.5 fill-current" />
          ))}
        </div>
        <Quote className="w-5 h-5 text-[hsl(var(--blue-900))]/15" />
      </div>
      <p className="mt-4 text-[15px] leading-relaxed text-[hsl(var(--blue-900))]/85">
        “{t.quote}”
      </p>
      <div className="mt-5 pt-5 border-t border-black/5 flex items-center gap-3">
        <img src={t.avatar} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
        <div className="flex-1">
          <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{t.name}</div>
          <div className="text-[12px] text-[hsl(var(--blue-900))]/55">{t.role}</div>
        </div>
        <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))] px-2 py-1 rounded-full">
          {t.country}
        </span>
      </div>
    </article>
  );
}

function Marquee({ items, reverse, instance }) {
  // Duplicate to loop seamlessly — render two passes with stable instance keys
  return (
    <div className="relative">
      <div
        className="flex gap-5 animate-marquee"
        style={{ animationDirection: reverse ? 'reverse' : 'normal', width: 'max-content' }}
      >
        {items.map((t) => (
          <TestimonialCard key={`${instance}-a-${t.id}`} t={t} instance={`${instance}-a`} />
        ))}
        {items.map((t) => (
          <TestimonialCard key={`${instance}-b-${t.id}`} t={t} instance={`${instance}-b`} />
        ))}
      </div>
    </div>
  );
}

export default function Testimonials() {
  const rowA = TESTIMONIALS;
  const rowB = [...TESTIMONIALS].reverse();

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
            Loved by travelers
          </div>
          <h2 className="mt-3 text-[30px] sm:text-[48px] leading-[1.05] font-display font-extrabold tracking-[-0.03em] text-[hsl(var(--blue-900))]">
            4.9 stars across 12,000+ visas.{' '}
            <span className="text-[hsl(var(--accent))]">And counting.</span>
          </h2>
        </Reveal>
      </div>

      <div className="mt-14 space-y-5">
        <Marquee items={rowA} instance="row1" />
        <Marquee items={rowB} reverse instance="row2" />
      </div>
    </section>
  );
}

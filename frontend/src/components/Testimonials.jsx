import { Quote, Star } from 'lucide-react';
import { TESTIMONIALS } from '../data/mock';

export default function Testimonials() {
  // Two rows for marquee illusion
  const rowA = TESTIMONIALS;
  const rowB = [...TESTIMONIALS].reverse();

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-[hsl(var(--cream))]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.16em] font-semibold text-[hsl(var(--accent))]">
            Loved by travelers
          </div>
          <h2 className="mt-3 text-[34px] sm:text-[48px] leading-[1.05] font-semibold tracking-tight text-[hsl(var(--navy-900))]">
            4.9 stars across 32,000+ reviews.{' '}
            <span className="font-serif-display italic font-normal text-[hsl(var(--navy-700))]">
              And counting.
            </span>
          </h2>
        </div>
      </div>

      <div className="mt-14 space-y-5">
        <Marquee items={rowA} />
        <Marquee items={rowB} reverse />
      </div>
    </section>
  );
}

function Marquee({ items, reverse }) {
  // Duplicate to loop seamlessly
  const list = [...items, ...items];
  return (
    <div className="relative">
      <div
        className="flex gap-5 animate-marquee"
        style={{ animationDirection: reverse ? 'reverse' : 'normal', width: 'max-content' }}
      >
        {list.map((t, i) => (
          <article
            key={i}
            className="shrink-0 w-[360px] sm:w-[420px] rounded-2xl bg-white border border-black/5 p-6 shadow-[0_10px_30px_-20px_rgba(15,42,95,0.25)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[hsl(var(--accent))]">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <Quote className="w-5 h-5 text-[hsl(var(--navy-900))]/15" />
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-[hsl(var(--navy-900))]/85">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="mt-5 pt-5 border-t border-black/5 flex items-center gap-3">
              <img
                src={t.avatar}
                alt={t.name}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="text-[14px] font-semibold text-[hsl(var(--navy-900))]">
                  {t.name}
                </div>
                <div className="text-[12px] text-[hsl(var(--navy-900))]/55">{t.role}</div>
              </div>
              <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--navy-700))] bg-[hsl(var(--navy-50))] px-2 py-1 rounded-full">
                {t.country}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

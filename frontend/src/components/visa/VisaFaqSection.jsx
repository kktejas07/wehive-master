import { ChevronRight } from 'lucide-react';
import { FAQS } from '../../data/mock';

export default function VisaFaqSection({ countryName }) {
  return (
    <section className="py-20 bg-[hsl(var(--soft-bg))] border-y border-black/5">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
          Common questions about {countryName}
        </h2>
        <div className="mt-8 divide-y divide-black/8 border-y border-black/8">
          {FAQS.slice(0, 4).map((f) => (
            <details key={f.id} className="py-5 group">
              <summary className="cursor-pointer list-none flex items-start justify-between gap-4 text-[16px] font-bold text-[hsl(var(--blue-900))]">
                {f.q}
                <ChevronRight className="w-4 h-4 text-[hsl(var(--blue-900))]/40 group-open:rotate-90 transition" />
              </summary>
              <p className="mt-2 text-[14.5px] text-[hsl(var(--blue-900))]/65 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

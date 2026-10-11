import { ChevronRight } from 'lucide-react';
import { FAQS } from '../../data/mock';

interface VisaFaqSectionProps {
  countryName: string;
}

export default function VisaFaqSection({ countryName }: VisaFaqSectionProps) {
  return (
    <section className="py-16 md:py-24 bg-[hsl(var(--soft-bg))] border-y border-[hsl(var(--border))]">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <h2 className="font-display font-bold text-[28px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-tight">
          Common questions about {countryName}
        </h2>
        <div className="mt-8 divide-y divide-[hsl(var(--border))] border-y border-[hsl(var(--border))]">
          {FAQS.slice(0, 4).map((f) => (
            <details key={f.id} className="py-5 group">
              <summary className="cursor-pointer list-none flex items-start min-h-[44px] justify-between gap-4 text-[16px] font-bold text-[hsl(var(--blue-900))]">
                {f.q}
                <ChevronRight className="w-4 h-4 text-muted-foreground group-open:rotate-90 transition" />
              </summary>
              <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

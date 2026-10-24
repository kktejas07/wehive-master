import { ClipboardCheck, ExternalLink } from 'lucide-react';

// Rules an applicant must follow for this destination (country.applicant_rules
// from the server). Each rule says what it rests on; the visa rules agent keeps
// the allowed stay and conditions current every day.
const BASIS = {
  law: { label: 'EU law', cls: 'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))]' },
  official: { label: 'Official', cls: 'bg-emerald-50 text-emerald-800' },
  source: { label: 'Current rules', cls: 'bg-violet-50 text-violet-800' },
  guidance: { label: 'WeHive tip', cls: 'bg-amber-50 text-amber-800' },
};

export default function ApplicantRules({ country }) {
  const rules = country?.applicant_rules;
  if (!rules?.length) return null;
  const sources = [...new Map(rules.filter(r => r.source_url).map(r => [r.source_url, r])).values()];

  return (
    <section className="py-14 md:py-16">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <h2 className="font-display font-bold text-[24px] sm:text-[28px] tracking-[-0.02em] text-[hsl(var(--blue-900))] inline-flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-[hsl(var(--blue-700))]" aria-hidden="true" />
          Rules to follow for {country.name}
        </h2>
        <p className="mt-1 text-[14px] text-muted-foreground">For Indian passport holders. Checked automatically every day.</p>
        <ul className="mt-5 space-y-2.5">
          {rules.map((r, i) => {
            const b = BASIS[r.basis] || BASIS.guidance;
            return (
              <li key={i} className="flex items-start gap-3 rounded-xl border border-[hsl(var(--border))] bg-white px-4 py-3">
                <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-[0.08em] ${b.cls}`}>{b.label}</span>
                <span className="text-[14.5px] text-[hsl(var(--blue-900))]">{r.text}</span>
              </li>
            );
          })}
        </ul>
        {sources.length > 0 && (
          <p className="mt-4 text-[13px] text-muted-foreground">
            Sources:{' '}
            {sources.map((s, i) => (
              <span key={s.source_url}>
                {i > 0 && ' · '}
                <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">
                  {s.source_name}<ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </span>
            ))}
            . Rules can change: WeHive confirms them before you apply.
          </p>
        )}
      </div>
    </section>
  );
}

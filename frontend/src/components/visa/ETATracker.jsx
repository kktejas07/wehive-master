import { motion } from 'framer-motion';
import { CalendarClock, Info, ExternalLink, ShieldAlert } from 'lucide-react';

// How long a decision usually takes for this destination, and what that figure
// rests on (country.processing from the server's visa rules):
//   official = published by that government; law = Schengen 15 days (extendable
//   to 45); estimate = WeHive's typical range. Never a guarantee: the embassy decides.
const BASIS = {
  official: { label: 'Official figure', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  law: { label: 'Set by EU law', cls: 'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] border-[hsl(var(--blue-100))]' },
  estimate: { label: 'WeHive estimate', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
};

function FadeIn({ children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}

const fmt = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ETATracker({ country }) {
  const proc = country?.processing;
  if (!proc) return null;
  const name = country.name || '';

  if (proc.requirement === 'restricted') {
    return (
      <section className="py-12 bg-[hsl(var(--soft-bg))] border-y border-[hsl(var(--border))]">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <ShieldAlert className="w-8 h-8 mx-auto text-red-600 mb-3" aria-hidden="true" />
          <h2 className="font-display font-bold text-[24px] text-[hsl(var(--blue-900))]">{proc.requirement_label}</h2>
          <p className="mt-2 text-[15px] text-muted-foreground">Contact WeHive before planning travel to {name}.</p>
        </div>
      </section>
    );
  }

  const t = proc.time;
  if (!t) {
    // No decision to wait for (visa-free, on arrival) — say so plainly.
    if (proc.requirement !== 'on_arrival') return null;
    return (
      <section className="py-12 bg-[hsl(var(--soft-bg))] border-y border-[hsl(var(--border))]">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="font-display font-bold text-[24px] text-[hsl(var(--blue-900))]">Visa on arrival</h2>
          <p className="mt-2 text-[15px] text-muted-foreground">No advance application: the visa is issued when you land in {name}.</p>
        </div>
      </section>
    );
  }

  const basis = BASIS[t.basis] || BASIS.estimate;
  const isAppointment = t.metric === 'appointment_wait';

  return (
    <section className="py-16 md:py-20 bg-[hsl(var(--soft-bg))] border-y border-[hsl(var(--border))]">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <FadeIn>
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[12px] uppercase tracking-[0.14em] font-bold mb-5 ${basis.cls}`}>
            <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" /> {basis.label}
          </div>
          <h2 className="font-display font-bold text-[26px] sm:text-[32px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-[1.15]">
            {isAppointment ? `Interview wait for a ${name} visa` : `How long a ${name} visa usually takes`}
          </h2>
          <div className="mt-4 inline-block rounded-2xl bg-white border border-[hsl(var(--border))] shadow-sm px-6 sm:px-8 py-5">
            <div className="font-display font-bold text-[30px] sm:text-[38px] tracking-[-0.02em] text-[hsl(var(--blue-700))]">
              {t.label}
            </div>
            <div className="mt-1 text-[14px] text-muted-foreground">
              {t.min_days === t.max_days
                ? `Apply today: expect a decision around ${fmt(t.max_days)}`
                : `Apply today: typically between ${fmt(t.min_days)} and ${fmt(t.max_days)}`}
            </div>
          </div>
          {proc.note && <p className="mt-4 text-[14px] text-[hsl(var(--blue-900))] max-w-md mx-auto">{proc.note}</p>}
          <p className="mt-3 text-[13px] text-muted-foreground max-w-lg mx-auto inline-flex items-start gap-1.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Not a guarantee: the embassy decides, and busy seasons take longer. Apply well before you travel.
              {t.source_url && (
                <> Source:{' '}
                  <a href={t.source_url} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">
                    {t.source_name}<ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>{t.updated ? `, updated ${t.updated}` : ''}.
                </>
              )}
            </span>
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

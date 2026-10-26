import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Globe2, ShieldCheck, Award, LucideIcon } from 'lucide-react';

interface CountUpProps {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

function CountUp({ to, suffix = '', prefix = '', duration = 1.6 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [started, setStarted] = useState(false);
  const [v, setV] = useState(0);
  const reduce = useReducedMotion();

  // Native IntersectionObserver — count-up only fires once the element is visible.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { rootMargin: '0px 0px -60px 0px', threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    if (reduce) { setV(to); return; }
    let raf: number;
    const start = performance.now();
    const tick = (t: number) => {
      const elapsed = (t - start) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setV(Math.round(to * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, to, duration, reduce]);

  return <span ref={ref}>{prefix}{v.toLocaleString('en-IN')}{suffix}</span>;
}

interface StatItem {
  id: string;
  Icon: LucideIcon;
  value: number;
  label: string;
  suffix: string;
}

// Only facts WeHive can back up (same as KEY_STATS in data/mock.js).
const STATS: StatItem[] = [
  { id: 'universities', Icon: Award,       value: 200, label: 'Partner universities',        suffix: '+' },
  { id: 'offices',      Icon: ShieldCheck, value: 5,   label: 'Offices in India and the US', suffix: '' },
  { id: 'countries',    Icon: Globe2,      value: 190, label: 'Countries in our visa guide', suffix: '+' },
];

export default function StatsStrip() {
  return (
    <section
      className="relative z-10 py-16 md:py-24 bg-[hsl(var(--soft-bg))] border-y border-[hsl(var(--border))]"
      data-testid="hero-stats-strip"
      aria-label="Wehive platform stats"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[12px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--blue-700))]">
            The We Hive scoreboard
          </p>
          <h2 className="mt-3 font-display font-bold text-[28px] sm:text-[36px] leading-[1.15] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
            WeHive at a glance
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {STATS.map((s, i) => {
            const Icon = s.Icon;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.3, delay: i * 0.05, ease: 'easeOut' }}
                className={`rounded-2xl bg-white border border-[hsl(var(--border))] shadow-sm p-5 sm:p-6 flex flex-col ${i === STATS.length - 1 ? 'col-span-2 sm:col-span-1' : ''}`}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] mb-4">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <div className="font-display font-bold text-[28px] sm:text-[32px] tracking-[-0.02em] leading-none text-[hsl(var(--blue-900))] tabular-nums">
                  <CountUp to={s.value} suffix={s.suffix} />
                </div>
                <div className="mt-2 text-[14px] leading-snug text-muted-foreground">
                  {s.label}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

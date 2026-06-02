import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import PropTypes from 'prop-types';
import { TrendingUp, Globe2, ShieldCheck, Clock, Sparkles, Award } from 'lucide-react';

function CountUp({ to, suffix = '', prefix = '', duration = 1.6 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const elapsed = (t - start) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setV(Math.round(to * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  const formatted = v.toLocaleString('en-IN');
  return <span ref={ref}>{prefix}{formatted}{suffix}</span>;
}
CountUp.propTypes = {
  to: PropTypes.number.isRequired,
  suffix: PropTypes.string,
  prefix: PropTypes.string,
  duration: PropTypes.number,
};

const STATS = [
  { id: 'visas',    Icon: ShieldCheck, value: 5847, label: 'Visas approved this month', suffix: '+',  accent: 'from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))]' },
  { id: 'rate',     Icon: TrendingUp,  value: 99,   label: 'Success rate',               suffix: '.2%', accent: 'from-emerald-500 to-emerald-300' },
  { id: 'countries',Icon: Globe2,      value: 250,  label: 'Countries supported',        suffix: '',   accent: 'from-[hsl(var(--accent))] to-[hsl(var(--red-500))]' },
  { id: 'sla',      Icon: Clock,       value: 12,   label: 'Average minutes to apply',   suffix: 'm',  accent: 'from-amber-500 to-amber-300' },
  { id: 'happy',    Icon: Award,       value: 92,   label: 'Net promoter score',         suffix: '',   accent: 'from-fuchsia-500 to-pink-300' },
];

export default function StatsStrip() {
  return (
    <section
      className="relative -mt-12 sm:-mt-16 z-10 pb-10"
      data-testid="hero-stats-strip"
      aria-label="Wehive platform stats"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="rounded-[28px] glass-tint-navy aurora-grain p-5 sm:p-7 relative overflow-hidden">
          <div className="flex items-center gap-2 justify-center mb-5">
            <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
            <span className="text-[11px] uppercase tracking-[0.22em] font-bold text-[hsl(var(--blue-900))]/65">
              The We Hive scoreboard · live
            </span>
            <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-5">
            {STATS.map((s, i) => {
              const Icon = s.Icon;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="text-center sm:text-left relative"
                >
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${s.accent} text-white shadow-[0_8px_22px_-8px_rgba(10,44,138,0.4)] mb-2`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="font-display font-extrabold text-[26px] sm:text-[30px] tracking-[-0.03em] leading-none text-[hsl(var(--blue-900))]">
                    <CountUp to={s.value} suffix={s.suffix} />
                  </div>
                  <div className="mt-1 text-[11.5px] leading-snug text-[hsl(var(--blue-900))]/65 font-bold">
                    {s.label}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

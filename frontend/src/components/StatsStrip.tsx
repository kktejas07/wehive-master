import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { TrendingUp, Globe2, ShieldCheck, Clock, Sparkles, Award, LucideIcon } from 'lucide-react';

const FLOATING_FLAGS = [
  { flag: '🇺🇸', name: 'USA', top: '8%', left: '5%', delay: 0 },
  { flag: '🇬🇧', name: 'UK', top: '15%', right: '8%', delay: 0.5 },
  { flag: '🇦🇺', name: 'Australia', bottom: '12%', left: '10%', delay: 1 },
  { flag: '🇯🇵', name: 'Japan', bottom: '20%', right: '5%', delay: 1.5 },
  { flag: '🇨🇦', name: 'Canada', top: '30%', left: '2%', delay: 2 },
  { flag: '🇩🇪', name: 'Germany', top: '40%', right: '3%', delay: 2.5 },
  { flag: '🇸🇬', name: 'Singapore', bottom: '8%', left: '25%', delay: 3 },
  { flag: '🇫🇷', name: 'France', top: '5%', right: '20%', delay: 0.8 },
  { flag: '🇮🇳', name: 'India', bottom: '25%', right: '15%', delay: 1.2 },
  { flag: '🇦🇪', name: 'UAE', top: '25%', left: '8%', delay: 2.2 },
];

function FloatingFlagBadge({ flag, name, delay, style }: { flag: string; name: string; delay: number; style: React.CSSProperties }) {
  return (
    <motion.div
      className="absolute z-20 hidden lg:flex"
      style={style}
      initial={{ opacity: 0, scale: 0, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, type: 'spring', damping: 15 }}
      whileHover={{ scale: 1.15, y: -5, z: 50 }}
      title={name}
    >
      <div className="relative flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1.5 shadow-lg">
        <span className="text-xl">{flag}</span>
        <span className="text-[10px] font-bold text-[hsl(var(--blue-900))]">{name}</span>
        <span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"
        />
      </div>
    </motion.div>
  );
}

interface CountUpProps {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

function CountUp({ to, suffix = '', prefix = '', duration = 1.6 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!inView) return;
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
  }, [inView, to, duration]);

  const formatted = v.toLocaleString('en-IN');
  return <span ref={ref}>{prefix}{formatted}{suffix}</span>;
}

interface StatItem {
  id: string;
  Icon: LucideIcon;
  value: number;
  label: string;
  suffix: string;
  accent: string;
}

const STATS: StatItem[] = [
  { id: 'visas',    Icon: ShieldCheck, value: 5847, label: 'Visas approved this month', suffix: '+',  accent: 'from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))]' },
  { id: 'rate',     Icon: TrendingUp,  value: 99,   label: 'Success rate',               suffix: '.2%', accent: 'from-emerald-500 to-emerald-300' },
  { id: 'countries',Icon: Globe2,      value: 250,  label: 'Countries supported',        suffix: '',   accent: 'from-[hsl(var(--accent))] to-[hsl(var(--red-500))]' },
  { id: 'sla',      Icon: Clock,       value: 12,   label: 'Average minutes to apply',   suffix: 'm',  accent: 'from-amber-500 to-amber-300' },
  { id: 'happy',    Icon: Award,       value: 92,   label: 'Net promoter score',         suffix: '',   accent: 'from-fuchsia-500 to-pink-300' },
];

export default function StatsStrip() {
  return (
    <section
      className="relative z-10 pt-8 pb-10 bg-white overflow-hidden"
      data-testid="hero-stats-strip"
      aria-label="Wehive platform stats"
    >
      {FLOATING_FLAGS.map((f, i) => {
        const style: React.CSSProperties = {};
        if (f.top) style.top = f.top;
        if (f.bottom) style.bottom = f.bottom;
        if (f.left) style.left = f.left;
        if (f.right) style.right = f.right;
        return <FloatingFlagBadge key={i} {...f} style={style} />;
      })}

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="rounded-[28px] glass-tint-navy aurora-grain p-5 sm:p-7 relative">
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
                  className="flex flex-col items-center text-center relative"
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

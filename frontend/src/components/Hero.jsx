import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { animate, motion, useReducedMotion } from 'framer-motion';
import FilterBar, { DEFAULT_FILTERS } from './FilterBar';
import { COUNTRIES, BRAND, KEY_STATS } from '../data/mock';
import { useI18n } from '../context/I18nContext';
import HeroSearchLive from './HeroSearchLive';
import TextFlipAnimation from './ui/TextFlipAnimation';

const EASE = [0.22, 1, 0.36, 1];

function TrustPill() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[hsl(var(--border))] shadow-sm px-3.5 py-1.5 text-[13px]">
      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
      <span className="text-[hsl(var(--blue-900))] font-semibold">{KEY_STATS.universities} partner universities</span>
      <span className="text-muted-foreground" aria-hidden="true">·</span>
      <span className="text-muted-foreground">{KEY_STATS.offices} offices in India &amp; the US</span>
    </div>
  );
}

function CountrySuggestions({ items, label }) {
  return (
    <div className="mt-6">
      <div className="text-[12px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-3 text-center lg:text-left">
        {label}
      </div>
      <div className="flex flex-wrap justify-center lg:justify-start gap-2">
        {items.map((c) => (
          <Link
            key={c.id}
            to={`/visa/${c.id}`}
            className="group inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white border border-[hsl(var(--border))] hover:border-[hsl(var(--blue-700))]/40 px-4 py-2 text-[14px] font-semibold text-[hsl(var(--blue-900))] hover:text-[hsl(var(--blue-700))] transition-colors duration-200"
          >
            <span className="text-base leading-none">{c.flag}</span>
            <span>{c.name}</span>
            <span className="text-muted-foreground group-hover:text-[hsl(var(--blue-700))] transition-colors" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Orbit visual adapted from the MotionSites "Network Hero" prompt: concentric
// rings rotate slowly, destination flags ride on them (kept upright), and the
// centre counts up to the headline visa figure. Framer-motion honours the
// app-wide <MotionConfig reducedMotion="user">, so it holds still when asked.
const RINGS = [
  { size: 42, duration: 30, dir: -1 },
  { size: 60, duration: 40, dir: 1 },
  { size: 80, duration: 50, dir: 1 },
  { size: 100, duration: 60, dir: -1 },
];
// [ring index, angle in degrees] for each orbiting flag
const SLOTS = [[1, 60], [1, 200], [1, 310], [2, 130], [2, 20], [3, 30], [3, 100], [3, 220], [3, 320]];

function CountUp({ to }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) { setN(to); return undefined; }
    const c = animate(0, to, { duration: 2, delay: 0.6, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [to, reduce]);
  return n.toLocaleString('en-IN');
}

function Orbits({ flags }) {
  const universities = parseInt(KEY_STATS.universities.replace(/\D/g, ''), 10);
  return (
    <motion.div
      className="relative mx-auto aspect-square w-full max-w-[420px] xl:max-w-[580px]"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, delay: 0.2, ease: EASE }}
      aria-hidden="true"
    >
      {RINGS.map((ring, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full border ${i % 2 ? 'border-[hsl(var(--red-500))]/20 border-dashed' : 'border-[hsl(var(--blue-700))]/20'}`}
          style={{ width: `${ring.size}%`, height: `${ring.size}%`, left: `${(100 - ring.size) / 2}%`, top: `${(100 - ring.size) / 2}%` }}
          animate={{ rotate: 360 * ring.dir }}
          transition={{ duration: ring.duration, repeat: Infinity, ease: 'linear' }}
        >
          {SLOTS.map(([r, angle], k) => r === i && flags[k] && (
            <motion.span
              key={k}
              className="absolute flex h-11 w-11 xl:h-14 xl:w-14 -ml-[22px] -mt-[22px] xl:-ml-7 xl:-mt-7 items-center justify-center rounded-full bg-white border border-[hsl(var(--border))] shadow-md text-[22px] xl:text-[28px]"
              style={{
                left: `${50 + 50 * Math.cos((angle * Math.PI) / 180)}%`,
                top: `${50 + 50 * Math.sin((angle * Math.PI) / 180)}%`,
              }}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1, rotate: -360 * ring.dir }}
              transition={{
                opacity: { duration: 0.6, delay: 0.6 + k * 0.15 },
                scale: { duration: 0.6, delay: 0.6 + k * 0.15, ease: EASE },
                rotate: { duration: ring.duration, repeat: Infinity, ease: 'linear' },
              }}
              title={flags[k].name}
            >
              {flags[k].flag}
            </motion.span>
          ))}
        </motion.div>
      ))}

      {/* Centre counter (does not rotate) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-[34%] w-[34%] flex-col items-center justify-center rounded-full bg-white text-center shadow-[0_20px_50px_-20px_rgba(1,28,181,0.55),0_0_0_8px_rgba(1,28,181,0.05),0_0_0_16px_rgba(225,6,0,0.04)] border border-transparent [background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(135deg,#011CB5,#E10600)_border-box]">
        <span className="font-display font-bold text-[26px] xl:text-[36px] leading-none tracking-[-0.02em] text-gradient-navy tabular-nums">
          <CountUp to={universities} />+
        </span>
        <span className="mt-1.5 text-[12px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--red-500))]">Partner universities</span>
      </div>
    </motion.div>
  );
}

export default function Hero({ filters, onFilters }) {
  const [query, setQuery] = useState('');
  const { t } = useI18n();
  const popular = COUNTRIES.filter((c) => c.popular);
  const top = popular.slice(0, 6);

  const f = filters || DEFAULT_FILTERS;
  const setF = onFilters || (() => {});

  return (
    <section className="relative z-30 pt-28 pb-14 sm:pt-36 sm:pb-20 overflow-visible bg-white">
      {/* Mesh backdrop: navy and red glows over a faint dot grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_85%_35%,rgba(31,69,166,0.16),transparent_70%),radial-gradient(ellipse_45%_45%_at_5%_90%,rgba(225,6,0,0.10),transparent_70%),linear-gradient(180deg,#FFFFFF_0%,hsl(var(--blue-50))_100%)]" />
        <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(1,28,181,0.12)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_70%_at_70%_40%,black,transparent)]" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,580px)]">
          <div className="text-center lg:text-left">
            <motion.div
              className="flex justify-center lg:justify-start mb-6"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <TrustPill />
            </motion.div>

            <motion.h1
              data-testid="hero-heading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05, ease: EASE }}
              className="font-display font-bold text-[36px] leading-[1.1] sm:text-[48px] lg:text-[56px] lg:leading-[1.05] tracking-[-0.02em] text-[hsl(var(--blue-900))] text-balance"
            >
              Global visa,{' '}
              <TextFlipAnimation
                words={['sorted.', 'fast.', 'easy.', 'done.']}
                className="text-gradient-red pb-1"
                interval={2500}
              />
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
              className="mx-auto lg:mx-0 max-w-xl mt-5 text-[16px] sm:text-[18px] leading-relaxed text-muted-foreground"
            >
              {t('hero.sub')}
            </motion.p>

            <motion.div
              className="mt-8 relative z-30"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' }}
            >
              <HeroSearchLive query={query} setQuery={setQuery} />
              {!query && <CountrySuggestions items={top} label={t('hero.suggestions')} />}
            </motion.div>

            <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-[14px] text-muted-foreground">
              <span>Prefer to talk?</span>
              <a
                href={`tel:${BRAND.phoneRaw}`}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-2 font-semibold text-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-800))] hover:underline underline-offset-4 transition-colors"
              >
                <Phone className="w-4 h-4 text-[hsl(var(--blue-700))]" />
                {BRAND.phone}
              </a>
            </div>
          </div>

          <div className="hidden lg:block">
            <Orbits flags={popular.slice(0, SLOTS.length)} />
          </div>
        </div>

        <motion.div
          className="mt-12"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25, ease: 'easeOut' }}
        >
          <FilterBar value={f} onChange={setF} />
        </motion.div>
      </div>
    </section>
  );
}

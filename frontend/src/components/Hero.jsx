import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import FilterBar, { DEFAULT_FILTERS } from './FilterBar';
import { COUNTRIES, BRAND, KEY_STATS } from '../data/mock';
import { useI18n } from '../context/I18nContext';
import HeroSearchLive from './HeroSearchLive';
import TextFlipAnimation from './ui/TextFlipAnimation';

const EASE = [0.22, 1, 0.36, 1];

// Cinematic background adapted from the MotionSites "Wanderful Hero" prompt.
// Override with a self-hosted file via REACT_APP_HERO_VIDEO_URL.
const HERO_VIDEO =
  process.env.REACT_APP_HERO_VIDEO_URL ||
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260510_060007_60275ce7-030c-4668-a160-8f364ec537d3.mp4';

// The clip is ~10 MB: skip it on phones, data-saver and reduced motion.
function useHeroVideo(reduce) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    const saveData = navigator.connection?.saveData;
    if (!reduce && !saveData && window.matchMedia('(min-width: 768px)').matches) setSrc(HERO_VIDEO);
  }, [reduce]);
  return src;
}

function HeroBackdrop() {
  const reduce = useReducedMotion();
  const src = useHeroVideo(reduce);
  // Mouse parallax: up to ±20px, eased with a spring.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 40, damping: 20 });
  const y = useSpring(my, { stiffness: 40, damping: 20 });
  useEffect(() => {
    if (reduce || !src) return undefined;
    const onMove = (e) => {
      mx.set(((e.clientX - window.innerWidth / 2) / (window.innerWidth / 2)) * 20);
      my.set(((e.clientY - window.innerHeight / 2) / (window.innerHeight / 2)) * 20);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [reduce, src, mx, my]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[hsl(var(--blue-800))]" aria-hidden="true">
      {src && (
        <motion.video
          src={src}
          autoPlay
          muted
          loop
          playsInline
          onLoadedMetadata={(e) => { e.currentTarget.playbackRate = 1.25; }}
          style={{ x, y }}
          className="absolute inset-0 h-full w-full object-cover scale-[1.08] origin-center"
        />
      )}
      {/* Ink scrim keeps white text above 4.5:1 on any frame */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--blue-900))]/70 via-[hsl(var(--blue-900))]/55 to-[hsl(var(--blue-900))]/85" />
    </div>
  );
}

function TrustPill() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm px-3.5 py-1.5 text-[13px]">
      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
      <span className="text-white font-semibold">{KEY_STATS.visasProcessed} visas processed</span>
      <span className="text-white/60" aria-hidden="true">·</span>
      <span className="text-white/80">{KEY_STATS.approvalRate} approval</span>
    </div>
  );
}

function HeroSearch({ query, setQuery }) {
  return <HeroSearchLive query={query} setQuery={setQuery} />;
}

function CountrySuggestions({ items, label }) {
  return (
    <div className="mt-6">
      <div className="text-[12px] uppercase tracking-[0.14em] font-semibold text-white/75 mb-3 text-center">
        {label}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
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

export default function Hero({ filters, onFilters }) {
  const [query, setQuery] = useState('');
  const { t } = useI18n();
  const top = COUNTRIES.filter((c) => c.popular).slice(0, 6);

  const f = filters || DEFAULT_FILTERS;
  const setF = onFilters || (() => {});

  return (
    <section className="relative z-30 pt-32 pb-16 sm:pt-40 sm:pb-24 overflow-visible bg-[hsl(var(--blue-900))]">
      <HeroBackdrop />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          className="flex justify-center mb-6"
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
          className="text-center mx-auto max-w-4xl font-display font-bold text-[36px] leading-[1.1] sm:text-[48px] lg:text-[56px] lg:leading-[1.05] tracking-[-0.02em] text-white text-balance"
        >
          Global visa,{' '}
          <TextFlipAnimation
            words={['sorted.', 'fast.', 'easy.', 'done.']}
            className="text-[#FF9AAF]"
            interval={2500}
          />
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
          className="text-center mx-auto max-w-2xl mt-5 text-[16px] sm:text-[18px] leading-relaxed text-white/80"
        >
          {t('hero.sub')}
        </motion.p>

        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' }}
        >
          <FilterBar value={f} onChange={setF} />
        </motion.div>

        <motion.div
          className="mt-8 mx-auto max-w-3xl relative z-30"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2, ease: 'easeOut' }}
        >
          <HeroSearch query={query} setQuery={setQuery} />
          {!query && (
            <CountrySuggestions
              items={top}
              label={t('hero.suggestions')}
            />
          )}
        </motion.div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[14px] text-white/75">
          <span>Prefer to talk?</span>
          <a
            href={`tel:${BRAND.phoneRaw}`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-2 font-semibold text-white hover:underline underline-offset-4 transition-colors"
          >
            <Phone className="w-4 h-4" />
            {BRAND.phone}
          </a>
        </div>
      </div>
    </section>
  );
}

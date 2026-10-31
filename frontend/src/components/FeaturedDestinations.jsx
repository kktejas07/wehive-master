import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, GraduationCap, Pause, Play } from 'lucide-react';
import Reveal from './Reveal';

const DESTINATIONS = [
  {
    id: 'us',
    name: 'United States',
    flag: '🇺🇸',
    tagline: 'Ivy League & beyond',
    universities: '4,000+',
    topExams: 'GRE, TOEFL, SAT',
    avgTuition: '$20,000–$55,000',
    intake: 'Fall & Spring',
    img: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f04?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'gb',
    name: 'United Kingdom',
    flag: '🇬🇧',
    tagline: 'Oxford, Cambridge & Russell Group',
    universities: '160+',
    topExams: 'IELTS, GMAT',
    avgTuition: '£12,000–£38,000',
    intake: 'Sep & Jan',
    img: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'ca',
    name: 'Canada',
    flag: '🇨🇦',
    tagline: 'Study, work & settle',
    universities: '100+',
    topExams: 'IELTS, GRE',
    avgTuition: 'CA$15,000–$35,000',
    intake: 'Sep, Jan & May',
    img: 'https://images.unsplash.com/photo-1517935706615-2717063c2225?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'au',
    name: 'Australia',
    flag: '🇦🇺',
    tagline: 'Group of Eight & work rights',
    universities: '43+',
    topExams: 'IELTS, PTE',
    avgTuition: 'AU$20,000–$45,000',
    intake: 'Feb & Jul',
    img: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'de',
    name: 'Germany',
    flag: '🇩🇪',
    tagline: 'Tuition-free public universities',
    universities: '400+',
    topExams: 'IELTS, TestDaF',
    avgTuition: '€0–€1,500/sem',
    intake: 'Oct & Apr',
    img: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'ie',
    name: 'Ireland',
    flag: '🇮🇪',
    tagline: 'Tech hub of Europe',
    universities: '30+',
    topExams: 'IELTS, Duolingo',
    avgTuition: '€10,000–€25,000',
    intake: 'Sep & Jan',
    img: 'https://images.unsplash.com/photo-1590089415225-401ed6f9db8e?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'nz',
    name: 'New Zealand',
    flag: '🇳🇿',
    tagline: 'Quality education & lifestyle',
    universities: '8',
    topExams: 'IELTS, TOEFL',
    avgTuition: 'NZ$22,000–$32,000',
    intake: 'Feb & Jul',
    img: 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'fr',
    name: 'France',
    flag: '🇫🇷',
    tagline: 'Grandes Écoles & affordable fees',
    universities: '250+',
    topExams: 'IELTS, TCF',
    avgTuition: '€2,770–€16,000',
    intake: 'Sep & Jan',
    img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=85',
  },
];

const N = DESTINATIONS.length;
const INTERVAL = 4000;

export default function FeaturedDestinations() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const reduce = useReducedMotion();
  const touchStart = useRef(0);

  const next = useCallback(() => setActive(i => (i + 1) % N), []);
  const prev = useCallback(() => setActive(i => (i - 1 + N) % N), []);

  useEffect(() => {
    if (paused || userPaused || reduce) return;
    const id = setInterval(next, INTERVAL);
    return () => clearInterval(id);
  }, [paused, userPaused, reduce, next]);

  const d = DESTINATIONS[active];

  return (
    <section
      className="relative py-16 md:py-24 bg-[hsl(var(--soft-bg))]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[hsl(var(--border))] shadow-sm px-3.5 py-1.5 text-[13px] mb-5">
            <GraduationCap className="w-4 h-4 text-[hsl(var(--blue-700))]" />
            <span className="font-semibold text-[hsl(var(--blue-900))]">Featured Destinations & Offers</span>
          </div>
          <h2 className="text-[28px] sm:text-[36px] leading-[1.15] font-display font-bold tracking-[-0.02em] text-[hsl(var(--blue-900))]">
            Top Study Destinations
          </h2>
          <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground max-w-2xl mx-auto">
            Explore the world&rsquo;s best countries for higher education. We Hive helps you with visas, university shortlisting, and end-to-end application support.
          </p>
        </Reveal>

        <div className="relative rounded-2xl overflow-hidden bg-white border border-[hsl(var(--border))] shadow-sm">
          {/* Main card */}
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[420px]">
            {/* Image side */}
            <div className="relative aspect-[16/10] lg:aspect-auto overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={d.id}
                  src={d.img}
                  alt={d.name}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/10 lg:to-white/40" />
              <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[13px] font-semibold text-[hsl(var(--blue-900))] shadow-sm">
                <span className="text-[18px]">{d.flag}</span>
                {d.name}
              </div>
            </div>

            {/* Info side */}
            <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="text-[12px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--blue-700))]">
                    Study in {d.name}
                  </div>
                  <h3 className="mt-2 text-[24px] sm:text-[28px] font-display font-bold tracking-[-0.02em] text-[hsl(var(--blue-900))]">
                    {d.tagline}
                  </h3>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <InfoTile label="Universities" value={d.universities} />
                    <InfoTile label="Key Exams" value={d.topExams} />
                    <InfoTile label="Avg. Tuition/yr" value={d.avgTuition} />
                    <InfoTile label="Intakes" value={d.intake} />
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      to={`/visa/${d.id}`}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white px-5 py-2.5 text-[14px] font-semibold transition-colors"
                    >
                      Explore visa options
                    </Link>
                    <Link
                      to={`/destinations/${d.id}`}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white hover:bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))] px-5 py-2.5 text-[14px] font-semibold transition-colors"
                    >
                      View universities
                    </Link>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Navigation arrows */}
          <button
            type="button"
            onClick={prev}
            aria-label="Previous destination"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 hover:bg-white text-[hsl(var(--blue-900))] shadow-md transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next destination"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 hover:bg-white text-[hsl(var(--blue-900))] shadow-md transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Thumbnails + controls */}
        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setUserPaused(p => !p)}
            aria-label={userPaused ? 'Resume auto-rotation' : 'Pause auto-rotation'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white hover:bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-700))] transition-colors"
          >
            {userPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <div className="flex gap-2 overflow-x-auto py-1 px-1 scrollbar-hide">
            {DESTINATIONS.map((dest, i) => (
              <button
                key={dest.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Go to ${dest.name}`}
                aria-pressed={active === i}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-all duration-200 ${
                  active === i
                    ? 'bg-[hsl(var(--blue-700))] text-white shadow-sm'
                    : 'bg-white border border-[hsl(var(--border))] text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-300))]'
                }`}
              >
                <span>{dest.flag}</span>
                <span className="hidden sm:inline">{dest.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        {!userPaused && !reduce && (
          <div className="mt-4 mx-auto max-w-md h-1 rounded-full bg-[hsl(var(--border))] overflow-hidden">
            <motion.div
              key={`${active}-${paused}`}
              initial={{ width: '0%' }}
              animate={{ width: paused ? undefined : '100%' }}
              transition={{ duration: INTERVAL / 1000, ease: 'linear' }}
              className="h-full rounded-full bg-[hsl(var(--blue-700))]"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl bg-[hsl(var(--soft-bg))] border border-[hsl(var(--border))] p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-[14px] font-semibold text-[hsl(var(--blue-900))] truncate">
        {value}
      </div>
    </div>
  );
}

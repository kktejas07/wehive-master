import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { landmarkFor } from '../lib/landmarks';

const SCHENGEN_COUNTRIES = [
  { id: 'at', name: 'AUSTRIA' },
  { id: 'be', name: 'BELGIUM' },
  { id: 'bg', name: 'BULGARIA' },
  { id: 'hr', name: 'CROATIA' },
  { id: 'cz', name: 'CZECH REP.' },
  { id: 'dk', name: 'DENMARK' },
  { id: 'ee', name: 'ESTONIA' },
  { id: 'fi', name: 'FINLAND' },
  { id: 'fr', name: 'FRANCE' },
  { id: 'de', name: 'GERMANY' },
  { id: 'gr', name: 'GREECE' },
  { id: 'hu', name: 'HUNGARY' },
  { id: 'is', name: 'ICELAND' },
  { id: 'it', name: 'ITALY' },
  { id: 'lv', name: 'LATVIA' },
  { id: 'li', name: 'LIECHTENSTEIN' },
  { id: 'lt', name: 'LITHUANIA' },
  { id: 'lu', name: 'LUXEMBOURG' },
  { id: 'mt', name: 'MALTA' },
  { id: 'nl', name: 'NETHERLANDS' },
  { id: 'no', name: 'NORWAY' },
  { id: 'pl', name: 'POLAND' },
  { id: 'pt', name: 'PORTUGAL' },
  { id: 'ro', name: 'ROMANIA' },
  { id: 'sk', name: 'SLOVAKIA' },
  { id: 'si', name: 'SLOVENIA' },
  { id: 'es', name: 'SPAIN' },
  { id: 'se', name: 'SWEDEN' },
  { id: 'ch', name: 'SWITZERLAND' },
];

const N = SCHENGEN_COUNTRIES.length;
const VISIBLE = 3;

const SLOT_DATA = [
  { x: 0,   rotY: 0,  scale: 1,    opacity: 1,    z: 20 },
  { x: 195, rotY: 18, scale: 0.87, opacity: 1,    z: 18 },
  { x: 355, rotY: 28, scale: 0.74, opacity: 0.95, z: 16 },
  { x: 470, rotY: 36, scale: 0.62, opacity: 0.85, z: 14 },
];

function getCardState(offset) {
  const abs = Math.abs(offset);
  const sign = Math.sign(offset) || 1;
  if (abs > VISIBLE) {
    return { x: sign * 700, rotateY: -sign * 40, scale: 0, opacity: 0, zIndex: 0 };
  }
  const d = SLOT_DATA[abs];
  return {
    x: sign * d.x,
    rotateY: -sign * d.rotY,
    scale: d.scale,
    opacity: d.opacity,
    zIndex: d.z,
  };
}

export default function SchengenCarousel() {
  const [active, setActive] = useState(8); // start at France
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActive(prev => (prev + 1) % N), 3500);
    return () => clearInterval(id);
  }, [paused]);

  const go = (dir) => setActive(prev => (prev + dir + N) % N);

  return (
    <section className="relative py-16 sm:py-24 bg-white overflow-hidden">
      {/* Header */}
      <div className="text-center px-4 mb-10 sm:mb-14">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-dashed border-gray-200 bg-white shadow-sm mb-6">
          <span className="text-[11px] tracking-[0.22em] font-bold text-[hsl(var(--blue-700))]">FR</span>
        </div>
        <h2 className="text-[30px] sm:text-[44px] lg:text-[52px] font-display font-extrabold tracking-[-0.03em] text-[hsl(var(--blue-900))]">
          One visa to access 29 countries
        </h2>
        <p className="mt-3 text-[15px] sm:text-[16px] text-[hsl(var(--blue-900))]/60 max-w-lg mx-auto leading-relaxed">
          Enter 29 countries on one Schengen visa.<br />
          See countries closest to France that you can cover together!
        </p>
      </div>

      {/* Carousel stage */}
      <div
        className="relative mx-auto"
        style={{ height: 420, perspective: '1400px' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {SCHENGEN_COUNTRIES.map((country, idx) => {
            let offset = idx - active;
            if (offset > N / 2) offset -= N;
            if (offset < -N / 2) offset += N;

            const { x, rotateY, scale, opacity, zIndex } = getCardState(offset);
            const isClickable = Math.abs(offset) > 0 && Math.abs(offset) <= VISIBLE;

            return (
              <motion.div
                key={country.id}
                className="absolute"
                animate={{ x, rotateY, scale, opacity }}
                transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                style={{ zIndex, cursor: isClickable ? 'pointer' : 'default' }}
                onClick={() => isClickable && setActive(idx)}
              >
                <div
                  className="relative rounded-2xl overflow-hidden shadow-lg"
                  style={{ width: 210, height: 315 }}
                >
                  <img
                    src={landmarkFor(country) || ''}
                    alt={country.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-5 left-0 right-0 text-center">
                    <span className="text-[11px] tracking-[0.22em] font-bold text-white">
                      {country.name}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Nav arrows */}
        <button
          onClick={() => go(-1)}
          className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white shadow-md border border-black/10 flex items-center justify-center hover:bg-gray-50 transition"
          aria-label="Previous country"
        >
          <ChevronLeft className="w-5 h-5 text-[hsl(var(--blue-900))]" />
        </button>
        <button
          onClick={() => go(1)}
          className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white shadow-md border border-black/10 flex items-center justify-center hover:bg-gray-50 transition"
          aria-label="Next country"
        >
          <ChevronRight className="w-5 h-5 text-[hsl(var(--blue-900))]" />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="mt-8 flex justify-center gap-1.5 flex-wrap px-8">
        {SCHENGEN_COUNTRIES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActive(idx)}
            className={`transition-all duration-300 rounded-full ${
              idx === active
                ? 'w-5 h-2 bg-[hsl(var(--blue-700))]'
                : 'w-2 h-2 bg-[hsl(var(--blue-900))]/20 hover:bg-[hsl(var(--blue-900))]/40'
            }`}
            aria-label={SCHENGEN_COUNTRIES[idx].name}
          />
        ))}
      </div>

      <p className="mt-4 text-center text-[13px] text-[hsl(var(--blue-900))]/45 font-medium">
        {SCHENGEN_COUNTRIES[active].name.charAt(0) + SCHENGEN_COUNTRIES[active].name.slice(1).toLowerCase().replace('.', '')} — {active + 1} of {N} Schengen countries
      </p>
    </section>
  );
}

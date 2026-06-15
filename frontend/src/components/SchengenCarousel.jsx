import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SCHENGEN_COUNTRIES = [
  { id: 'at', name: 'AUSTRIA', img: 'https://images.unsplash.com/photo-1580137197581-df2bb346a786?w=400&q=80' },
  { id: 'be', name: 'BELGIUM', img: 'https://images.unsplash.com/photo-1559561853-08451507a579?w=400&q=80' },
  { id: 'bg', name: 'BULGARIA', img: 'https://images.unsplash.com/photo-1590477331040-6eaa1f4e1697?w=400&q=80' },
  { id: 'hr', name: 'CROATIA', img: 'https://images.unsplash.com/photo-1555990793-4cfbe6d2e7b4?w=400&q=80' },
  { id: 'cz', name: 'CZECH REP.', img: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=400&q=80' },
  { id: 'dk', name: 'DENMARK', img: 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=400&q=80' },
  { id: 'ee', name: 'ESTONIA', img: 'https://images.unsplash.com/photo-1558449028-b53a39d100fc?w=400&q=80' },
  { id: 'fi', name: 'FINLAND', img: 'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=400&q=80' },
  { id: 'fr', name: 'FRANCE', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=80' },
  { id: 'de', name: 'GERMANY', img: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&q=80' },
  { id: 'gr', name: 'GREECE', img: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&q=80' },
  { id: 'hu', name: 'HUNGARY', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
  { id: 'is', name: 'ICELAND', img: 'https://images.unsplash.com/photo-1529963183134-61a90db47eaf?w=400&q=80' },
  { id: 'it', name: 'ITALY', img: 'https://images.unsplash.com/photo-1525874684015-58379d421a52?w=400&q=80' },
  { id: 'lv', name: 'LATVIA', img: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=400&q=80' },
  { id: 'li', name: 'LIECHTENSTEIN', img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80' },
  { id: 'lt', name: 'LITHUANIA', img: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=400&q=80' },
  { id: 'lu', name: 'LUXEMBOURG', img: 'https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?w=400&q=80' },
  { id: 'mt', name: 'MALTA', img: 'https://images.unsplash.com/photo-1548862944-b6ece99de0a7?w=400&q=80' },
  { id: 'nl', name: 'NETHERLANDS', img: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5702?w=400&q=80' },
  { id: 'no', name: 'NORWAY', img: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&q=80' },
  { id: 'pl', name: 'POLAND', img: 'https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=400&q=80' },
  { id: 'pt', name: 'PORTUGAL', img: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&q=80' },
  { id: 'ro', name: 'ROMANIA', img: 'https://images.unsplash.com/photo-1594131431372-eb0db4c15af2?w=400&q=80' },
  { id: 'sk', name: 'SLOVAKIA', img: 'https://images.unsplash.com/photo-1576803226498-59a96f8a0b71?w=400&q=80' },
  { id: 'si', name: 'SLOVENIA', img: 'https://images.unsplash.com/photo-1566127992631-137a642a90f4?w=400&q=80' },
  { id: 'es', name: 'SPAIN', img: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=400&q=80' },
  { id: 'se', name: 'SWEDEN', img: 'https://images.unsplash.com/photo-1508189860359-777d945909ef?w=400&q=80' },
  { id: 'ch', name: 'SWITZERLAND', img: 'https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=400&q=80' },
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
                    src={country.img}
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

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plane, Eye } from 'lucide-react';
import { landmarkFor } from '../lib/landmarks';
import { trackCountrySelect, trackEvent, EVENT_NAMES, EVENT_CATEGORIES } from '../lib/analytics';

// Assets for Airplane Window & World background
const PORTAL_BG = 'https://soft-zoom-63098134.figma.site/_assets/v11/4f01f62fc1cd17604f3668ae151c0cdeb0a61f93.png';

const SCHENGEN_COUNTRIES = [
  { id: 'at', name: 'AUSTRIA', img: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=1200&q=85' },
  { id: 'be', name: 'BELGIUM', img: 'https://images.unsplash.com/photo-1559113202-c916b8e44373?auto=format&fit=crop&w=1200&q=85' },
  { id: 'bg', name: 'BULGARIA', img: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=1200&q=85' },
  { id: 'hr', name: 'CROATIA', img: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=85' },
  { id: 'cz', name: 'CZECH REP.', img: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=1200&q=85' },
  { id: 'dk', name: 'DENMARK', img: 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&w=1200&q=85' },
  { id: 'ee', name: 'ESTONIA', img: 'https://images.unsplash.com/photo-1549877452-9c387954fbc2?auto=format&fit=crop&w=1200&q=85' },
  { id: 'fi', name: 'FINLAND', img: 'https://images.unsplash.com/photo-1551817958-d9d86fb29431?auto=format&fit=crop&w=1200&q=85' },
  { id: 'fr', name: 'FRANCE', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=85' },
  { id: 'de', name: 'GERMANY', img: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=85' },
  { id: 'gr', name: 'GREECE', img: 'https://images.unsplash.com/photo-1469796466635-455ede028aca?auto=format&fit=crop&w=1200&q=85' },
  { id: 'hu', name: 'HUNGARY', img: 'https://images.unsplash.com/photo-1541343672885-9be56236302a?auto=format&fit=crop&w=1200&q=85' },
  { id: 'is', name: 'ICELAND', img: 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=1200&q=85' },
  { id: 'it', name: 'ITALY', img: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=85' },
  { id: 'lv', name: 'LATVIA', img: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=85' },
  { id: 'li', name: 'LIECHTENSTEIN', img: 'https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?auto=format&fit=crop&w=1200&q=85' },
  { id: 'lt', name: 'LITHUANIA', img: 'https://images.unsplash.com/photo-1569668623727-46e382d56a2a?auto=format&fit=crop&w=1200&q=85' },
  { id: 'lu', name: 'LUXEMBOURG', img: 'https://images.unsplash.com/photo-1579600161204-acd0f5a72d47?auto=format&fit=crop&w=1200&q=85' },
  { id: 'mt', name: 'MALTA', img: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=85' },
  { id: 'nl', name: 'NETHERLANDS', img: 'https://images.unsplash.com/photo-1534351590666-13e3e96c5017?auto=format&fit=crop&w=1200&q=85' },
  { id: 'no', name: 'NORWAY', img: 'https://images.unsplash.com/photo-1502790671504-542ad42d5189?auto=format&fit=crop&w=1200&q=85' },
  { id: 'pl', name: 'POLAND', img: 'https://images.unsplash.com/photo-1519197924294-4ba991a11128?auto=format&fit=crop&w=1200&q=85' },
  { id: 'pt', name: 'PORTUGAL', img: 'https://images.unsplash.com/photo-1518733057094-95b53143d2a7?auto=format&fit=crop&w=1200&q=85' },
  { id: 'ro', name: 'ROMANIA', img: 'https://images.unsplash.com/photo-1584646098378-0874589d76b1?auto=format&fit=crop&w=1200&q=85' },
  { id: 'sk', name: 'SLOVAKIA', img: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=85' },
  { id: 'si', name: 'SLOVENIA', img: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=85' },
  { id: 'es', name: 'SPAIN', img: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=85' },
  { id: 'se', name: 'SWEDEN', img: 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?auto=format&fit=crop&w=1200&q=85' },
  { id: 'ch', name: 'SWITZERLAND', img: 'https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?auto=format&fit=crop&w=1200&q=85' },
];

const N = SCHENGEN_COUNTRIES.length;

export default function SchengenCarousel() {
  const [active, setActive] = useState(8); // Default to France
  const [paused, setPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const touchStart = useRef(0);

  // Parallax Refs
  const windowStageRef = useRef(null);
  const portalRef = useRef(null);
  const worldRef = useRef(null);
  const rawMouse = useRef({ x: 0, y: 0 });
  const smoothMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mouse Parallax Loop within stage bounds
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!windowStageRef.current) return;
      const rect = windowStageRef.current.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) return;
      rawMouse.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
      };
    };

    window.addEventListener('mousemove', handleMouseMove);

    let animId;
    const lerp = (a, b, t) => a + (b - a) * t;

    const tick = () => {
      smoothMouse.current.x = lerp(smoothMouse.current.x, rawMouse.current.x, 0.08);
      smoothMouse.current.y = lerp(smoothMouse.current.y, rawMouse.current.y, 0.08);

      const rx = -smoothMouse.current.x;
      const ry = -smoothMouse.current.y;

      if (portalRef.current) {
        portalRef.current.style.transform = `scale(1.04) translate(${rx * 6}px, ${ry * 6}px)`;
      }
      if (worldRef.current) {
        worldRef.current.style.transform = `scale(1.08) translate(${rx * 4}px, ${ry * 4}px)`;
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Auto-slide carousel
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setActive(prev => (prev + 1) % N);
    }, 4500);
    return () => clearInterval(timer);
  }, [paused]);

  const go = (dir) => {
    setActive(prev => {
      const nextIdx = (prev + dir + N) % N;
      const targetCountry = SCHENGEN_COUNTRIES[nextIdx];
      trackCountrySelect(targetCountry.id, targetCountry.name, nextIdx, N, 'carousel_arrow');
      trackEvent(
        EVENT_NAMES.CAROUSEL_NAV,
        { direction: dir > 0 ? 'next' : 'prev', target_country: targetCountry.name },
        EVENT_CATEGORIES.CAROUSEL
      );
      return nextIdx;
    });
  };

  const handleSelectCountry = (idx) => {
    setActive(idx);
    const targetCountry = SCHENGEN_COUNTRIES[idx];
    trackCountrySelect(targetCountry.id, targetCountry.name, idx, N, 'carousel_card_click');
  };

  // Card transform math tuned for full section view
  const getCardTransform = (offset) => {
    const abs = Math.abs(offset);
    const sign = Math.sign(offset) || 1;

    const maxVisible = isMobile ? 1 : 2;

    if (abs > maxVisible) {
      return {
        x: sign * (isMobile ? 160 : 280),
        y: 45,
        rotateZ: sign * 12,
        scale: 0.5,
        opacity: 0,
        zIndex: 0,
        pointerEvents: 'none',
      };
    }

    const stepX = isMobile ? 80 : 115;
    const dropY = isMobile ? 10 : 14;
    const rotateBase = isMobile ? 2.5 : 3.5;

    const x = sign * abs * stepX;
    const y = abs === 0 ? -10 : Math.pow(abs, 1.2) * dropY + 4;
    const rotateZ = sign * abs * rotateBase;
    const scale = abs === 0 ? (isMobile ? 1.05 : 1.08) : 1 - abs * 0.1;
    const opacity = abs === 0 ? 1 : Math.max(0.5, 1 - abs * 0.22);
    const zIndex = 30 - abs;

    return {
      x,
      y,
      rotateZ,
      scale,
      opacity,
      zIndex,
      pointerEvents: 'auto',
    };
  };

  const activeCountry = SCHENGEN_COUNTRIES[active];
  const formatName = (str) =>
    str.charAt(0) + str.slice(1).toLowerCase().replace('.', '');

  return (
    <section
      ref={windowStageRef}
      className="relative w-full min-h-[640px] sm:min-h-[720px] py-14 sm:py-20 bg-[#0a0608] text-white overflow-hidden select-none flex flex-col justify-between"
    >
      {/* 1. Full-Section Country World Landscape Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div ref={worldRef} className="w-full h-full will-change-transform">
          <AnimatePresence mode="wait">
            <motion.img
              key={activeCountry.id}
              src={activeCountry.img || landmarkFor(activeCountry)}
              alt={activeCountry.name}
              className="w-full h-full object-cover"
              initial={{ opacity: 0.35, scale: 1.05 }}
              animate={{ opacity: 0.75, scale: 1 }}
              exit={{ opacity: 0.25 }}
              transition={{ duration: 0.6 }}
            />
          </AnimatePresence>
        </div>
        {/* Soft Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0608] via-black/40 to-[#0a0608]/85" />
      </div>

      {/* 2. Full-Section Airplane Window Frame Overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div
          ref={portalRef}
          className="w-full h-full will-change-transform flex items-center justify-center opacity-45 sm:opacity-55"
        >
          <img
            src={PORTAL_BG}
            alt="Airplane Window Frame"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Ambient Sky Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[420px] bg-sky-500/20 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* Section Header */}
      <div className="relative z-20 text-center max-w-4xl mx-auto px-4 mt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-sky-200 uppercase tracking-widest mb-3.5 shadow-md">
          <Plane className="w-3.5 h-3.5 text-sky-400" />
          <span>Interactive Airplane Window Portal</span>
        </div>

        <h2 className="text-[32px] sm:text-[46px] lg:text-[54px] font-extrabold tracking-[-0.03em] text-white leading-tight drop-shadow-xl">
          One visa to access 29 countries
        </h2>
        <p className="mt-3 text-[14px] sm:text-[16px] text-white/85 max-w-lg mx-auto leading-relaxed font-normal drop-shadow-md">
          Enter 29 countries on one Schengen visa.<br />
          Select a country below to explore its view from the airplane window!
        </p>
      </div>

      {/* Cards Carousel Container (Centered inside full-section airplane window) */}
      <div
        className="relative z-20 mx-auto flex items-center justify-center my-auto"
        style={{ height: isMobile ? 260 : 320, width: '100%', maxWidth: isMobile ? 320 : 540 }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          const diff = touchStart.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 40) go(diff > 0 ? 1 : -1);
        }}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {SCHENGEN_COUNTRIES.map((country, idx) => {
            let offset = idx - active;
            if (offset > N / 2) offset -= N;
            if (offset < -N / 2) offset += N;

            const { x, y, rotateZ, scale, opacity, zIndex } = getCardTransform(offset);
            const isCenter = offset === 0;
            const cardImg = country.img || landmarkFor(country);

            return (
              <motion.div
                key={country.id}
                className="absolute top-1/2 left-1/2 cursor-pointer"
                style={{
                  width: isMobile ? 125 : 165,
                  height: isMobile ? 185 : 245,
                  marginLeft: isMobile ? -62.5 : -82.5,
                  marginTop: isMobile ? -92.5 : -122.5,
                  zIndex,
                }}
                animate={{
                  x,
                  y,
                  rotate: rotateZ,
                  scale,
                  opacity,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 280,
                  damping: 26,
                  mass: 0.9,
                }}
                onClick={() => handleSelectCountry(idx)}
              >
                <div
                  className={`relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 ${
                    isCenter
                      ? 'shadow-[0_22px_50px_-10px_rgba(0,0,0,0.9),0_0_30px_rgba(56,189,248,0.6)] ring-2 ring-sky-400'
                      : 'shadow-lg opacity-90 hover:opacity-100'
                  }`}
                >
                  <img
                    src={cardImg}
                    alt={country.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

                  <div className="absolute bottom-3 sm:bottom-4 inset-x-0 text-center px-2">
                    <span className="text-[10px] sm:text-[12px] tracking-[0.22em] font-extrabold text-white drop-shadow-lg uppercase">
                      {country.name}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Nav Arrows */}
        <button
          onClick={() => go(-1)}
          className="absolute -left-3 sm:-left-12 top-1/2 -translate-y-1/2 z-40 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md border border-white/25 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all duration-200 outline-none shadow-lg"
          aria-label="Previous country"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.5]" />
        </button>

        <button
          onClick={() => go(1)}
          className="absolute -right-3 sm:-right-12 top-1/2 -translate-y-1/2 z-40 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md border border-white/25 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all duration-200 outline-none shadow-lg"
          aria-label="Next country"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.5]" />
        </button>
      </div>

      {/* Bottom Bar: Dots & Caption */}
      <div className="relative z-20 text-center pb-2">
        <div className="flex justify-center items-center gap-1.5 flex-wrap px-6 max-w-xl mx-auto mb-2.5">
          {SCHENGEN_COUNTRIES.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => handleSelectCountry(idx)}
              className={`transition-all duration-300 rounded-full outline-none ${
                idx === active
                  ? 'w-6 h-2 bg-sky-400 shadow-[0_0_12px_#38bdf8]'
                  : 'w-2 h-2 bg-white/30 hover:bg-white/60'
              }`}
              aria-label={c.name}
            />
          ))}
        </div>

        <p className="text-[13px] sm:text-[14px] text-white/85 font-medium tracking-tight flex items-center justify-center gap-1.5 drop-shadow-md">
          <Eye className="w-4 h-4 text-sky-400" />
          <span>Airplane Window View: <strong>{formatName(activeCountry.name)}</strong> ({active + 1} of {N} Schengen countries)</span>
        </p>
      </div>
    </section>
  );
}







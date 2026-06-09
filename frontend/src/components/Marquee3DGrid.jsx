import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Globe, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const COUNTRIES_3D = [
  { id: 'us', name: 'USA', flag: '🇺🇸', visa: 'Tourist/Business', processing: '3-5 days', color: '#3B82F6' },
  { id: 'uk', name: 'United Kingdom', flag: '🇬🇧', visa: 'Tourist/Student', processing: '5-10 days', color: '#8B5CF6' },
  { id: 'canada', name: 'Canada', flag: '🇨🇦', visa: 'Tourist/Student', processing: '7-14 days', color: '#EF4444' },
  { id: 'australia', name: 'Australia', flag: '🇦🇺', visa: 'Tourist/Work', processing: '5-7 days', color: '#10B981' },
  { id: 'japan', name: 'Japan', flag: '🇯🇵', visa: 'Tourist/Business', processing: '4-6 days', color: '#F59E0B' },
  { id: 'germany', name: 'Germany', flag: '🇩🇪', visa: 'Schengen', processing: '5-8 days', color: '#6366F1' },
  { id: 'france', name: 'France', flag: '🇫🇷', visa: 'Schengen', processing: '5-8 days', color: '#EC4899' },
  { id: 'uae', name: 'UAE', flag: '🇦🇪', visa: 'Tourist/Transit', processing: '2-4 days', color: '#14B8A6' },
  { id: 'singapore', name: 'Singapore', flag: '🇸🇬', visa: 'Tourist/Business', processing: '1-3 days', color: '#F97316' },
  { id: 'newzealand', name: 'New Zealand', flag: '🇳🇿', visa: 'Tourist/Student', processing: '7-12 days', color: '#06B6D4' },
  { id: 'switzerland', name: 'Switzerland', flag: '🇨🇭', visa: 'Schengen', processing: '5-7 days', color: '#84CC16' },
  { id: 'italy', name: 'Italy', flag: '🇮🇹', visa: 'Schengen', processing: '5-10 days', color: '#22C55E' },
];

function CountryCard3D({ country, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      whileHover={{
        scale: 1.05,
        rotateY: 5,
        rotateX: -5,
        z: 50,
      }}
      className="relative flex-shrink-0 w-[200px] sm:w-[240px] perspective-1000"
      style={{ perspective: '1000px' }}
    >
      <Link
        to={`/visa/${country.id}`}
        className="block rounded-2xl bg-white border border-black/8 shadow-lg overflow-hidden group"
      >
        <div
          className="h-24 flex items-center justify-center relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${country.color}15, ${country.color}05)` }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 30% 50%, ${country.color}40 0%, transparent 50%)`,
            }}
          />
          <span className="text-6xl transform group-hover:scale-110 transition-transform duration-300">
            {country.flag}
          </span>
          <div className="absolute top-3 right-3">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: country.color }}
            />
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-display font-extrabold text-[16px] text-[hsl(var(--blue-900))]">
            {country.name}
          </h3>
          <p className="text-[11px] text-[hsl(var(--blue-900))]/60 mt-1">
            {country.visa} · {country.processing}
          </p>
          <div className="mt-3 flex items-center gap-1 text-[12px] font-bold text-[hsl(var(--blue-700))] group-hover:gap-2 transition-all">
            <span>Explore</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Marquee3DGrid() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [15, 0, -15]);
  const translateY = useTransform(scrollYProgress, [0, 0.5, 1], [30, 0, -30]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1, 0.9]);

  return (
    <div className="relative py-16 sm:py-24 bg-gradient-to-b from-[hsl(var(--soft-bg))] to-white overflow-hidden">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(rgba(10,44,138,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(10,44,138,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-3">
            <Globe className="w-3.5 h-3.5" />
            Popular Destinations
          </div>
          <h2 className="font-display font-extrabold text-[28px] sm:text-[38px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
            3D Rotating Visa Countries
          </h2>
          <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60 max-w-xl mx-auto">
            Hover to interact with the 3D perspective grid
          </p>
        </motion.div>

        <div ref={containerRef} className="relative">
          <motion.div
            style={{
              rotateX,
              translateY,
              scale,
              transformPerspective: '1200px',
            }}
            className="flex flex-wrap justify-center gap-5 perspective-1000"
          >
            {COUNTRIES_3D.map((country, i) => (
              <CountryCard3D key={country.id} country={country} index={i} />
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 text-center"
        >
          <Link
            to="/universities"
            className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--blue-700))] text-white px-6 py-3 text-[14px] font-bold hover:bg-[hsl(var(--blue-800))] transition-colors"
          >
            View All Countries
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>

      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-[hsl(var(--blue-700))]/10 blur-3xl rounded-full" />
    </div>
  );
}
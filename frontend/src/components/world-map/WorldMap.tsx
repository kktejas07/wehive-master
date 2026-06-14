import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HUBS, CONNECTIONS } from './worldMapData';
import { arc } from './worldMapUtils';
import FlightRoutes from './FlightRoutes';
import MapMarker from './MapMarker';

function Plane({ from, to, delay, dur = 7 }: { from: { x: number; y: number }; to: { x: number; y: number }; delay: number; dur?: number }) {
  const { midX, midY } = useMemo(() => arc(from, to), [from.x, from.y, to.x, to.y]);
  return (
    <motion.g
      initial={{ offsetDistance: '0%' }}
      animate={{ offsetDistance: '100%' }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: 'linear' }}
      style={{ offsetPath: `path('M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}')` }}
    >
      <g transform="rotate(-30)">
        <path d="M0,-2 L4,0 L0,2 Z" fill="#3B82F6" opacity="0.9" />
        <circle r="0.3" fill="white" opacity="0.8" />
      </g>
    </motion.g>
  );
}

interface WorldMapProps {
  className?: string;
  showConnections?: boolean;
}

export default function WorldMap({ className = '', showConnections = true }: WorldMapProps) {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const pos = useCallback((id: string) => {
    const h = HUBS.find((hub) => hub.id === id);
    return h ? { x: h.x, y: h.y } : { x: 0, y: 0 };
  }, []);

  const planes = useMemo(() => {
    if (!showConnections) return [];
    return CONNECTIONS.filter((_, i) => i % 4 === 0).slice(0, 3);
  }, [showConnections]);

  return (
    <div className={`relative w-full h-full rounded-3xl overflow-hidden ${className}`}>
      {/* Deep navy background */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, #0A205A 0%, #061440 100%)' }} />

      {/* Grid overlay */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="g" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="0.06" fill="white" opacity="0.04" />
          </pattern>
        </defs>
        <rect width="100" height="50" fill="url(#g)" />
      </svg>

      {/* SVG world map background */}
      <div className="absolute inset-0 [&_svg]:w-full [&_svg]:h-full" dangerouslySetInnerHTML={{
        __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet" class="w-full h-full"><use href="/images/world-map-svg.svg#world-map" stroke="white" stroke-width="0.08" fill="none" opacity="0.15"/></svg>`
      }} />

      {/* Continent outlines overlay */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet" style={{ opacity: 0.12 }}>
        <use href="/images/world-map-svg.svg#world-map" stroke="white" strokeWidth="0.12" fill="none" />
      </svg>

      {/* Routes + Planes layer */}
      {mounted && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
          {CONNECTIONS.map(([a, b], i) => (
            <FlightRoutes key={i} from={pos(a)} to={pos(b)} active={hovered === a || hovered === b} index={i} />
          ))}
          {planes.map(([a, b], i) => (
            <Plane key={i} from={pos(a)} to={pos(b)} delay={i * 2.5} dur={6 + i * 2} />
          ))}
        </svg>
      )}

      {/* Markers with portaled tooltips */}
      <div className="absolute inset-0" style={{ zIndex: 30 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
          {mounted && HUBS.map((h) => (
            <MapMarker key={h.id} hub={h} active={hovered === h.id} onHover={setHovered} />
          ))}
        </svg>
      </div>

      {/* Legend — bottom-left */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 z-40">
        <div className="flex items-center gap-1.5 bg-[#061440]/85 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/8">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_#3B82F6]" />
          <span className="text-[10px] font-semibold text-slate-300">Active Visa Hub</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#061440]/85 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/8">
          <svg className="w-8 h-2" viewBox="0 0 24 4"><line x1="0" y1="2" x2="22" y2="2" stroke="#3B82F6" strokeWidth="0.5" strokeDasharray="2 1" opacity="0.5" /></svg>
          <span className="text-[10px] font-semibold text-slate-300">Flight Route</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#061440]/85 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/8">
          <svg className="w-3 h-3" viewBox="0 0 12 12"><path d="M0,6 L4,4 L4,8 Z" fill="#3B82F6" opacity="0.8" /></svg>
          <span className="text-[10px] font-semibold text-slate-300">Live Flight</span>
        </div>
      </div>

      {/* Status — top-right */}
      <div className="absolute top-3 right-3 flex items-center gap-3 z-40">
        <div className="flex items-center gap-1.5 bg-[#061440]/85 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/8">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#22C55E]" />
          <span className="text-[10px] font-semibold text-slate-300">Live</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#061440]/85 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/8">
          <span className="text-[10px] font-semibold text-slate-300 whitespace-nowrap">250+ Destinations</span>
        </div>
      </div>
    </div>
  );
}

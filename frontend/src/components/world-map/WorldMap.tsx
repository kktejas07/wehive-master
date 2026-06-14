import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HUBS, CONNECTIONS, NAVY } from './worldMapData';
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
  animated?: boolean;
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
    <div className={`relative w-full h-full rounded-2xl overflow-hidden bg-[#081A4E] ${className}`}>
      {/* Background gradient */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, #0A2058 0%, #06143C 100%)' }} />

      {/* Grid overlay */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="g" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="0.06" fill="white" opacity="0.05" />
          </pattern>
        </defs>
        <rect width="100" height="50" fill="url(#g)" />
      </svg>

      {/* World map continents */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
        <use href="/images/world-map-svg.svg#world" />
      </svg>

      {mounted && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
          {/* Continent outlines inline */}
          <g fill="none" stroke="white" strokeWidth="0.12" opacity="0.10" strokeLinejoin="round">
            <path d="M12,2.5 L10,4 L7,5 L5,7 L3,10 L2,13 L1.5,17 L2,20 L3,22 L4,23 L5,24 L6,24.5 L8,24 L9.5,23 L11.5,22 L13,21 L14.5,20 L16,18.5 L17.5,17 L18.5,15 L19,13 L19.5,10 L19,8 L18,5.5 L16,4 L14,3 Z"/>
            <path d="M23,3 L25,1.5 L28,1 L31,1.5 L33.5,3 L34,5 L33,7 L30.5,8 L28,8 L25.5,7 L24,5 Z"/>
            <path d="M14,24.5 L15,25.5 L15.5,27 L16,28 L16.5,28.5"/>
            <path d="M16.5,28.5 L18,29 L19,28.5 L20.5,28 L21.5,29 L22,30.5 L22,33 L21.5,35 L20.5,37.5 L19.5,39.5 L18.5,41 L17,42 L16.5,41 L16,39 L15.5,36 L15.5,33 L15.5,30 Z"/>
            <path d="M43,12 L45,10 L46.5,9 L48,9 L49.5,9.5 L51.5,10.5 L53,12 L54,13.5 L54.5,15.5 L54.5,17 L53.5,18.5 L52,19.5 L50,20 L48,20.5 L46.5,20 L45,19 L44,18 L43,16.5 Z"/>
            <path d="M44.5,12.5 L43,14 L43.5,15 L45,15.5 L46,14.5 Z"/>
            <path d="M43,21 L45,20.5 L47.5,20.5 L50,21 L53,21.5 L56,22 L58,23 L59,25 L59,28 L58,31 L56,34 L54,36 L52,37.5 L49,38.5 L47,38.5 L45,37 L44,35 L43,32 L42.5,29 L42.5,26 Z"/>
            <path d="M56,36.5 L57.5,36 L58.5,36.5 L58.5,38.5 L57.5,39.5 L56,39 Z"/>
            <path d="M54,7 L56,5.5 L58,4 L61,3 L65,2 L69,1.5 L73,1.5 L77,2.5 L80,4 L83,6 L85.5,8.5 L87.5,11 L89,14 L90,17 L90.5,20 L90.5,22 L89.5,22.5 L87.5,22.5 L85,22 L82,21.5 L79,21 L76,20.5 L73,20 L70,20 L67,20.5 L64,21 L61,22 L58,22.5 L56,22.5 L54.5,22 L53.5,21 L53,19.5 Z"/>
            <path d="M68,23 L70,22 L72,23 L73,25 L72,28 L70,31 L68,32 L66.5,30 L65,28 L65,25.5 Z"/>
            <path d="M69,33 L69.5,32.5 L70,33.5 L69.5,34 Z"/>
            <path d="M87,18 L88,17 L88.5,17 L89.5,18 L89.5,20 L89,21 L88,21.5 L87.5,20.5 Z"/>
            <path d="M76,23 L78,22.5 L80,22.5 L82,23 L83.5,24.5 L84,26 L83,27 L80.5,27 L78,26 L76.5,25 Z"/>
            <path d="M80,28 L82,27.5 L84.5,27.5 L86,29 L86,31 L84.5,31.5 L82,31 Z"/>
            <path d="M78,35 L80.5,33.5 L83,32.5 L86,32.5 L88.5,33.5 L90,35.5 L90.5,38 L89.5,40.5 L87,42 L84,43 L81,42.5 L79,41 L78,39 Z"/>
            <path d="M93,39 L94,38.5 L94.5,39 L95,40 L94.5,41.5 L93.5,42 L92.5,41.5 Z"/>
            <path d="M85,23.5 L86,23 L86.5,23.5 L86.5,24.5 L85.5,25 Z"/>
          </g>

          {/* Flight routes */}
          {CONNECTIONS.map(([a, b], i) => (
            <FlightRoutes key={i} from={pos(a)} to={pos(b)} active={hovered === a || hovered === b} index={i} />
          ))}

          {/* Animated planes */}
          {planes.map(([a, b], i) => (
            <Plane key={i} from={pos(a)} to={pos(b)} delay={i * 2.5} dur={6 + i * 2} />
          ))}
        </svg>
      )}

      {/* Map markers with portaled tooltips */}
      <div className="absolute inset-0" style={{ zIndex: 30 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
          {mounted && HUBS.map((h) => (
            <MapMarker key={h.id} hub={h} active={hovered === h.id} onHover={setHovered} />
          ))}
        </svg>
      </div>

      {/* Legend — bottom-left */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 z-40">
        <div className="flex items-center gap-1.5 bg-[#081A4E]/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/8">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_#3B82F6]" />
          <span className="text-[10px] font-semibold text-slate-300">Active Visa Hub</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#081A4E]/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/8">
          <svg className="w-8 h-2" viewBox="0 0 24 4"><line x1="0" y1="2" x2="22" y2="2" stroke="#3B82F6" strokeWidth="0.5" strokeDasharray="2 1" opacity="0.5" /></svg>
          <span className="text-[10px] font-semibold text-slate-300">Flight Route</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#081A4E]/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/8">
          <svg className="w-3 h-3" viewBox="0 0 12 12"><path d="M0,6 L4,4 L4,8 Z" fill="#3B82F6" opacity="0.8" /></svg>
          <span className="text-[10px] font-semibold text-slate-300">Live Flight</span>
        </div>
      </div>

      {/* Status — top-right */}
      <div className="absolute top-3 right-3 flex items-center gap-3 z-40">
        <div className="flex items-center gap-1.5 bg-[#081A4E]/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/8">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#22C55E]" />
          <span className="text-[10px] font-semibold text-slate-300">Live</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#081A4E]/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/8">
          <span className="text-[10px] font-semibold text-slate-300">250+ Destinations</span>
        </div>
      </div>
    </div>
  );
}

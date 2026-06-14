import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HUBS, CONNECTIONS, NAVY } from './worldMapData';
import { arc } from './worldMapUtils';
import FlightRoutes from './FlightRoutes';
import MapMarker from './MapMarker';

function FlyingPlane({ from, to, delay, duration = 6 }: { from: { x: number; y: number }; to: { x: number; y: number }; delay: number; duration?: number }) {
  const { midX, midY } = useMemo(() => arc(from, to), [from.x, from.y, to.x, to.y]);
  return (
    <motion.g
      initial={{ offsetDistance: '0%' }}
      animate={{ offsetDistance: '100%' }}
      transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
      style={{ offsetPath: `path('M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}')` }}
    >
      <circle r="0.25" fill="#3B82F6" opacity="0.8" />
    </motion.g>
  );
}

interface WorldMapProps {
  className?: string;
  showConnections?: boolean;
  animated?: boolean;
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
    const subset = CONNECTIONS.filter((_, i) => i % 5 === 0);
    return subset.slice(0, 3);
  }, [showConnections]);

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden bg-[${NAVY}] ${className}`}>
      {/* Background */}
      <div className="absolute inset-0 bg-[#081C5A]" />

      {/* Radial gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(8,28,90,0) 0%, #081C5A 100%)' }}
      />

      {/* Grid overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="0.08" fill="white" opacity="0.06" />
          </pattern>
        </defs>
        <rect width="100" height="50" fill="url(#grid)" />
      </svg>

      {mounted && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
          {/* Continent outlines */}
          <g fill="none" stroke="white" strokeWidth="0.15" opacity="0.10">
            <path d="M 5.5,8 L 4,6 L 3.5,4.5 L 6,3 L 8.5,2.2 L 10.5,2.5 L 13,2.8 L 15,3.5 L 17,4.2 L 19,5.5 L 20.5,6.8 L 21.5,8.5 L 22,10.5 L 22.5,12.5 L 22.8,14.5 L 22.5,16 L 21.5,17.5 L 20,18.8 L 18,19.8 L 16,20.5 L 14.5,21 L 13,21.5 L 10.5,22 L 8.5,21.8 L 6.5,21 L 4.5,20 L 3,18.5 L 2,16.5 L 1.5,14 L 1.5,11.5 Z"/>
            <path d="M 16.5,23.5 L 18,22.5 L 19,22 L 20.2,22.8 L 21,23.8 L 21.5,25 L 21.8,27 L 21.5,29 L 20.8,31 L 20,33 L 19.2,35 L 18.5,37.5 L 18,39.5 L 17.5,40.8 L 16.5,41 L 16,39.5 L 15.5,37 L 15,34 L 14.5,31 L 14,28 L 14,26 L 14.8,24 L 15.5,23.5 Z"/>
            <path d="M 43.5,9 L 45.5,8 L 47,7 L 49,7.5 L 51,8 L 52.5,9 L 53.5,10 L 54.5,11.5 L 55,13.5 L 54.5,15.5 L 53.5,17 L 52,18 L 50,18.5 L 48,18.5 L 46,18 L 44.5,17 L 43.5,15.5 L 42.5,13.5 L 42,11.5 L 42.5,10 Z"/>
            <path d="M 43.5,19.5 L 46,18.5 L 48,18.5 L 51,19 L 53,19.5 L 56,20 L 58,21 L 59.5,23 L 59.5,26 L 58.5,28.5 L 56.5,31 L 54,33 L 52,34.5 L 49,35.5 L 47,35 L 45,33.5 L 43.5,31 L 42.5,28 L 42,25 L 42,22 Z"/>
            <path d="M 54,5 L 56,3.5 L 58.5,2.5 L 62,1.5 L 66,1 L 70.5,1 L 74.5,1.5 L 78,2.5 L 81,4 L 84,6 L 86.5,8 L 88.5,10 L 90,12.5 L 91.5,15 L 92.5,18 L 93,20.5 L 92,22 L 90.5,22 L 88.5,22 L 86,22 L 83.5,21.5 L 81,21 L 78.5,20.5 L 75.5,19.5 L 72,19 L 68.5,19 L 65,19.5 L 62,20 L 59,21 L 56.5,22 L 55,22.5 L 54,22 L 53,21 L 52.5,19 L 52.5,17 L 53,15 L 53.5,12.5 L 53.5,9 L 54,6.5 Z"/>
            <path d="M 77,34 L 79.5,32.5 L 82,31.5 L 85,31.5 L 88,32.5 L 90,34 L 91,36.5 L 90,39 L 87,41 L 84,42 L 81.5,42.5 L 79,41.5 L 77.5,40 L 76.5,37 Z"/>
            <path d="M 27,2.5 L 29,1.5 L 31.5,1.5 L 33,2.5 L 33.5,4 L 33,6 L 31,7 L 28.5,7 L 27,6 L 26,4.5 Z"/>
            <path d="M 43.5,13 L 44.5,12 L 45.5,12 L 46.2,13 L 46.2,14.5 L 45.5,15.5 L 44.5,15.5 Z"/>
            <path d="M 87,16 L 88,15 L 88.5,15 L 89.5,16 L 89.5,17.5 L 89,18.5 L 88,19 L 87,18 Z"/>
            <path d="M 92.5,38 L 93.5,37.5 L 94,37.5 L 95,38.5 L 95,39.8 L 93.5,41.5 L 92.5,41 Z"/>
            <path d="M 77,24 L 79,23 L 81,23 L 83,24.2 L 83.5,26 L 82,26.8 L 79.5,26.5 L 77.5,25.5 Z"/>
            <path d="M 80,28.5 L 82,27.5 L 84.5,27.5 L 86,29 L 85.5,31 L 83,31 Z"/>
            <path d="M 57,35.5 L 58,34.5 L 58.5,35 L 58.5,37.5 L 57.8,39 L 57,38 Z"/>
          </g>

          {/* Flight routes */}
          {CONNECTIONS.map(([fromId, toId], i) => {
            const from = pos(fromId);
            const to = pos(toId);
            const active = hovered === fromId || hovered === toId;
            return <FlightRoutes key={i} from={from} to={to} active={active} index={i} />;
          })}
        </svg>
      )}

      {/* Map markers (outside SVG for tooltip positioning) */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 30 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
          {mounted && HUBS.map((hub) => (
            <MapMarker
              key={hub.id}
              hub={hub}
              active={hovered === hub.id}
              onHover={setHovered}
            />
          ))}
        </svg>
      </div>

      {/* Animated planes */}
      {mounted && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet" style={{ zIndex: 20 }}>
          {planes.map(([fromId, toId], i) => (
            <FlyingPlane key={i} from={pos(fromId)} to={pos(toId)} delay={i * 2} duration={6 + i} />
          ))}
        </svg>
      )}

      {/* Legend — bottom-left */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 z-40">
        <div className="flex items-center gap-1.5 bg-[#081C5A]/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/8">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_#3B82F6]" />
          <span className="text-[10px] font-semibold text-slate-300">Active Visa Hub</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#081C5A]/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/8">
          <svg className="w-8 h-2" viewBox="0 0 32 8"><line x1="0" y1="4" x2="28" y2="4" stroke="#3B82F6" strokeWidth="0.5" strokeDasharray="2 1" opacity="0.5" /></svg>
          <span className="text-[10px] font-semibold text-slate-300">Flight Route</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#081C5A]/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/8">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_4px_#3B82F6]" />
          <span className="text-[10px] font-semibold text-slate-300">Live Connection</span>
        </div>
      </div>

      {/* Status — top-right */}
      <div className="absolute top-3 right-3 flex items-center gap-3 z-40">
        <div className="flex items-center gap-1.5 bg-[#081C5A]/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/8">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#22C55E]" />
          <span className="text-[10px] font-semibold text-slate-300">Live</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#081C5A]/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/8">
          <span className="text-[10px] font-semibold text-slate-300">250+ Destinations</span>
        </div>
      </div>
    </div>
  );
}

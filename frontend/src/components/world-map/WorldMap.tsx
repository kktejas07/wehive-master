import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HUBS, CONNECTIONS, NAVY, ACCENT } from './worldMapData';
import { CONTINENT_PATHS } from './worldMapPaths';
import { arc } from './worldMapUtils';
import FlightRoutes from './FlightRoutes';
import MapMarker from './MapMarker';
import CountryLabel from './CountryLabel';

function Plane({ from, to, delay, dur = 8 }: { from: { x: number; y: number }; to: { x: number; y: number }; delay: number; dur?: number }) {
  const { midX, midY } = useMemo(() => arc(from, to), [from.x, from.y, to.x, to.y]);
  const pathD = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;

  return (
    <motion.g
      initial={{ offsetDistance: '0%' }}
      animate={{ offsetDistance: '100%' }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: 'linear' }}
      style={{ offsetPath: `path('${pathD}')` }}
    >
      {/* Comet tail */}
      <ellipse cx={-1.2} cy={0} rx={1.8} ry={0.35} fill="white" opacity={0.25} />
      {/* Airplane silhouette */}
      <g transform="rotate(-35)">
        <path d="M-0.5,-1.8 L3.5,0 L-0.5,1.8 L0,0 Z" fill="white" opacity={0.95} />
        <path d="M0,-0.8 L2.2,0 L0,0.8 Z" fill={ACCENT} opacity={0.5} />
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
    return CONNECTIONS.filter((_, i) => i % 3 === 0).slice(0, 4);
  }, [showConnections]);

  return (
    <div className={`relative w-full h-full rounded-3xl overflow-hidden ${className}`} style={{ background: NAVY }}>
      {/* Centered 2:1 map canvas so SVG + HTML overlays align */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-full w-auto max-w-full aspect-[2/1]">

          {/* Background gradient */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{ background: `radial-gradient(ellipse 70% 60% at 50% 45%, #0A1F4A 0%, ${NAVY} 100%)` }}
          />

          {/* Main SVG layer */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
            <defs>
              {/* Square grid */}
              <pattern id="wm-grid" width="4" height="4" patternUnits="userSpaceOnUse">
                <path d="M 4 0 L 0 0 0 4" fill="none" stroke="white" strokeWidth="0.03" opacity="0.06" />
              </pattern>

              {/* Dot fill for continents */}
              <pattern id="wm-dots" width="0.42" height="0.42" patternUnits="userSpaceOnUse">
                <circle cx="0.21" cy="0.21" r="0.09" fill={ACCENT} opacity="0.65" />
              </pattern>

              <filter id="hub-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="0.6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="0.4" />
              </filter>
            </defs>

            {/* Grid background */}
            <rect width="100" height="50" fill="url(#wm-grid)" />

            {/* Dotted continents */}
            <g fill="url(#wm-dots)">
              {CONTINENT_PATHS.map((d, i) => (
                <path key={i} d={d} fillRule="evenodd" />
              ))}
            </g>

            {/* Subtle continent edge glow */}
            <g fill="none" stroke={ACCENT} strokeWidth="0.06" opacity="0.15">
              {CONTINENT_PATHS.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>

            {/* Flight routes + planes */}
            {mounted && showConnections && (
              <>
                {CONNECTIONS.map(([a, b], i) => (
                  <FlightRoutes key={i} from={pos(a)} to={pos(b)} active={hovered === a || hovered === b} />
                ))}
                {planes.map(([a, b], i) => (
                  <Plane key={i} from={pos(a)} to={pos(b)} delay={i * 2} dur={7 + i * 1.5} />
                ))}
              </>
            )}

            {/* Hub markers */}
            {mounted && HUBS.map((h) => (
              <MapMarker key={h.id} hub={h} active={hovered === h.id} onHover={setHovered} />
            ))}
          </svg>

          {/* Country label pills (HTML overlay) */}
          {mounted && HUBS.map((h) => (
            <CountryLabel key={`label-${h.id}`} hub={h} />
          ))}

          {/* Legend — bottom-left box */}
          <div className="absolute bottom-3 left-3 z-40 rounded-xl bg-[#061440]/80 backdrop-blur-sm border border-white/10 px-4 py-2.5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00D4FF] shadow-[0_0_8px_#00D4FF]" />
              <span className="text-[10px] font-medium text-slate-300">Active Visa Hub</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-6 h-1.5 shrink-0" viewBox="0 0 24 3">
                <line x1="0" y1="1.5" x2="24" y2="1.5" stroke="#00D4FF" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
              </svg>
              <span className="text-[10px] font-medium text-slate-300">Flight Route</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 12 12">
                <path d="M0,6 L5,3.5 L5,8.5 Z" fill="white" opacity="0.9" />
              </svg>
              <span className="text-[10px] font-medium text-slate-300">Live Flight</span>
            </div>
          </div>

          {/* Status badges — top-right */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-40">
            <div className="flex items-center gap-1.5 bg-[#061440]/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34D399]" />
              <span className="text-[10px] font-semibold text-slate-300">Live</span>
            </div>
            <div className="flex items-center bg-[#061440]/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
              <span className="text-[10px] font-semibold text-slate-300 whitespace-nowrap">250+ Destinations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

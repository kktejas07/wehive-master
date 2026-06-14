import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { HUBS, CONNECTIONS, NAVY, ACCENT } from './worldMapData';
import { arc } from './worldMapUtils';
import FlightPath from './FlightPath';
import MapNode from './MapNode';
import type { Hub } from './worldMapData';

function FlyingPlane({ from, to, delay }: { from: { x: number; y: number }; to: { x: number; y: number }; delay: number }) {
  const { midX, midY } = useMemo(() => arc(from, to), [from.x, from.y, to.x, to.y]);
  return (
    <motion.div
      className="absolute w-2.5 h-2.5 z-10 pointer-events-none"
      style={{ offsetPath: `path('M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}')` }}
      animate={{ offsetDistance: ['0%', '100%'] }}
      transition={{ duration: 5, delay, repeat: Infinity, ease: 'linear' }}
    >
      <svg viewBox="0 0 24 24" className="w-full h-full text-[hsl(var(--accent))] drop-shadow-sm" fill="currentColor">
        <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
      </svg>
    </motion.div>
  );
}

interface WorldMapProps {
  className?: string;
  showConnections?: boolean;
  animated?: boolean;
}

export default function WorldMap({ className = '', showConnections = true }: WorldMapProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const pos = (id: string) => {
    const n = HUBS.find((h) => h.id === id);
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  };

  const flights = useMemo(() => {
    if (!hoveredNode) return CONNECTIONS;
    return CONNECTIONS.filter((c) => c[0] === hoveredNode || c[1] === hoveredNode);
  }, [hoveredNode]);

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden ${className}`}>
      {/* Dark navy background */}
      <div className="absolute inset-0 bg-[#061440]" />

      {/* Continent outlines SVG */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 50"
        preserveAspectRatio="xMidYMid meet"
        style={{ opacity: 0.12 }}
      >
        {/* Simplified continent outlines */}
        <g fill="none" stroke="#FFFFFF" strokeWidth="0.15">
          {/* North America */}
          <path d="M5,5 L10,3 L18,5 L22,8 L24,12 L20,18 L15,22 L8,22 L3,18 L2,12 Z" opacity="0.8" />
          {/* South America */}
          <path d="M18,28 L22,25 L25,28 L24,34 L22,40 L20,44 L18,42 L16,36 Z" opacity="0.7" />
          {/* Europe */}
          <path d="M46,10 L48,8 L52,9 L55,12 L54,16 L50,18 L47,16 L44,14 Z" opacity="0.8" />
          {/* Africa */}
          <path d="M47,20 L50,18 L55,20 L58,25 L56,32 L52,36 L48,35 L45,30 L45,25 Z" opacity="0.7" />
          {/* Asia */}
          <path d="M55,8 L62,5 L72,4 L82,6 L90,10 L92,15 L88,22 L78,24 L68,25 L60,22 L55,18 L55,12 Z" opacity="0.8" />
          {/* Australia */}
          <path d="M78,36 L82,34 L86,36 L88,40 L85,43 L80,42 Z" opacity="0.6" />
          {/* Greenland */}
          <path d="M26,8 L28,5 L32,6 L31,10 L28,11 Z" opacity="0.5" />
          {/* SEA islands */}
          <ellipse cx="78" cy="30" rx="1.5" ry="1" opacity="0.4" />
          <ellipse cx="80" cy="32" rx="1" ry="0.7" opacity="0.4" />
        </g>
      </svg>

      {/* Grid lines */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 50"
        preserveAspectRatio="xMidYMid meet"
        style={{ opacity: 0.04 }}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 5} x2="100" y2={i * 5} stroke="white" strokeWidth="0.1" />
        ))}
        {Array.from({ length: 20 }, (_, i) => (
          <line key={`v${i}`} x1={i * 5} y1="0" x2={i * 5} y2="50" stroke="white" strokeWidth="0.1" />
        ))}
      </svg>

      {/* Gradient edges */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 50%, #061440 100%)',
      }} />

      {mounted && (
        <>
          {/* Flight paths */}
          {flights.map(([fromId, toId], i) => {
            const from = pos(fromId);
            const to = pos(toId);
            const active = hoveredNode === fromId || hoveredNode === toId;
            return <FlightPath key={i} from={from} to={to} active={active} />;
          })}

          {/* Animated planes */}
          {showConnections &&
            flights.map(([fromId, toId], i) => {
              const from = pos(fromId);
              const to = pos(toId);
              return <FlyingPlane key={i} from={from} to={to} delay={i * 0.4} />;
            })}

          {/* Hub nodes */}
          {HUBS.map((hub) => (
            <MapNode
              key={hub.id}
              hub={hub}
              active={hoveredNode === hub.id}
              onHover={() => setHoveredNode(hub.id)}
              onLeave={() => setHoveredNode(null)}
            />
          ))}
        </>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 z-30">
        <div className="flex items-center gap-1.5 bg-[#061440]/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-lg border border-white/10">
          <svg viewBox="0 0 24 24" className="w-3 h-3 text-slate-400" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
          <span className="text-[10px] font-semibold text-slate-400">Routes</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#061440]/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-lg border border-white/10">
          <svg viewBox="0 0 24 24" className="w-3 h-3 text-[hsl(var(--accent))]" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="text-[10px] font-semibold text-slate-400">Hubs</span>
        </div>
      </div>

      {/* Live indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-2 bg-[#061440]/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-lg border border-white/10 z-30">
        <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
        <span className="text-[10px] font-semibold text-slate-400">Live</span>
      </div>
    </div>
  );
}

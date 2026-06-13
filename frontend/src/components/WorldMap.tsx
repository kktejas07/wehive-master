import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface MapNode {
  id: string;
  name: string;
  flag: string;
  x: number;
  y: number;
  connections: string[];
}

interface WorldMapProps {
  className?: string;
  showConnections?: boolean;
  animated?: boolean;
}

/** Percentage positions (0-100) for a standard world map — roughly equirectangular projection */
const NODES: MapNode[] = [
  { id: 'canada',      name: 'Canada',      flag: '🇨🇦', x: 13, y: 18, connections: ['usa', 'uk', 'france'] },
  { id: 'usa',         name: 'USA',         flag: '🇺🇸', x: 16, y: 37, connections: ['canada', 'india', 'uk', 'australia', 'japan'] },
  { id: 'uk',          name: 'UK',          flag: '🇬🇧', x: 50, y: 27, connections: ['usa', 'india', 'germany', 'france', 'uae'] },
  { id: 'germany',     name: 'Germany',     flag: '🇩🇪', x: 53, y: 28, connections: ['uk', 'france', 'uae'] },
  { id: 'france',      name: 'France',      flag: '🇫🇷', x: 50, y: 33, connections: ['uk', 'germany', 'canada'] },
  { id: 'uae',         name: 'UAE',         flag: '🇦🇪', x: 65, y: 47, connections: ['india', 'uk', 'germany', 'singapore'] },
  { id: 'india',       name: 'India',       flag: '🇮🇳', x: 78, y: 47, connections: ['usa', 'uk', 'uae', 'australia', 'singapore', 'japan'] },
  { id: 'singapore',   name: 'Singapore',   flag: '🇸🇬', x: 83, y: 56, connections: ['india', 'uae', 'australia', 'japan'] },
  { id: 'japan',       name: 'Japan',       flag: '🇯🇵', x: 88, y: 39, connections: ['usa', 'india', 'australia', 'singapore', 'southkorea'] },
  { id: 'southkorea',  name: 'South Korea', flag: '🇰🇷', x: 86, y: 41, connections: ['japan', 'india', 'singapore'] },
  { id: 'australia',   name: 'Australia',   flag: '🇦🇺', x: 88, y: 73, connections: ['usa', 'india', 'japan', 'singapore', 'newzealand'] },
  { id: 'newzealand',  name: 'New Zealand', flag: '🇳🇿', x: 94, y: 82, connections: ['australia'] },
];

const CONNECTIONS = [
  { from: 'india', to: 'usa' }, { from: 'india', to: 'uk' }, { from: 'india', to: 'uae' },
  { from: 'india', to: 'australia' }, { from: 'india', to: 'singapore' }, { from: 'india', to: 'japan' },
  { from: 'usa', to: 'canada' }, { from: 'usa', to: 'uk' }, { from: 'usa', to: 'australia' },
  { from: 'usa', to: 'japan' }, { from: 'uk', to: 'germany' }, { from: 'uk', to: 'france' },
  { from: 'uk', to: 'uae' }, { from: 'uae', to: 'singapore' }, { from: 'australia', to: 'singapore' },
  { from: 'australia', to: 'japan' }, { from: 'singapore', to: 'japan' }, { from: 'france', to: 'canada' },
  { from: 'australia', to: 'newzealand' }, { from: 'japan', to: 'southkorea' },
  { from: 'india', to: 'southkorea' },
];

/* ── brand palette ────────────────────────────── */
const NAVY = '#0A2C8A';
const NAVY_LIGHT = '#1E4DB1';
const ACCENT = '#E1212C';

/* ── flight arc helpers ───────────────────────── */
function arc(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const midX = (from.x + to.x) / 2 + (dy / dist) * 10;
  const midY = (from.y + to.y) / 2 - (dx / dist) * 10;
  return { midX, midY };
}

function FlightPath({ from, to, active }: { from: { x: number; y: number }; to: { x: number; y: number }; active: boolean }) {
  const { midX, midY } = useMemo(() => arc(from, to), [from, to]);
  const gradientId = `fg-${Math.round(from.x + to.x + from.y + to.y)}`;
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={NAVY} stopOpacity="0" />
          <stop offset="50%" stopColor={active ? ACCENT : NAVY} stopOpacity={active ? 0.7 : 0.4} />
          <stop offset="100%" stopColor={NAVY} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={active ? 1.5 : 1}
        strokeDasharray={active ? 'none' : '3 3'}
        opacity={active ? 0.9 : 0.4}
      />
    </svg>
  );
}

function FlyingPlane({ from, to, delay }: { from: { x: number; y: number }; to: { x: number; y: number }; delay: number }) {
  const { midX, midY } = useMemo(() => arc(from, to), [from, to]);
  return (
    <motion.div
      className="absolute w-3 h-3 z-10 pointer-events-none"
      style={{ offsetPath: `path('M ${from.x}% ${from.y}% Q ${midX}% ${midY}% ${to.x}% ${to.y}%')` }}
      animate={{ offsetDistance: ['0%', '100%'] }}
      transition={{ duration: 5, delay, repeat: Infinity, ease: 'linear' }}
    >
      <svg viewBox="0 0 24 24" className="w-full h-full text-[hsl(var(--accent))]" fill="currentColor">
        <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
      </svg>
    </motion.div>
  );
}

function MapNodeComponent({ node, index, active, onHover, onLeave }: { node: MapNode; index: number; active: boolean; onHover: () => void; onLeave: () => void }) {
  const isHub = ['india', 'usa', 'uk', 'uae'].includes(node.id);
  return (
    <motion.div
      className="absolute cursor-pointer z-20"
      style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, type: 'spring', damping: 14 }}
      whileHover={{ scale: 1.35, zIndex: 50 }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="relative flex flex-col items-center">
        <div
          className="rounded-full flex items-center justify-center shadow-lg border-2 backdrop-blur-sm transition-all duration-300"
          style={{
            width: isHub ? 44 : 36,
            height: isHub ? 44 : 36,
            backgroundColor: active ? `${ACCENT}30` : `${NAVY}25`,
            borderColor: active ? ACCENT : NAVY_LIGHT,
            boxShadow: active ? `0 0 20px ${ACCENT}40` : `0 0 12px ${NAVY}30`,
          }}
        >
          <span className={isHub ? 'text-lg drop-shadow-lg' : 'text-base drop-shadow-lg'}>{node.flag}</span>
        </div>
        <div
          className="mt-1.5 whitespace-nowrap"
        >
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full shadow transition-all duration-300"
            style={{
              backgroundColor: active ? `${ACCENT}99` : `${NAVY}99`,
              color: '#fff',
            }}
          >
            {node.name}
          </span>
        </div>
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{ backgroundColor: active ? ACCENT : NAVY, opacity: active ? 0.25 : 0.12 }}
        />
      </div>
    </motion.div>
  );
}

export default function WorldMap({ className = '', showConnections = true, animated }: WorldMapProps) {
  void animated; // always enabled via framer-motion below
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const pos = (id: string) => {
    const n = NODES.find((x) => x.id === id);
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  };

  const flights = showConnections
    ? CONNECTIONS.filter((c) => !hoveredNode || c.from === hoveredNode || c.to === hoveredNode)
    : [];

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden ${className}`}>
      <img
        src="/images/world-map.webp"
        alt="World map"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Navy gradient overlay to blend the map into brand colours */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A2C8A]/10 via-transparent to-[#0A2C8A]/20" />

      {mounted && (
        <>
          {flights.map((conn, i) => {
            const from = pos(conn.from);
            const to = pos(conn.to);
            const active = hoveredNode === conn.from || hoveredNode === conn.to;
            return <FlightPath key={i} from={from} to={to} active={active} />;
          })}

          {showConnections && CONNECTIONS.map((conn, i) => {
            const from = pos(conn.from);
            const to = pos(conn.to);
            if (hoveredNode && conn.from !== hoveredNode && conn.to !== hoveredNode) return null;
            return <FlyingPlane key={i} from={from} to={to} delay={i * 0.4} />;
          })}

          {NODES.map((node, i) => (
            <MapNodeComponent
              key={node.id}
              node={node}
              index={i}
              active={hoveredNode === node.id}
              onHover={() => setHoveredNode(node.id)}
              onLeave={() => setHoveredNode(null)}
            />
          ))}
        </>
      )}

      {/* ── legend ─────────────────────────── */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-[#0A2C8A]/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-lg border border-white/10">
          <svg viewBox="0 0 24 24" className="w-3 h-3 text-white/80" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
          <span className="text-[10px] font-semibold text-white/80">Flight Routes</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#0A2C8A]/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-lg border border-white/10">
          <svg viewBox="0 0 24 24" className="w-3 h-3 text-[hsl(var(--accent))]" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="text-[10px] font-semibold text-white/80">Visa Hubs</span>
        </div>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-2 bg-[#0A2C8A]/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-lg border border-white/10">
        <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
        <span className="text-[10px] font-semibold text-white/80">Live</span>
      </div>
    </div>
  );
}

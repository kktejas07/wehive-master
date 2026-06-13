import { useEffect, useState } from 'react';
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

const NODES: MapNode[] = [
  { id: 'india', name: 'India', flag: '🇮🇳', x: 60, y: 45, connections: ['usa', 'uk', 'australia', 'uae', 'singapore', 'japan'] },
  { id: 'usa', name: 'USA', flag: '🇺🇸', x: 18, y: 38, connections: ['india', 'uk', 'canada', 'australia', 'japan'] },
  { id: 'uk', name: 'UK', flag: '🇬🇧', x: 46, y: 28, connections: ['india', 'usa', 'germany', 'france', 'uae'] },
  { id: 'uae', name: 'UAE', flag: '🇦🇪', x: 57, y: 43, connections: ['india', 'uk', 'germany', 'singapore'] },
  { id: 'australia', name: 'Australia', flag: '🇦🇺', x: 82, y: 68, connections: ['india', 'usa', 'japan', 'singapore'] },
  { id: 'singapore', name: 'Singapore', flag: '🇸🇬', x: 72, y: 52, connections: ['india', 'uae', 'australia', 'japan'] },
  { id: 'japan', name: 'Japan', flag: '🇯🇵', x: 85, y: 38, connections: ['india', 'usa', 'australia', 'singapore'] },
  { id: 'germany', name: 'Germany', flag: '🇩🇪', x: 51, y: 26, connections: ['uk', 'uae', 'france'] },
  { id: 'france', name: 'France', flag: '🇫🇷', x: 48, y: 30, connections: ['uk', 'germany', 'canada'] },
  { id: 'canada', name: 'Canada', flag: '🇨🇦', x: 16, y: 22, connections: ['usa', 'france', 'uk'] },
  { id: 'newzealand', name: 'New Zealand', flag: '🇳🇿', x: 90, y: 75, connections: ['australia', 'singapore'] },
  { id: 'southkorea', name: 'South Korea', flag: '🇰🇷', x: 82, y: 40, connections: ['japan', 'singapore', 'india'] },
];

const CONNECTIONS = [
  { from: 'india', to: 'usa' }, { from: 'india', to: 'uk' }, { from: 'india', to: 'uae' },
  { from: 'india', to: 'australia' }, { from: 'india', to: 'singapore' }, { from: 'india', to: 'japan' },
  { from: 'usa', to: 'uk' }, { from: 'usa', to: 'canada' }, { from: 'usa', to: 'australia' },
  { from: 'usa', to: 'japan' }, { from: 'uk', to: 'germany' }, { from: 'uk', to: 'france' },
  { from: 'uk', to: 'uae' }, { from: 'uae', to: 'singapore' }, { from: 'australia', to: 'singapore' },
  { from: 'australia', to: 'japan' }, { from: 'singapore', to: 'japan' }, { from: 'france', to: 'canada' },
  { from: 'australia', to: 'newzealand' }, { from: 'japan', to: 'southkorea' },
];

function FlightPath({ from, to, color }: { from: { x: number; y: number }; to: { x: number; y: number }; color: string }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const midX = (from.x + to.x) / 2 + (dy / dist) * 8;
  const midY = (from.y + to.y) / 2 - (dx / dist) * 8;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`fg-${Math.round(from.x+to.x+from.y+to.y)}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="50%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
        fill="none"
        stroke={`url(#fg-${Math.round(from.x+to.x+from.y+to.y)})`}
        strokeWidth="1"
        strokeDasharray="3 2"
        opacity="0.5"
      />
    </svg>
  );
}

function FlyingPlane({ from, to, delay }: { from: { x: number; y: number }; to: { x: number; y: number }; delay: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const midX = (from.x + to.x) / 2 + (dy / dist) * 8;
  const midY = (from.y + to.y) / 2 - (dx / dist) * 8;

  return (
    <motion.div
      className="absolute w-4 h-4 z-10 pointer-events-none"
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

function MapNodeComponent({ node, index, onHover, onLeave }: { node: MapNode; index: number; onHover: () => void; onLeave: () => void }) {
  const colors = ['#0A2C8A', '#E1212C', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
  const color = colors[index % colors.length];

  return (
    <motion.div
      className="absolute cursor-pointer z-20"
      style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, type: 'spring', damping: 12 }}
      whileHover={{ scale: 1.4, zIndex: 50 }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="relative">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg border-2 border-white backdrop-blur-sm"
          style={{ backgroundColor: `${color}30`, borderColor: color }}
        >
          <span className="text-xl drop-shadow-lg">{node.flag}</span>
        </div>
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-[10px] font-bold text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full shadow">
            {node.name}
          </span>
        </div>
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ backgroundColor: color }}
        />
      </div>
    </motion.div>
  );
}

export default function WorldMap({ className = '', showConnections = true }: WorldMapProps) {
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

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/30" />

      {mounted && (
        <>
          {flights.map((conn, i) => {
            const from = pos(conn.from);
            const to = pos(conn.to);
            const active = hoveredNode === conn.from || hoveredNode === conn.to;
            return <FlightPath key={i} from={from} to={to} color={active ? '#E1212C' : '#0A2C8A'} />;
          })}

          {showConnections && CONNECTIONS.map((conn, i) => {
            const from = pos(conn.from);
            const to = pos(conn.to);
            if (hoveredNode && conn.from !== hoveredNode && conn.to !== hoveredNode) return null;
            return <FlyingPlane key={i} from={from} to={to} delay={i * 0.6} />;
          })}

          {NODES.map((node, i) => (
            <MapNodeComponent
              key={node.id}
              node={node}
              index={i}
              onHover={() => setHoveredNode(node.id)}
              onLeave={() => setHoveredNode(null)}
            />
          ))}
        </>
      )}

      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow">
          <svg viewBox="0 0 24 24" className="w-3 h-3 text-[hsl(var(--blue-700))]" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
          <span className="text-[10px] font-semibold text-[hsl(var(--blue-900))]">Flight Routes</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow">
          <svg viewBox="0 0 24 24" className="w-3 h-3 text-[hsl(var(--accent))]" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="text-[10px] font-semibold text-[hsl(var(--blue-900))]">Visa Hubs</span>
        </div>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-full px-2.5 py-1 shadow">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-semibold text-[hsl(var(--blue-900))]/70">Live</span>
      </div>
    </div>
  );
}

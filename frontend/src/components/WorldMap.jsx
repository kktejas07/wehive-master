import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Plane, MapPin } from 'lucide-react';

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
  { from: 'india', to: 'usa', duration: 18 },
  { from: 'india', to: 'uk', duration: 10 },
  { from: 'india', to: 'uae', duration: 3 },
  { from: 'india', to: 'australia', duration: 9 },
  { from: 'india', to: 'singapore', duration: 5 },
  { from: 'india', to: 'japan', duration: 7 },
  { from: 'usa', to: 'uk', duration: 8 },
  { from: 'usa', to: 'canada', duration: 4 },
  { from: 'usa', to: 'australia', duration: 16 },
  { from: 'usa', to: 'japan', duration: 14 },
  { from: 'uk', to: 'germany', duration: 2 },
  { from: 'uk', to: 'france', duration: 1 },
  { from: 'uk', to: 'uae', duration: 7 },
  { from: 'uae', to: 'singapore', duration: 6 },
  { from: 'australia', to: 'singapore', duration: 7 },
  { from: 'australia', to: 'japan', duration: 9 },
  { from: 'singapore', to: 'japan', duration: 5 },
  { from: 'france', to: 'canada', duration: 8 },
  { from: 'australia', to: 'newzealand', duration: 3 },
  { from: 'japan', to: 'southkorea', duration: 2 },
];

function AnimatedDot({ x, y, delay, color }: { x: number; y: number; delay: number; color: string }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ left: `${x}%`, top: `${y}%`, backgroundColor: color }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1.2, 1, 0], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 2, delay, repeat: Infinity }}
    />
  );
}

function FlightPath({ from, to, progress, color }: { from: { x: number; y: number }; to: { x: number; y: number }; progress: number; color: string }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const midX = (from.x + to.x) / 2 + (dy / length) * 8;
  const midY = (from.y + to.y) / 2 - (dx / length) * 8;

  const currentX = from.x + (to.x - from.x) * progress;
  const currentY = from.y + (to.y - from.y) * progress;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${from.x}-${to.x}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="50%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M ${from.x}% ${from.y}% Q ${midX}% ${midY}% ${to.x}% ${to.y}%`}
        fill="none"
        stroke={`url(#grad-${from.x}-${to.x})`}
        strokeWidth="1"
        opacity="0.4"
      />
      <motion.circle
        r="3"
        fill={color}
        style={{
          filter: `drop-shadow(0 0 6px ${color})`,
        }}
        animate={{
          offsetDistance: ['0%', '100%'],
        }}
        style={{
          offsetPath: `path('M ${from.x}% ${from.y}% Q ${midX}% ${midY}% ${to.x}% ${to.y}%')`,
        }}
      />
    </svg>
  );
}

function MapNodeComponent({ node, index, onHover, onLeave }: { node: MapNode; index: number; onHover: () => void; onLeave: () => void }) {
  const colors = ['#0A2C8A', '#E1212C', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
  const color = colors[index % colors.length];

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, type: 'spring', damping: 12 }}
      whileHover={{ scale: 1.3, z: 50 }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="relative">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
          style={{ backgroundColor: `${color}20`, borderColor: color }}
        >
          <span className="text-xl">{node.flag}</span>
        </div>
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-[9px] font-bold text-[hsl(var(--blue-900))] bg-white/90 px-1.5 py-0.5 rounded shadow">
            {node.name}
          </span>
        </div>
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{ backgroundColor: color }}
        />
      </div>
    </motion.div>
  );
}

export default function WorldMap({ className = '', showConnections = true, animated = true }: WorldMapProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState<Array<{ x: number; y: number; delay: number; color: string }>>([]);

  useEffect(() => {
    if (!animated) return;

    const newDots = Array.from({ length: 25 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      color: ['#0A2C8A', '#E1212C', '#10B981', '#F59E0B'][Math.floor(Math.random() * 4)],
    }));
    setDots(newDots);

    let p = 0;
    const interval = setInterval(() => {
      p = (p + 0.005) % 1;
      setProgress(p);
    }, 50);

    return () => clearInterval(interval);
  }, [animated]);

  const getNodePosition = (id: string) => {
    const node = NODES.find((n) => n.id === id);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  return (
    <div className={`relative w-full h-full bg-gradient-to-br from-[hsl(var(--blue-900))]/5 to-[hsl(var(--blue-50))] rounded-2xl overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(10,44,138,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(10,44,138,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
        }}
      />

      {dots.map((dot, i) => (
        <AnimatedDot key={i} {...dot} />
      ))}

      {showConnections &&
        CONNECTIONS.map((conn, i) => {
          const from = getNodePosition(conn.from);
          const to = getNodePosition(conn.to);
          const isActive = hoveredNode === conn.from || hoveredNode === conn.to;
          return (
            <FlightPath
              key={i}
              from={from}
              to={to}
              progress={progress}
              color={isActive ? '#E1212C' : '#0A2C8A'}
            />
          );
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

      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow">
          <Plane className="w-3 h-3 text-[hsl(var(--blue-700))]" />
          <span className="text-[10px] font-semibold text-[hsl(var(--blue-900))]">Flight Routes</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow">
          <MapPin className="w-3 h-3 text-[hsl(var(--accent))]" />
          <span className="text-[10px] font-semibold text-[hsl(var(--blue-900))]">Visa Hubs</span>
        </div>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-semibold text-[hsl(var(--blue-900))]/60">Live Connections</span>
      </div>
    </div>
  );
}
import { motion } from 'framer-motion';
import { ACCENT, BLUE_GLOW } from './worldMapData';
import type { Hub } from './worldMapData';

export default function MapMarker({
  hub,
  active,
  onHover,
}: {
  hub: Hub;
  active: boolean;
  onHover: (id: string | null) => void;
}) {
  return (
    <g
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => onHover(hub.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Large invisible hit area */}
      <circle cx={hub.x} cy={hub.y} r={2.5} fill="transparent" />

      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={hub.x}
          cy={hub.y}
          fill="none"
          stroke={BLUE_GLOW}
          strokeWidth={0.1}
          initial={{ r: 0.5, opacity: 0.45 }}
          animate={{ r: 2.8, opacity: 0 }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: 'easeOut' }}
        />
      ))}

      <circle
        cx={hub.x}
        cy={hub.y}
        r={active ? 1.8 : 1.2}
        fill={BLUE_GLOW}
        opacity={active ? 0.35 : 0.2}
        filter="url(#hub-glow)"
      />

      <motion.circle
        cx={hub.x}
        cy={hub.y}
        r={active ? 0.75 : 0.55}
        fill={ACCENT}
        animate={{ r: active ? [0.75, 0.85, 0.75] : 0.55 }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <circle cx={hub.x} cy={hub.y} r={0.18} fill="white" opacity={0.9} />
    </g>
  );
}

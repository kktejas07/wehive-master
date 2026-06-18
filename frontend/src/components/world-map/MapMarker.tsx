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
  const glowR = active ? 20 : 14;
  const coreR = active ? 8 : 6;

  return (
    <g
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => onHover(hub.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Large invisible hit area */}
      <circle cx={hub.x} cy={hub.y} r={26} fill="transparent" />

      {/* Pulsing radar rings */}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={hub.x}
          cy={hub.y}
          fill="none"
          stroke={BLUE_GLOW}
          strokeWidth={1.2}
          initial={false}
          animate={{ r: [6, 32], opacity: [0.5, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: 'easeOut' }}
        />
      ))}

      {/* Soft glow halo */}
      <circle
        cx={hub.x}
        cy={hub.y}
        r={glowR}
        fill={BLUE_GLOW}
        opacity={active ? 0.35 : 0.2}
        filter="url(#hub-glow)"
      />

      {/* Core dot */}
      <motion.circle
        cx={hub.x}
        cy={hub.y}
        fill={ACCENT}
        animate={{ r: active ? [coreR, coreR + 1.5, coreR] : coreR }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* White center */}
      <circle cx={hub.x} cy={hub.y} r={2.6} fill="white" opacity={0.95} />
    </g>
  );
}

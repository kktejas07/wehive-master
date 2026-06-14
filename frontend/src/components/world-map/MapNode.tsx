import { motion } from 'framer-motion';
import { NAVY, ACCENT, NAVY_LIGHT, HUBS_MAJOR } from './worldMapData';
import type { Hub } from './worldMapData';

interface MapNodeProps {
  hub: Hub;
  active: boolean;
  onHover: () => void;
  onLeave: () => void;
}

export default function MapNode({ hub, active, onHover, onLeave }: MapNodeProps) {
  const isMajor = HUBS_MAJOR.includes(hub.id);
  const size = isMajor ? 38 : 28;

  return (
    <motion.div
      className="absolute z-20"
      style={{ left: `${hub.x}%`, top: `${hub.y}%`, transform: 'translate(-50%, -50%)' }}
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.05, type: 'spring', damping: 14 }}
      whileHover={{ scale: 1.3 }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="relative flex flex-col items-center cursor-pointer group">
        {/* Glow ring */}
        <div
          className="rounded-full flex items-center justify-center transition-all duration-300"
          style={{
            width: size,
            height: size,
            backgroundColor: active ? `${ACCENT}30` : `${NAVY}40`,
            border: `2px solid ${active ? ACCENT : NAVY_LIGHT}`,
            boxShadow: active
              ? `0 0 18px ${ACCENT}50, 0 0 36px ${ACCENT}20`
              : `0 0 10px ${NAVY}40`,
          }}
        >
          <span className={isMajor ? 'text-base' : 'text-sm'} style={{ lineHeight: 1 }}>
            {hub.flag}
          </span>
        </div>

        {/* Hover tooltip — only visible on hover */}
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-full bg-white shadow-lg border border-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap"
        >
          <span className="text-[10px] font-bold text-slate-700">{hub.name}</span>
        </div>

        {/* Subtle pulse */}
        <span
          className="absolute inset-0 rounded-full animate-ping pointer-events-none"
          style={{
            width: size,
            height: size,
            backgroundColor: active ? ACCENT : NAVY,
            opacity: active ? 0.18 : 0.08,
          }}
        />
      </div>
    </motion.div>
  );
}

import { flagUrl } from './worldMapData';
import type { Hub } from './worldMapData';

/** Pill label offset per hub so labels don't overlap markers */
const LABEL_OFFSET: Record<string, { dx: number; dy: number }> = {
  canada:      { dx: 0, dy: -14 },
  usa:         { dx: 8, dy: -12 },
  uk:          { dx: -10, dy: -12 },
  france:      { dx: 10, dy: -10 },
  germany:     { dx: 12, dy: -8 },
  uae:         { dx: 0, dy: -14 },
  india:       { dx: 0, dy: -14 },
  singapore:   { dx: 10, dy: -10 },
  japan:       { dx: 12, dy: -10 },
  'south-korea': { dx: -14, dy: -10 },
  australia:   { dx: 0, dy: -14 },
  'new-zealand': { dx: 10, dy: -10 },
};

export default function CountryLabel({ hub }: { hub: Hub }) {
  const offset = LABEL_OFFSET[hub.id] ?? { dx: 0, dy: -12 };

  return (
    <div
      className="absolute z-20 pointer-events-none flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-[#061440]/75 backdrop-blur-sm border border-[#00D4FF]/15 shadow-[0_0_12px_rgba(0,212,255,0.08)]"
      style={{
        left: `${hub.x}%`,
        top: `${hub.y * 2}%`,
        transform: `translate(calc(-50% + ${offset.dx}px), calc(-100% + ${offset.dy}px))`,
      }}
    >
      <img src={flagUrl(hub.flag)} alt="" className="w-4 h-3 rounded-sm object-cover" />
      <span className="text-[10px] font-semibold text-white/90 whitespace-nowrap">{hub.name}</span>
    </div>
  );
}

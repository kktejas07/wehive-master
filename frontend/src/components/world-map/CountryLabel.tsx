import { flagUrl } from './worldMapData';
import type { Hub } from './worldMapData';

export default function CountryLabel({
  hub,
  active,
  left,
  top,
  onHover,
}: {
  hub: Hub;
  active?: boolean;
  left: number;
  top: number;
  onHover: (id: string | null) => void;
}) {
  const dx = hub.labelDx ?? 0;
  const dy = hub.labelDy ?? -18;

  return (
    <div
      className={`absolute z-30 flex items-center gap-1.5 rounded-lg px-2 py-[5px] cursor-pointer transition-all duration-200 ${
        active
          ? 'bg-[#0A1A3A]/95 border-[#00E5FF]/40 shadow-[0_0_16px_rgba(0,229,255,0.15)]'
          : 'bg-[#061440]/80 border-[#00D4FF]/20 hover:border-[#00D4FF]/35'
      } border backdrop-blur-sm`}
      style={{
        left: left + dx,
        top: top + dy,
        transform: 'translate(-50%, -50%)',
      }}
      onMouseEnter={() => onHover(hub.id)}
      onMouseLeave={() => onHover(null)}
    >
      <img src={flagUrl(hub.flag)} alt="" className="w-[18px] h-[13px] rounded-[2px] object-cover shadow-sm" />
      <span className="text-[11px] font-medium text-white/95 whitespace-nowrap tracking-tight">{hub.name}</span>
    </div>
  );
}

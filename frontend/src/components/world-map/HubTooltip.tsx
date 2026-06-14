import { flagUrl } from './worldMapData';
import type { Hub } from './worldMapData';

const VISA_TYPES = ['Tourist Visa', 'Student Visa', 'Work Visa', 'Business Visa'];

export default function HubTooltip({
  hub,
  left,
  top,
}: {
  hub: Hub;
  left: number;
  top: number;
}) {
  const dx = hub.tooltipDx ?? -20;
  const dy = hub.tooltipDy ?? -110;

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        left: left + dx,
        top: top + dy,
        transform: 'translate(-50%, 0)',
      }}
    >
      <div className="rounded-xl bg-white px-4 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.22)] min-w-[168px]">
        <div className="flex items-center gap-2.5 mb-2.5">
          <img src={flagUrl(hub.flag)} alt="" className="w-7 h-5 rounded-[3px] shadow-sm object-cover" />
          <span className="text-[14px] font-bold text-[#0A2C8A]">{hub.name}</span>
        </div>
        <div className="w-full h-px bg-slate-100 mb-2.5" />
        <div className="flex flex-col gap-2 mb-3">
          {VISA_TYPES.map((v) => (
            <span key={v} className="text-[11px] text-slate-600 flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-[#00D4FF]/12 flex items-center justify-center shrink-0">
                <svg className="w-2.5 h-2.5 text-[#00D4FF]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              {v}
            </span>
          ))}
        </div>
        <span className="text-[11px] font-semibold text-[#00D4FF]">View details →</span>
      </div>
    </div>
  );
}

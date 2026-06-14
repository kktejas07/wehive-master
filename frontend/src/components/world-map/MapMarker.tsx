import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ACCENT, BLUE_GLOW, flagUrl } from './worldMapData';
import type { Hub } from './worldMapData';

const VISA_TYPES = ['Tourist Visa', 'Student Visa', 'Work Visa', 'Business Visa'];

export default function MapMarker({ hub, active, onHover }: { hub: Hub; active: boolean; onHover: (id: string | null) => void }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dotRef = useRef<SVGCircleElement>(null);

  const updatePos = useCallback(() => {
    if (dotRef.current) {
      const r = dotRef.current.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top });
    }
  }, []);

  const open = useCallback(() => {
    updatePos();
    setShow(true);
    onHover(hub.id);
  }, [hub.id, onHover, updatePos]);

  const close = useCallback(() => {
    setShow(false);
    onHover(null);
  }, [onHover]);

  useEffect(() => {
    if (!show) return;
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [show, updatePos]);

  return (
    <>
      <g style={{ cursor: 'pointer' }} onMouseEnter={open} onMouseLeave={close}>
        {/* Pulse rings */}
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={i}
            cx={hub.x}
            cy={hub.y}
            fill="none"
            stroke={BLUE_GLOW}
            strokeWidth={0.12}
            initial={{ r: 0.6, opacity: 0.5 }}
            animate={{ r: 3.5, opacity: 0 }}
            transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.9, ease: 'easeOut' }}
          />
        ))}

        {/* Glow halo */}
        <circle
          cx={hub.x}
          cy={hub.y}
          r={active ? 2.2 : 1.4}
          fill={BLUE_GLOW}
          opacity={active ? 0.3 : 0.15}
          filter="url(#hub-glow)"
        />

        {/* Core dot */}
        <motion.circle
          ref={dotRef}
          cx={hub.x}
          cy={hub.y}
          r={active ? 0.9 : 0.65}
          fill={ACCENT}
          animate={{ r: active ? [0.9, 1.05, 0.9] : 0.65 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <circle cx={hub.x} cy={hub.y} r={0.25} fill="white" opacity={0.85} />
      </g>

      {show && createPortal(
        <div
          className="fixed z-[99999] pointer-events-none"
          style={{ left: pos.x, top: pos.y - 28, transform: 'translate(-50%, -100%)' }}
        >
          <div className="rounded-xl bg-white px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.18)] min-w-[160px]">
            <div className="flex items-center gap-2 mb-2">
              <img src={flagUrl(hub.flag)} alt="" className="w-6 h-4 rounded-sm shadow-sm object-cover" />
              <span className="text-[13px] font-bold text-slate-800">{hub.name}</span>
            </div>
            <div className="flex flex-col gap-1.5 mb-2.5">
              {VISA_TYPES.map((v) => (
                <span key={v} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#00D4FF]/15 flex items-center justify-center shrink-0">
                    <svg className="w-2 h-2 text-[#00D4FF]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  {v}
                </span>
              ))}
            </div>
            <span className="text-[11px] font-semibold text-[#00D4FF]">View details →</span>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rotate-45 -mt-1.5" />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

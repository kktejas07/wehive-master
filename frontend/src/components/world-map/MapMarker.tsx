import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ACCENT, BLUE_GLOW, flagUrl } from './worldMapData';
import type { Hub } from './worldMapData';

const VISA_TYPES = ['Tourist Visa', 'Student Visa', 'Work Visa', 'Business Visa'];

export default function MapMarker({
  hub,
  active,
  onHover,
}: {
  hub: Hub;
  active: boolean;
  onHover: (id: string | null) => void;
}) {
  const [show, setShow] = useState(!!hub.defaultOpen);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dotRef = useRef<SVGCircleElement>(null);

  const updatePos = useCallback(() => {
    if (dotRef.current) {
      const r = dotRef.current.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
  }, []);

  const open = useCallback(() => {
    updatePos();
    setShow(true);
    onHover(hub.id);
  }, [hub.id, onHover, updatePos]);

  const close = useCallback(() => {
    if (hub.defaultOpen) return;
    setShow(false);
    onHover(null);
  }, [hub.defaultOpen, onHover]);

  useEffect(() => {
    if (hub.defaultOpen) {
      const t = setTimeout(updatePos, 100);
      onHover(hub.id);
      return () => clearTimeout(t);
    }
  }, [hub.defaultOpen, hub.id, onHover, updatePos]);

  useEffect(() => {
    if (!show) return;
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [show, updatePos]);

  const tooltipDx = hub.tooltipDx ?? 0;
  const tooltipDy = hub.tooltipDy ?? -80;

  return (
    <>
      <g style={{ cursor: 'pointer' }} onMouseEnter={open} onMouseLeave={close}>
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
          ref={dotRef}
          cx={hub.x}
          cy={hub.y}
          r={active ? 0.75 : 0.55}
          fill={ACCENT}
          animate={{ r: active ? [0.75, 0.85, 0.75] : 0.55 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <circle cx={hub.x} cy={hub.y} r={0.18} fill="white" opacity={0.9} />
      </g>

      {show && createPortal(
        <div
          className="fixed z-[99999] pointer-events-none"
          style={{
            left: pos.x + tooltipDx,
            top: pos.y + tooltipDy,
          }}
        >
          <div className="relative rounded-xl bg-white px-4 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.22)] min-w-[168px]">
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
            <span className="text-[11px] font-semibold text-[#00D4FF] hover:text-[#00B8D4] cursor-pointer">
              View details →
            </span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

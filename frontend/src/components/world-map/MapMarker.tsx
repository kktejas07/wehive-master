import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ACCENT, BLUE_GLOW, flagUrl } from './worldMapData';
import type { Hub } from './worldMapData';

export default function MapMarker({ hub, active, onHover }: { hub: Hub; active: boolean; onHover: (id: string | null) => void }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dotRef = useRef<SVGCircleElement>(null);

  const open = useCallback(() => {
    if (dotRef.current) {
      const r = dotRef.current.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top });
    }
    setShow(true);
    onHover(hub.id);
  }, [hub.id, onHover]);

  const close = useCallback(() => {
    setShow(false);
    onHover(null);
  }, [onHover]);

  useEffect(() => {
    if (!show) return;
    const handler = () => { if (dotRef.current) { const r = dotRef.current.getBoundingClientRect(); setPos({ x: r.left + r.width / 2, y: r.top }); } };
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [show]);

  return (
    <>
      <g style={{ cursor: 'pointer' }} onMouseEnter={open} onMouseLeave={close}>
        {/* Glow ring */}
        <motion.circle
          cx={hub.x} cy={hub.y}
          r={active ? 2.5 : 1.6}
          fill={active ? BLUE_GLOW : BLUE_GLOW}
          opacity={active ? 0.35 : 0.15}
          animate={{ r: active ? [2.5, 3.2, 2.5] : 1.6 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Core */}
        <motion.circle
          ref={dotRef}
          cx={hub.x} cy={hub.y}
          r={active ? 1.1 : 0.7}
          fill={active ? ACCENT : '#FFFFFF'}
          whileHover={{ scale: 1.6 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        />
        {/* Flag icon positioned above dot */}
        <image
          href={flagUrl(hub.flag)}
          x={hub.x - 6}
          y={hub.y - 11}
          width="12"
          height="9"
          style={{ pointerEvents: 'none', opacity: 0.95 }}
        />
      </g>
      {show && createPortal(
        <div className="fixed z-[99999] pointer-events-none" style={{ left: pos.x, top: pos.y - 32, transform: 'translate(-50%, -100%)' }}>
          <div className="rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 px-3.5 py-2.5 shadow-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <img src={flagUrl(hub.flag)} alt="" className="w-6 h-4 rounded-sm shadow-sm" />
              <span className="text-[12px] font-bold text-slate-800 whitespace-nowrap">{hub.name}</span>
            </div>
            <div className="w-full h-px bg-slate-100 mb-1.5" />
            <div className="flex flex-col gap-0.5">
              {['Tourist Visa', 'Student Visa', 'Work Visa', 'Business Visa'].map((v) => (
                <span key={v} className="text-[10px] text-green-700 flex items-center gap-1">
                  <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  {v}
                </span>
              ))}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-r border-b border-slate-200 rotate-45 -mt-1.5" />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

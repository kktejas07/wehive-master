import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import type { Hub } from './worldMapData';

interface MapMarkerProps {
  hub: Hub;
  active: boolean;
  onHover: (id: string | null) => void;
}

export default function MapMarker({ hub, active, onHover }: MapMarkerProps) {
  const [tooltip, setTooltip] = useState(false);
  const dotRef = useRef<SVGCircleElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const show = useCallback(() => {
    if (dotRef.current) {
      const r = dotRef.current.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top });
    }
    setTooltip(true);
    onHover(hub.id);
  }, [hub.id, onHover]);

  const hide = useCallback(() => {
    setTooltip(false);
    onHover(null);
  }, [onHover]);

  return (
    <>
      <g
        className="cursor-pointer"
        onMouseEnter={show}
        onMouseLeave={hide}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Outer glow */}
        <motion.circle
          cx={hub.x}
          cy={hub.y}
          r={active ? 2.8 : 2}
          fill="#3B82F6"
          opacity={active ? 0.3 : 0.15}
          animate={{ r: active ? [2.8, 3.5, 2.8] : 2 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Core dot */}
        <motion.circle
          ref={dotRef}
          cx={hub.x}
          cy={hub.y}
          r={active ? 1.2 : 0.8}
          fill={active ? '#E1212C' : '#FFFFFF'}
          whileHover={{ scale: 1.5 }}
          transition={{ type: 'spring', stiffness: 300 }}
        />
      </g>

      {tooltip && createPortal(
        <div
          className="fixed z-[99999] pointer-events-none"
          style={{
            left: pos.x,
            top: pos.y - 8,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="relative rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 px-3.5 py-2.5 shadow-xl shadow-slate-900/15">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm">{hub.flag || '📍'}</span>
              <span className="text-[12.5px] font-bold text-slate-800">{hub.name}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {hub.visaTypes.map((v) => (
                <span key={v} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
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

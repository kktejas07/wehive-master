import { useMemo } from 'react';
import { arc } from './worldMapUtils';
import { ACCENT } from './worldMapData';
import type { Point } from './worldMapUtils';

export default function FlightRoutes({ from, to, active }: { from: Point; to: Point; active: boolean }) {
  const { midX, midY } = useMemo(() => arc(from, to), [from.x, from.y, to.x, to.y]);
  const d = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;

  return (
    <g>
      {/* Soft underglow */}
      <path
        d={d}
        fill="none"
        stroke={ACCENT}
        strokeWidth={active ? 6 : 4}
        strokeLinecap="round"
        opacity={active ? 0.25 : 0.1}
        filter="url(#route-glow)"
      />
      {/* Base dashed line */}
      <path
        d={d}
        fill="none"
        stroke={ACCENT}
        strokeWidth={active ? 2.4 : 1.6}
        strokeLinecap="round"
        strokeDasharray="10 7"
        opacity={active ? 0.8 : 0.4}
      />
      {/* Moving highlight */}
      <path
        d={d}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={active ? 2.2 : 1.4}
        strokeLinecap="round"
        strokeDasharray="6 60"
        opacity={active ? 0.9 : 0.5}
      >
        <animate
          attributeName="stroke-dashoffset"
          from="66"
          to="0"
          dur="2.2s"
          repeatCount="indefinite"
        />
      </path>
    </g>
  );
}

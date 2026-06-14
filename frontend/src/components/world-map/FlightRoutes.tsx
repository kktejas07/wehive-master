import { useMemo } from 'react';
import { arc } from './worldMapUtils';
import { ACCENT } from './worldMapData';
import type { Point } from './worldMapUtils';

export default function FlightRoutes({ from, to, active }: { from: Point; to: Point; active: boolean }) {
  const { midX, midY } = useMemo(() => arc(from, to), [from.x, from.y, to.x, to.y]);
  const d = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;

  return (
    <g>
      {/* Soft glow under the route */}
      <path
        d={d}
        fill="none"
        stroke={ACCENT}
        strokeWidth={active ? 0.6 : 0.35}
        strokeLinecap="round"
        strokeDasharray="1.2 0.8"
        opacity={active ? 0.35 : 0.12}
        filter="url(#route-glow)"
      />
      {/* Main dashed arc */}
      <path
        d={d}
        fill="none"
        stroke={ACCENT}
        strokeWidth={active ? 0.25 : 0.15}
        strokeLinecap="round"
        strokeDasharray="0.9 0.6"
        opacity={active ? 0.75 : 0.35}
      />
    </g>
  );
}

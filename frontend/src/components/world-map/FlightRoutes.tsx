import { useMemo } from 'react';
import { arc } from './worldMapUtils';
import { ACCENT } from './worldMapData';
import type { Point } from './worldMapUtils';

export default function FlightRoutes({ from, to, active }: { from: Point; to: Point; active: boolean }) {
  const { midX, midY } = useMemo(() => arc(from, to), [from.x, from.y, to.x, to.y]);
  const d = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={ACCENT}
        strokeWidth={0.5}
        strokeLinecap="round"
        strokeDasharray="1.4 1"
        opacity={active ? 0.25 : 0.1}
        filter="url(#route-glow)"
      />
      <path
        d={d}
        fill="none"
        stroke={ACCENT}
        strokeWidth={active ? 0.22 : 0.14}
        strokeLinecap="round"
        strokeDasharray="1 0.7"
        opacity={active ? 0.85 : 0.45}
      />
    </g>
  );
}

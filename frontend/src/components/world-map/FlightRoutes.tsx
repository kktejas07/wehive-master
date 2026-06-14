import { useMemo } from 'react';
import { arc } from './worldMapUtils';
import type { Point } from './worldMapUtils';

export default function FlightRoutes({ from, to, active, index }: { from: Point; to: Point; active: boolean; index: number }) {
  const { midX, midY } = useMemo(() => arc(from, to), [from.x, from.y, to.x, to.y]);
  const id = `r${index}`;

  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
          <stop offset="50%" stopColor="#3B82F6" stopOpacity={active ? 0.7 : 0.2} />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={active ? 0.5 : 0.2}
        strokeLinecap="round"
      />
    </g>
  );
}

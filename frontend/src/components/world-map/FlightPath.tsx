import { useMemo } from 'react';
import { arc } from './worldMapUtils';
import { NAVY, ACCENT } from './worldMapData';
import type { Point } from './worldMapUtils';

interface FlightPathProps {
  from: Point;
  to: Point;
  active: boolean;
}

export default function FlightPath({ from, to, active }: FlightPathProps) {
  const { midX, midY } = useMemo(() => arc(from, to), [from.x, from.y, to.x, to.y]);
  const gradientId = `fg-${Math.round(from.x + to.x + from.y + to.y)}`;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={NAVY} stopOpacity="0" />
          <stop offset="50%" stopColor={active ? ACCENT : NAVY} stopOpacity={active ? 0.8 : 0.35} />
          <stop offset="100%" stopColor={NAVY} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={active ? 1.5 : 0.8}
        strokeDasharray={active ? 'none' : '2 4'}
        opacity={active ? 0.9 : 0.35}
      />
    </svg>
  );
}

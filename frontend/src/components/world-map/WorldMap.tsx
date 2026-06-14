import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  HUBS,
  CONNECTIONS,
  PLANE_ROUTES,
  MAP_IMAGE,
  MAP_W,
  MAP_H,
  NAVY,
} from './worldMapData';
import { arc } from './worldMapUtils';
import { useMapLayout } from './useMapLayout';
import FlightRoutes from './FlightRoutes';
import MapMarker from './MapMarker';
import CountryLabel from './CountryLabel';
import HubTooltip from './HubTooltip';

/** Right-pointing airplane silhouette, centered at origin. */
const PLANE_PATH =
  'M12,0 L2.4,-1.8 L1.2,-1.8 L-1.2,-7.2 L-3.6,-7.2 L-3.6,-1.8 L-8.4,-1.8 L-9.6,-4.8 L-11.4,-4.8 L-11.4,0 L-11.4,4.8 L-9.6,4.8 L-8.4,1.8 L-3.6,1.8 L-3.6,7.2 L-1.2,7.2 L1.2,1.8 L2.4,1.8 Z';

function PlaneAlongPath({
  pathId,
  delay,
  dur,
}: {
  pathId: string;
  delay: number;
  dur: number;
}) {
  return (
    <g filter="url(#plane-glow)">
      <g>
        {/* Comet tail */}
        <ellipse cx={-18} cy={0} rx={14} ry={2.2} fill="white" opacity={0.18} />
        {/* Airplane */}
        <path d={PLANE_PATH} fill="white" />
        <animate
          attributeName="opacity"
          values="0.55;1;0.55"
          dur={`${dur}s`}
          repeatCount="indefinite"
          begin={`${delay}s`}
        />
        <animateMotion dur={`${dur}s`} repeatCount="indefinite" rotate="auto" begin={`${delay}s`}>
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </g>
    </g>
  );
}

interface WorldMapProps {
  className?: string;
  showConnections?: boolean;
}

export default function WorldMap({ className = '', showConnections = true }: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { toPixels } = useMapLayout(containerRef);
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, []);

  const handleHover = useCallback((id: string | null) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    if (id) {
      setHovered(id);
    } else {
      leaveTimer.current = setTimeout(() => setHovered(null), 100);
    }
  }, []);

  const pos = useCallback((id: string) => {
    const h = HUBS.find((hub) => hub.id === id);
    return h ? { x: h.x, y: h.y } : { x: 0, y: 0 };
  }, []);

  const planePaths = useMemo(
    () =>
      PLANE_ROUTES.map(([a, b], i) => {
        const from = pos(a);
        const to = pos(b);
        const { midX, midY } = arc(from, to);
        return {
          id: `plane-path-${i}`,
          d: `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`,
          delay: i * 1.6,
          dur: 9 + i * 1.4,
        };
      }),
    [pos],
  );

  const activeHub = hovered ? HUBS.find((h) => h.id === hovered) : null;
  const activePos = activeHub ? toPixels(activeHub.x, activeHub.y) : null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ background: NAVY }}
      onMouseLeave={() => handleHover(null)}
    >
      {/* World map background image (not redrawn) */}
      <img
        src={MAP_IMAGE}
        alt="World map"
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        draggable={false}
      />

      {/* Dark navy overlay for depth + contrast */}
      <div className="absolute inset-0 bg-[#000B2E]/25 pointer-events-none" />

      {/* Soft vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 75% 80% at 50% 50%, transparent 40%, rgba(0,5,16,0.55) 100%)',
        }}
      />

      {/* Interactive SVG layer — shares the image coordinate space */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="wm-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="white" strokeWidth="0.4" opacity="0.04" />
          </pattern>

          <filter id="hub-glow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="route-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" />
          </filter>

          <filter id="plane-glow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Hidden paths used to drive airplane motion */}
          {planePaths.map((p) => (
            <path key={p.id} id={p.id} d={p.d} fill="none" stroke="none" />
          ))}
        </defs>

        {/* Subtle grid */}
        <rect width={MAP_W} height={MAP_H} fill="url(#wm-grid)" />

        {/* Routes + planes */}
        {mounted && showConnections && (
          <>
            {CONNECTIONS.map(([a, b], i) => (
              <FlightRoutes
                key={i}
                from={pos(a)}
                to={pos(b)}
                active={hovered === a || hovered === b}
              />
            ))}
            {planePaths.map((p) => (
              <PlaneAlongPath key={p.id} pathId={p.id} delay={p.delay} dur={p.dur} />
            ))}
          </>
        )}

        {/* Hub markers */}
        {mounted &&
          HUBS.map((h) => (
            <MapMarker key={h.id} hub={h} active={hovered === h.id} onHover={handleHover} />
          ))}
      </svg>

      {/* Country label pills (projected to screen pixels) */}
      {mounted &&
        HUBS.map((h) => {
          const p = toPixels(h.x, h.y);
          return (
            <CountryLabel
              key={`label-${h.id}`}
              hub={h}
              active={hovered === h.id}
              left={p.left}
              top={p.top}
              onHover={handleHover}
            />
          );
        })}

      {/* Hover tooltip */}
      {mounted && activeHub && activePos && (
        <HubTooltip hub={activeHub} left={activePos.left} top={activePos.top} />
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-40 rounded-xl bg-[#061440]/75 backdrop-blur-md border border-white/[0.08] px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col gap-2 sm:gap-2.5 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]" />
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-300/90">Active Visa Hub</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-6 sm:w-7 h-[3px] shrink-0" viewBox="0 0 28 3">
            <line x1="0" y1="1.5" x2="28" y2="1.5" stroke="#00E5FF" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
          </svg>
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-300/90">Flight Route</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 16 16">
            <path d="M1,8 L6,5.5 L6,10.5 Z" fill="white" opacity="0.9" />
          </svg>
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-300/90">Live Flight</span>
        </div>
      </div>

      {/* Status badges */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2 z-40 pointer-events-none">
        <div className="flex items-center gap-1.5 sm:gap-2 bg-[#061440]/75 backdrop-blur-md rounded-full px-2.5 py-1 sm:px-3.5 sm:py-1.5 border border-white/[0.08]">
          <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34D399]" />
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-300/90">Live</span>
        </div>
        <div className="flex items-center bg-[#061440]/75 backdrop-blur-md rounded-full px-2.5 py-1 sm:px-3.5 sm:py-1.5 border border-white/[0.08]">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-300/90 whitespace-nowrap">250+ Destinations</span>
        </div>
      </div>
    </div>
  );
}

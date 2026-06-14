import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HUBS, CONNECTIONS, PLANE_ROUTES, NAVY, NAVY_LIGHT, ACCENT, DOT_COLOR } from './worldMapData';
import { CONTINENT_PATHS } from './worldMapPaths';
import { arc } from './worldMapUtils';
import FlightRoutes from './FlightRoutes';
import MapMarker from './MapMarker';
import CountryLabel from './CountryLabel';

function PlaneIcon() {
  return (
    <g>
      <ellipse cx={-1.5} cy={0} rx={2.2} ry={0.4} fill="white" opacity={0.2} />
      <path
        d="M-1,-1.2 L3.5,0 L-1,1.2 L0.2,0 Z"
        fill="white"
        opacity={0.95}
      />
      <path d="M0.5,-0.5 L2.5,0 L0.5,0.5 Z" fill={ACCENT} opacity={0.35} />
    </g>
  );
}

function Plane({ from, to, delay, dur = 9 }: { from: { x: number; y: number }; to: { x: number; y: number }; delay: number; dur?: number }) {
  const { midX, midY } = useMemo(() => arc(from, to), [from.x, from.y, to.x, to.y]);
  const pathD = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;

  return (
    <motion.g
      initial={{ offsetDistance: '0%' }}
      animate={{ offsetDistance: '100%' }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: 'linear' }}
      style={{
        offsetPath: `path('${pathD}')`,
        offsetRotate: 'auto',
      }}
    >
      <PlaneIcon />
    </motion.g>
  );
}

interface WorldMapProps {
  className?: string;
  showConnections?: boolean;
}

export default function WorldMap({ className = '', showConnections = true }: WorldMapProps) {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<string | null>('india');

  useEffect(() => { setMounted(true); }, []);

  const pos = useCallback((id: string) => {
    const h = HUBS.find((hub) => hub.id === id);
    return h ? { x: h.x, y: h.y } : { x: 0, y: 0 };
  }, []);

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ background: NAVY }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-full w-auto max-w-full aspect-[2/1]">

          {/* Background */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 80% 70% at 50% 50%, ${NAVY_LIGHT} 0%, ${NAVY} 70%, #000510 100%)`,
            }}
          />

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
            <defs>
              <pattern id="wm-grid" width="3" height="3" patternUnits="userSpaceOnUse">
                <path d="M 3 0 L 0 0 0 3" fill="none" stroke="white" strokeWidth="0.025" opacity="0.05" />
              </pattern>

              <pattern id="wm-dots" width="0.32" height="0.32" patternUnits="userSpaceOnUse">
                <circle cx="0.16" cy="0.16" r="0.065" fill={DOT_COLOR} opacity="0.75" />
              </pattern>

              <pattern id="wm-dots-bright" width="0.64" height="0.64" patternUnits="userSpaceOnUse">
                <circle cx="0.32" cy="0.32" r="0.08" fill={ACCENT} opacity="0.35" />
              </pattern>

              <filter id="hub-glow" x="-150%" y="-150%" width="400%" height="400%">
                <feGaussianBlur stdDeviation="0.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="route-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="0.35" />
              </filter>

              <filter id="map-glow" x="-5%" y="-5%" width="110%" height="110%">
                <feGaussianBlur stdDeviation="0.15" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect width="100" height="50" fill="url(#wm-grid)" />

            <g fill="url(#wm-dots)" filter="url(#map-glow)">
              {CONTINENT_PATHS.map((d, i) => (
                <path key={i} d={d} fillRule="evenodd" />
              ))}
            </g>

            <g fill="url(#wm-dots-bright)" opacity="0.5">
              {CONTINENT_PATHS.map((d, i) => (
                <path key={i} d={d} fillRule="evenodd" />
              ))}
            </g>

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
                {PLANE_ROUTES.map(([a, b], i) => (
                  <Plane
                    key={`plane-${i}`}
                    from={pos(a)}
                    to={pos(b)}
                    delay={i * 1.8}
                    dur={8 + i * 1.2}
                  />
                ))}
              </>
            )}

            {mounted && HUBS.map((h) => (
              <MapMarker
                key={h.id}
                hub={h}
                active={hovered === h.id}
                onHover={setHovered}
              />
            ))}
          </svg>

          {mounted && HUBS.map((h) => (
            <CountryLabel key={`label-${h.id}`} hub={h} active={hovered === h.id} />
          ))}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-40 rounded-xl bg-[#061440]/75 backdrop-blur-md border border-white/[0.08] px-4 py-3 flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]" />
              <span className="text-[11px] font-medium text-slate-300/90">Active Visa Hub</span>
            </div>
            <div className="flex items-center gap-2.5">
              <svg className="w-7 h-[3px] shrink-0" viewBox="0 0 28 3">
                <line x1="0" y1="1.5" x2="28" y2="1.5" stroke="#00E5FF" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
              </svg>
              <span className="text-[11px] font-medium text-slate-300/90">Flight Route</span>
            </div>
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16">
                <path d="M1,8 L6,5.5 L6,10.5 Z" fill="white" opacity="0.9" />
              </svg>
              <span className="text-[11px] font-medium text-slate-300/90">Live Flight</span>
            </div>
          </div>

          {/* Status badges */}
          <div className="absolute top-4 right-4 flex items-center gap-2.5 z-40">
            <div className="flex items-center gap-2 bg-[#061440]/75 backdrop-blur-md rounded-full px-3.5 py-1.5 border border-white/[0.08]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34D399]" />
              <span className="text-[11px] font-semibold text-slate-300/90">Live</span>
            </div>
            <div className="flex items-center bg-[#061440]/75 backdrop-blur-md rounded-full px-3.5 py-1.5 border border-white/[0.08]">
              <span className="text-[11px] font-semibold text-slate-300/90 whitespace-nowrap">250+ Destinations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';

// Branded loaders from the design handoff: "thinking" (fin + rotating status
// lines), "flight-plan" (jet flying Apply → Depart) and "radar" (sweep + blips).
// variant="auto" (default) shows a different loader each time one appears and
// moves to the next one every loop (8s) while loading continues.
export const VARIANTS = ['thinking', 'flight-plan', 'radar'];
const LOOP_MS = 8000;
const STATUS = ['Verifying your documents…', 'Examining paper records…', 'Plotting your route…', 'Clearing for takeoff…'];
const STEPS = ['Apply', 'Documents', 'Vetting', 'Visa', 'Depart'];
const BLIPS = [
  { left: '70%', top: '22%', delay: '.7s' },
  { left: '24%', top: '30%', delay: '1.6s', red: true },
  { left: '62%', top: '74%', delay: '2.3s' },
  { left: '18%', top: '66%', delay: '1.1s', red: true },
];
const FIN = 'M0,308 L222,25 C240,4 262,0 288,0 L340,0 L346,306 L200,308 C182,290 184,262 200,238 L210,212 C168,272 92,308 0,308Z';
const PLANE = 'M0,-23 L3,-8 L4,-5 L22,7 L22,12 L4,7 L4,16 L10,22 L10,25 L0,22 L-10,25 L-10,22 L-4,16 L-4,7 L-22,12 L-22,7 L-4,-5 L-3,-8Z';

let shown = 0; // round-robin across mounts, so consecutive loads differ

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Fin() {
  return (
    <svg className="fin" viewBox="0 0 350 310" aria-hidden="true">
      <path className="body" d={FIN} />
      <g transform="translate(262,142) rotate(42) scale(2.1)" className="plane"><path d={PLANE} /></g>
    </svg>
  );
}

function Thinking({ lines }) {
  return (
    <div className="wh-loader wh-think">
      <Fin />
      <div className="w">{lines.map((l) => <span key={l}>{l}</span>)}</div>
    </div>
  );
}

function FlightPlan({ caption }) {
  return (
    <div className="wh-loader wh-plan">
      <div className="rt">
        <div className="base" />
        <div className="prog" />
        {STEPS.map((s) => <div key={s} className="n"><b>{s}</b></div>)}
        <svg className="jet" viewBox="-24 -26 48 54" aria-hidden="true"><path d={PLANE} /></svg>
      </div>
      {caption && <div className="cap">{caption}</div>}
    </div>
  );
}

function Radar({ caption, size }) {
  return (
    <div className="wh-loader wh-radar" style={{ '--wh-radar': `${size}px` }}>
      <div className="rd">
        <div className="sw" />
        {BLIPS.map((b) => (
          <i key={b.left} className="bl" style={{ left: b.left, top: b.top, animationDelay: b.delay, background: b.red ? 'var(--wh-red)' : undefined }} />
        ))}
        <Fin />
      </div>
      {caption && <div className="tag">{caption}</div>}
    </div>
  );
}

export default function WeHiveLoader({ label = 'Loading', variant = 'auto', size = 240, className = '', showLabel = true }) {
  const [current, setCurrent] = useState(() => (variant === 'auto' ? VARIANTS[shown++ % VARIANTS.length] : variant));

  useEffect(() => {
    if (variant !== 'auto') { setCurrent(variant); return undefined; }
    if (reducedMotion()) return undefined;
    const t = setInterval(() => setCurrent((v) => VARIANTS[(VARIANTS.indexOf(v) + 1) % VARIANTS.length]), LOOP_MS);
    return () => clearInterval(t);
  }, [variant]);

  const custom = label !== 'Loading';
  const caption = showLabel ? `${custom ? label.toUpperCase() : current === 'radar' ? 'SCANNING ROUTES' : 'FLIGHT PLAN'} · YOUR GLOBAL JOURNEY STARTS HERE` : null;

  return (
    <div role="status" aria-live="polite" data-variant={current} className={`wh-loader-in flex flex-col items-center justify-center ${className}`}>
      {current === 'thinking' && <Thinking lines={custom ? [`${label}…`] : STATUS} />}
      {current === 'flight-plan' && <FlightPlan caption={caption} />}
      {current === 'radar' && <Radar caption={caption} size={size} />}
      <span className="sr-only">{label}…</span>
    </div>
  );
}

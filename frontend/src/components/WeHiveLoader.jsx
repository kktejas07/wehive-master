// Branded loading animation: a WeHive-red plane flying a dashed route around a
// royal-blue globe ("Your Global Journey Starts Here"). Pure SVG + CSS, no
// assets. Respects prefers-reduced-motion via the global rule in index.css.
export default function WeHiveLoader({ label = 'Loading', size = 96, className = '', showLabel = true }) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
        {/* flight route */}
        <circle cx="48" cy="48" r="36" fill="none" stroke="hsl(var(--blue-200))" strokeWidth="1.5" strokeDasharray="3 5" />
        {/* globe */}
        <g className="wh-pulse" fill="none" stroke="hsl(var(--blue-700))" strokeWidth="2">
          <circle cx="48" cy="48" r="16" />
          <ellipse cx="48" cy="48" rx="7" ry="16" />
          <path d="M32 48h32M34.5 40h27M34.5 56h27" strokeWidth="1.5" />
        </g>
        {/* plane + contrail, orbiting */}
        <g className="wh-orbit">
          <circle cx="48" cy="48" r="36" fill="none" stroke="hsl(var(--red-500))" strokeWidth="2" strokeLinecap="round"
            strokeDasharray="40 226" transform="rotate(-154 48 48)" opacity="0.45" />
          <path transform="translate(48 12)" fill="hsl(var(--red-500))"
            d="M7 0L-3-1.2-5-6.5h-2.2l1.6 5.3-2.4.2-1-2.4h-1.4l.8 3.3-.8 3.3h1.4l1-2.4 2.4.2-1.6 5.3h2.2L-3 1.2z" />
        </g>
      </svg>
      {showLabel ? (
        <span className="text-[13px] font-semibold text-[hsl(var(--blue-900))]">{label}…</span>
      ) : (
        <span className="sr-only">{label}…</span>
      )}
    </div>
  );
}

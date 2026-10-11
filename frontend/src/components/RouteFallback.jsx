// Route-level loading skeleton shown while a lazy page chunk streams in.
// Mirrors the shell (fixed 64/72px header, max-w-7xl container) so the page
// doesn't jump when the real content arrives.
function Bar({ className = '' }) {
  return <div className={`rounded-lg bg-[hsl(var(--blue-50))] ${className}`} />;
}

export default function RouteFallback() {
  return (
    <div
      data-testid="route-fallback"
      role="status"
      aria-live="polite"
      className="min-h-screen bg-white"
    >
      <span className="sr-only">Loading page…</span>
      <div aria-hidden="true" className="h-16 sm:h-[72px] border-b border-[hsl(var(--border))] bg-white">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Bar className="h-8 w-28" />
          <div className="hidden lg:flex gap-3">
            <Bar className="h-4 w-16" />
            <Bar className="h-4 w-20" />
            <Bar className="h-4 w-16" />
            <Bar className="h-4 w-14" />
          </div>
          <Bar className="h-10 w-24 rounded-xl" />
        </div>
      </div>
      <div aria-hidden="true" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 animate-pulse">
        <Bar className="h-3 w-24" />
        <Bar className="mt-5 h-10 md:h-12 w-full max-w-xl" />
        <Bar className="mt-3 h-10 md:h-12 w-2/3 max-w-md" />
        <Bar className="mt-6 h-4 w-full max-w-lg" />
        <Bar className="mt-2 h-4 w-5/6 max-w-md" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-[hsl(var(--border))] p-6">
              <Bar className="h-10 w-10 rounded-xl" />
              <Bar className="mt-5 h-5 w-2/3" />
              <Bar className="mt-3 h-3 w-full" />
              <Bar className="mt-2 h-3 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

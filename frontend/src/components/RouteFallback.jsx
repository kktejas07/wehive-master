import WeHiveLoader from './WeHiveLoader';

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
      className="min-h-screen bg-white"
    >
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
      <WeHiveLoader label="Loading" className="py-32" showLabel={false} />
    </div>
  );
}

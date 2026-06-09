import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props} />
  );
}

function SkeletonCard({ className }) {
  return (
    <div className={cn("rounded-2xl overflow-hidden bg-[hsl(var(--blue-900))]/5 border border-black/5", className)}>
      <Skeleton className="aspect-[2/3] w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function SkeletonGrid({ count = 10, columns = "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5" }) {
  return (
    <div className={`grid ${columns} gap-3 sm:gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" style={{ width: `${100 - i * 15}%` }} />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonGrid, SkeletonTable, SkeletonText }

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  variant = "default",
  animation = "pulse",
  ...props
}) {
  const variants = {
    default: "bg-[hsl(var(--blue-100))]",
    light: "bg-white/20",
    dark: "bg-[hsl(var(--blue-900))]/20",
    accent: "bg-[hsl(var(--accent))]/20",
  }

  const animations = {
    pulse: "animate-pulse",
    wave: "animate-shimmer",
    bounce: "animate-bounce-slow",
    none: "",
  }

  return (
    <div
      className={cn(
        "rounded-md",
        variants[variant] || variants.default,
        animations[animation] || animations.pulse,
        className
      )}
      {...props}
    />
  )
}

function SkeletonText({
  lines = 3,
  className,
  startOn = 0,
  endOn = 0,
  variant = "default",
  animation = "wave",
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => {
        const isFirst = i === 0
        const isLast = i === lines - 1
        const skipStart = isFirst && startOn > 0
        const skipEnd = isLast && endOn > 0

        if (skipStart) return <div key={i} className="h-4" style={{ width: `${startOn}%` }} />
        if (skipEnd) return <div key={i} className="h-4" style={{ width: `${endOn}%` }} />

        const width = isLast
          ? `${100 - (lines - 1) * 10}%`
          : i === 0
            ? "100%"
            : `${100 - i * 12}%`

        return (
          <Skeleton
            key={i}
            className="h-4"
            style={{ width }}
            variant={variant}
            animation={animation}
          />
        )
      })}
    </div>
  )
}

function SkeletonCard({
  className,
  imageHeight = "h-48",
  lines = 3,
  variant = "default",
  animation = "wave",
  showImage = true,
  showFooter = true,
}) {
  return (
    <div className={cn(
      "rounded-2xl overflow-hidden bg-white border border-black/5 shadow-sm",
      className
    )}>
      {showImage && (
        <Skeleton
          className={cn("w-full", imageHeight)}
          variant={variant}
          animation={animation}
        />
      )}
      <div className="p-4 space-y-3">
        <Skeleton
          className="h-5 w-3/4"
          variant={variant}
          animation={animation}
        />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-3 w-full"
            style={{ width: `${100 - i * 20}%` }}
            variant={variant}
            animation={animation}
          />
        ))}
        {showFooter && (
          <div className="pt-2 flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-full" variant={variant} animation={animation} />
            <Skeleton className="h-8 w-20 rounded-full" variant={variant} animation={animation} />
          </div>
        )}
      </div>
    </div>
  )
}

function SkeletonRect({
  className,
  children,
  aspectRatio,
  width,
  height,
  variant = "default",
  animation = "wave",
  borderRadius = "rounded-xl",
  showContent = false,
  contentPosition = "bottom",
  ...props
}) {
  const style = {
    ...(aspectRatio && { aspectRatio }),
    ...(width && { width }),
    ...(height && { height }),
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-white border border-black/5",
        borderRadius,
        className
      )}
      style={style}
      {...props}
    >
      <Skeleton
        className="absolute inset-0"
        variant={variant}
        animation={animation}
      />

      {showContent && children && (
        <div className={cn(
          "absolute left-0 right-0 p-3",
          contentPosition === "bottom" && "bottom-0",
          contentPosition === "top" && "top-0",
          contentPosition === "center" && "top-1/2 -translate-y-1/2"
        )}>
          {children}
        </div>
      )}
    </div>
  )
}

function SkeletonGrid({
  count = 10,
  columns = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  gap = "gap-4",
  className,
  lines = 3,
  variant = "default",
  animation = "wave",
}) {
  return (
    <div className={cn("grid", columns, gap, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard
          key={i}
          lines={lines}
          variant={variant}
          animation={animation}
        />
      ))}
    </div>
  )
}

function SkeletonTable({
  rows = 5,
  cols = 4,
  className,
  variant = "default",
  animation = "wave",
  rowHeight = "h-14",
  headerHeight = "h-10",
  showHeader = true,
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {showHeader && (
        <div className="flex gap-4 pb-2 border-b border-black/5">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn("h-full flex-1", headerHeight)}
              variant={variant}
              animation={animation}
            />
          ))}
        </div>
      )}

      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIdx) => {
            const isLast = colIdx === cols - 1
            return (
              <Skeleton
                key={colIdx}
                className={cn(
                  "flex-1",
                  rowHeight,
                  isLast && "max-w-[60px]"
                )}
                variant={variant}
                animation={animation}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

function SkeletonAvatar({
  size = "md",
  className,
  variant = "default",
  animation = "wave",
  shape = "circle",
}) {
  const sizes = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
    "2xl": "w-20 h-20",
  }

  return (
    <Skeleton
      className={cn(
        sizes[size] || sizes.md,
        shape === "circle" ? "rounded-full" : "rounded-xl",
        className
      )}
      variant={variant}
      animation={animation}
    />
  )
}

function SkeletonButton({
  className,
  variant = "default",
  animation = "wave",
  width = "w-24",
  height = "h-10",
}) {
  return (
    <Skeleton
      className={cn(width, height, "rounded-full", className)}
      variant={variant}
      animation={animation}
    />
  )
}

function SkeletonBadge({
  className,
  variant = "default",
  animation = "wave",
  width = "w-16",
  height = "h-6",
}) {
  return (
    <Skeleton
      className={cn(width, height, "rounded-full", className)}
      variant={variant}
      animation={animation}
    />
  )
}

function SkeletonList({
  count = 5,
  className,
  variant = "default",
  animation = "wave",
  showAvatar = true,
  avatarSize = "sm",
  lines = 2,
  gap = "gap-4",
}) {
  return (
    <div className={cn("flex flex-col", gap, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {showAvatar && <SkeletonAvatar size={avatarSize} variant={variant} animation={animation} />}
          <div className="flex-1 space-y-2">
            <Skeleton
              className="h-4 w-1/3"
              variant={variant}
              animation={animation}
            />
            <SkeletonText lines={lines} variant={variant} animation={animation} className="max-w-xs" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SkeletonStats({
  count = 4,
  className,
  variant = "default",
  animation = "wave",
}) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-2xl bg-white border border-black/5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" variant={variant} animation={animation} />
            <Skeleton className="w-8 h-8 rounded-lg" variant={variant} animation={animation} />
          </div>
          <Skeleton className="h-8 w-24" variant={variant} animation={animation} />
          <Skeleton className="h-3 w-16" variant={variant} animation={animation} />
        </div>
      ))}
    </div>
  )
}

function SkeletonPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <SkeletonText lines={4} />
      </div>

      <SkeletonTable rows={5} cols={4} />
    </div>
  )
}

function SkeletonHero() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(var(--blue-900))]/5 to-[hsl(var(--blue-700))]/10 border border-black/5 p-8 md:p-12">
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-12 w-full max-w-lg" />
        <Skeleton className="h-8 w-full max-w-md" />
        <SkeletonText lines={3} />
        <div className="flex gap-4 pt-4">
          <Skeleton className="h-12 w-40 rounded-full" />
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
      </div>
      <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:block">
        <Skeleton className="w-48 h-48 rounded-2xl" />
      </div>
    </div>
  )
}

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonRect,
  SkeletonGrid,
  SkeletonTable,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonBadge,
  SkeletonList,
  SkeletonStats,
  SkeletonPage,
  SkeletonHero,
}
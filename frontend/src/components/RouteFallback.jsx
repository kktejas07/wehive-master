import { motion } from 'framer-motion';

/**
 * Suspense fallback shown while a lazy-loaded route chunk is fetched.
 * Brand-aligned with Aurora background + animated logo pulse — keeps the
 * boot perception feeling intentional rather than blank.
 */
export default function RouteFallback() {
  return (
    <div
      data-testid="route-fallback"
      className="min-h-screen bg-grain aurora-bg flex flex-col items-center justify-center gap-6 px-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-2 border-[hsl(var(--blue-900))]/10" />
          <motion.div
            className="absolute inset-0 h-12 w-12 rounded-full border-2 border-transparent border-t-[hsl(var(--accent))] border-r-[hsl(var(--accent))]"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, ease: 'linear', repeat: Infinity }}
          />
        </div>
        <div className="text-center">
          <div className="font-display font-extrabold text-[hsl(var(--blue-900))] text-[20px] tracking-tight">
            We Hive
          </div>
          <div className="text-[12px] text-[hsl(var(--blue-900))]/55 mt-1">
            Loading your experience…
          </div>
        </div>
      </motion.div>
    </div>
  );
}

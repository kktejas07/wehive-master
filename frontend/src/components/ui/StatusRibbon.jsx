import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

// Top-of-screen ribbon for form outcomes. `variant` is 'success' or 'error'.
// Success gets a short flag-coloured confetti burst; error gets a small shake.
// Both are skipped when the visitor prefers reduced motion.

const STYLES = {
  success: { bar: 'bg-emerald-700', Icon: CheckCircle2, role: 'status', live: 'polite' },
  error: { bar: 'bg-[hsl(var(--red-500))]', Icon: AlertCircle, role: 'alert', live: 'assertive' },
};

const CONFETTI_COLOURS = ['#E10600', '#011CB5', '#FFFFFF', '#E10600', '#011CB5'];

function Confetti() {
  const pieces = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      drift: (Math.random() - 0.5) * 160,
      rotate: Math.random() * 540 - 270,
      delay: Math.random() * 0.25,
      duration: 1.6 + Math.random() * 0.9,
      size: 6 + Math.random() * 6,
      colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
    })),
    []
  );
  return (
    <div className="fixed inset-0 pointer-events-none z-[9997] overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 rounded-[2px] border border-black/10"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.6, backgroundColor: p.colour }}
          initial={{ y: -12, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '70vh', x: p.drift, rotate: p.rotate, opacity: [1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

export default function StatusRibbon({ open, variant = 'success', title, message, onClose, autoHideMs = 6000 }) {
  const reduceMotion = useReducedMotion();
  const style = STYLES[variant] || STYLES.success;
  const { Icon } = style;

  useEffect(() => {
    if (!open || !autoHideMs) return undefined;
    const timer = setTimeout(onClose, autoHideMs);
    return () => clearTimeout(timer);
  }, [open, autoHideMs, onClose]);

  return (
    <>
      {open && variant === 'success' && !reduceMotion && <Confetti />}
      <AnimatePresence>
        {open && (
          <motion.div
            key={`${variant}-${title}`}
            role={style.role}
            aria-live={style.live}
            data-testid={`status-ribbon-${variant}`}
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`fixed top-0 inset-x-0 z-[9998] ${style.bar} text-white shadow-md`}
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
              <motion.span
                className="h-9 w-9 shrink-0 rounded-full bg-white/20 flex items-center justify-center"
                animate={variant === 'error' && !reduceMotion ? { x: [0, -5, 5, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.45, delay: 0.15 }}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[14px] leading-5">{title}</p>
                {message && <p className="text-[13px] leading-5 text-white/90">{message}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Dismiss"
                className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors duration-200"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            {autoHideMs > 0 && (
              <motion.div
                className="h-1 bg-white/40"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: autoHideMs / 1000, ease: 'linear' }}
                style={{ transformOrigin: 'left' }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

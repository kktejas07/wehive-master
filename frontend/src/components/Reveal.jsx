import { motion } from 'framer-motion';

/**
 * Small wrapper that fades + slides children into view when scrolled to.
 * Stagger a list by passing `index` to add a compounding delay.
 *
 *   <Reveal>…</Reveal>
 *   <Reveal as="section" direction="up" delay={0.1}>…</Reveal>
 *   <Reveal index={i}>…</Reveal>
 */
const OFFSETS = {
  up:    { y: 8, x: 0 },
  down:  { y: -8, x: 0 },
  left:  { y: 0, x: 12 },
  right: { y: 0, x: -12 },
  none:  { y: 0, x: 0 },
};

export default function Reveal({
  children,
  as = 'div',
  direction = 'up',
  delay = 0,
  index,
  duration = 0.35,
  className = '',
  once = true,
  amount = 0.15,
  ...rest
}) {
  const Motion = motion[as] || motion.div;
  const off = OFFSETS[direction] || OFFSETS.up;
  const finalDelay = index != null ? Math.min(index * 0.05, 0.3) + delay : delay;

  return (
    <Motion
      initial={{ opacity: 0, x: off.x, y: off.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay: finalDelay, ease: 'easeOut' }}
      className={className}
      {...rest}
    >
      {children}
    </Motion>
  );
}

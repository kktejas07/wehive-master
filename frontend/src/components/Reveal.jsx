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
  up:    { y: 24, x: 0 },
  down:  { y: -24, x: 0 },
  left:  { y: 0, x: 30 },
  right: { y: 0, x: -30 },
  none:  { y: 0, x: 0 },
};

export default function Reveal({
  children,
  as = 'div',
  direction = 'up',
  delay = 0,
  index,
  duration = 0.5,
  className = '',
  once = true,
  amount = 0.15,
  ...rest
}) {
  const Motion = motion[as] || motion.div;
  const off = OFFSETS[direction] || OFFSETS.up;
  const finalDelay = index != null ? Math.min(index * 0.06, 0.45) + delay : delay;

  return (
    <Motion
      initial={{ opacity: 0, x: off.x, y: off.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay: finalDelay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </Motion>
  );
}

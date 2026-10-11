import { motion } from 'framer-motion';

const variants = {
  initial: { opacity: 0, y: 8 },
  enter:   { opacity: 1, y: 0 },
  exit:    { opacity: 0 },
};

export default function PageTransition({ children, className = '' }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

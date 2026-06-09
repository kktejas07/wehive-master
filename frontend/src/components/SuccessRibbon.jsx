import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';

function ConfettiPiece({ x, color, delay, rotation, size }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{
        left: `${x}%`,
        top: '-10px',
        backgroundColor: color,
        width: size,
        height: size * 0.6,
      }}
      initial={{ y: -20, opacity: 1, rotate: 0 }}
      animate={{
        y: ['0vh', '100vh'],
        x: [0, (Math.random() - 0.5) * 200],
        rotate: [0, rotation],
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: 3 + Math.random() * 2,
        delay,
        ease: 'easeOut',
      }}
    />
  );
}

function ConfettiExplosion({ active }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (active) {
      const colors = ['#E1212C', '#0A2C8A', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899'];
      const newParticles = Array.from({ length: 80 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        rotation: Math.random() * 720 - 360,
        size: 6 + Math.random() * 8,
      }));
      setParticles(newParticles);
      const timer = setTimeout(() => setParticles([]), 4000);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {particles.map((p) => (
        <ConfettiPiece key={p.id} {...p} />
      ))}
    </div>
  );
}

function SuccessRibbon({ isVisible, onClose, applicationId, applicantName }) {
  return (
    <>
      <ConfettiExplosion active={isVisible} />
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="fixed top-0 left-0 right-0 z-[9998] bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 shadow-lg shadow-emerald-500/30"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2, damping: 10 }}
                  className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-white font-bold text-[14px]"
                  >
                    Congratulations {applicantName || 'Traveler'}!
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/80 text-[12px]"
                  >
                    Your visa application #{applicationId?.slice(0, 8).toUpperCase()} has been approved!
                  </motion.p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </motion.button>
            </div>
            <motion.div
              className="h-1 bg-white/30"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 5, ease: 'linear' }}
              style={{ transformOrigin: 'left' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default SuccessRibbon;
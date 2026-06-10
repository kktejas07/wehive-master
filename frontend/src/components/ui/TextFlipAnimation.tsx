'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TextFlipAnimation({ words, className = '', interval = 3000 }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, interval);
    return () => clearInterval(timer);
  }, [words.length, interval]);

  return (
    <span className={`inline-block relative ${className}`} style={{ WebkitTextFillColor: 'initial' }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ rotateX: -90, opacity: 0, y: -10 }}
          animate={{ rotateX: 0, opacity: 1, y: 0 }}
          exit={{ rotateX: 90, opacity: 0, y: 10 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
          style={{ 
            display: 'inline-block',
            backfaceVisibility: 'hidden',
            WebkitFontSmoothing: 'antialiased',
          }}
        >
          {words[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function TextFlipDemo() {
  return (
    <div className="font-display font-extrabold text-[40px] sm:text-[64px] lg:text-[80px] tracking-[-0.035em] leading-[1.1] text-[hsl(var(--blue-900))]">
      <TextFlipAnimation
        words={['visa', 'travel', 'journey', 'adventure']}
        className="text-[hsl(var(--accent))]"
      />
    </div>
  );
}
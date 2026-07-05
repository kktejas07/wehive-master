import { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

export default function VoiceWaveform({ isActive, isSpeaking, color = 'hsl(var(--accent))' }) {
  const bars = Array.from({ length: 15 });

  return (
    <div className="flex items-center justify-center gap-1 h-12 px-4 py-2 bg-[hsl(var(--soft-bg))] rounded-2xl border border-black/5 shadow-inner select-none">
      {bars.map((_, i) => {
        // Generate random base heights for visual complexity
        const baseHeight = 6 + (i % 3) * 6;
        
        return (
          <motion.div
            key={i}
            className="w-1 rounded-full"
            style={{
              backgroundColor: color,
              height: baseHeight,
            }}
            animate={
              isActive
                ? {
                    height: [baseHeight, baseHeight * 3.5, baseHeight * 0.8, baseHeight],
                  }
                : isSpeaking
                ? {
                    height: [baseHeight, baseHeight * 2.5, baseHeight * 1.2, baseHeight],
                  }
                : {
                    height: baseHeight,
                  }
            }
            transition={{
              duration: isActive ? 0.6 : 0.9,
              repeat: Infinity,
              repeatType: 'reverse',
              delay: i * 0.05,
              ease: 'easeInOut',
            }}
          />
        );
      })}
      
      <span className="ml-3 text-[11px] font-mono font-bold uppercase tracking-wider text-[hsl(var(--blue-900))]/50">
        {isActive ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Standby'}
      </span>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

function ProgressBar({ progress }) {
  return (
    <div className="w-48 h-1 bg-[hsl(var(--blue-900))]/10 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-[hsl(var(--blue-700))] to-[hsl(var(--accent))]"
        initial={{ width: '0%' }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-[hsl(var(--accent))]"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

export default function RouteFallback() {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Loading your experience');

  const loadingMessages = [
    'Loading your experience',
    'Preparing visa data',
    'Setting up connections',
    'Almost ready',
  ];

  useEffect(() => {
    let p = 0;
    let msgIndex = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15;
      if (p > 100) p = 100;
      setProgress(p);

      if (p > (msgIndex + 1) * 25 && msgIndex < loadingMessages.length - 1) {
        msgIndex++;
        setLoadingText(loadingMessages[msgIndex]);
      }

      if (p >= 100) clearInterval(interval);
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      data-testid="route-fallback"
      className="min-h-screen bg-grain aurora-bg flex flex-col items-center justify-center gap-8 px-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center gap-5"
      >
        <div className="relative">
          <div className="h-14 w-14 rounded-full border-2 border-[hsl(var(--blue-900))]/10" />
          <motion.div
            className="absolute inset-0 h-14 w-14 rounded-full border-2 border-transparent border-t-[hsl(var(--accent))] border-r-[hsl(var(--accent))]"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, ease: 'linear', repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-2 h-10 w-10 rounded-full bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--accent))] opacity-20"
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        <div className="text-center space-y-3">
          <div className="font-display font-extrabold text-[hsl(var(--blue-900))] text-[22px] tracking-tight">
            We Hive
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-[12px] text-[hsl(var(--blue-900))]/55">
              {loadingText}
            </span>
            <LoadingDots />
          </div>
        </div>

        <div className="w-48 space-y-2">
          <ProgressBar progress={progress} />
          <div className="flex justify-between text-[10px] text-[hsl(var(--blue-900))]/40">
            <span>Started</span>
            <span>{Math.round(progress)}%</span>
            <span>Complete</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-6 mt-4"
      >
        {['Fast', 'Secure', 'Reliable'].map((text, i) => (
          <motion.div
            key={text}
            className="flex items-center gap-1.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-blue-500' : 'bg-[hsl(var(--accent))]'
              }`}
            />
            <span className="text-[11px] font-semibold text-[hsl(var(--blue-900))]/60">{text}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

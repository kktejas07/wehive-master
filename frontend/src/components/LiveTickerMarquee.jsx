import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Plane, Star } from 'lucide-react';

const LIVE_UPDATES = [
  { icon: CheckCircle2, text: 'Visa approved for Priya S. · Dubai', time: '2 min ago', color: 'text-emerald-500' },
  { icon: Plane, text: 'Flights booked for Rajesh K. · Tokyo', time: '5 min ago', color: 'text-[hsl(var(--blue-700))]' },
  { icon: Star, text: 'New 5-star review from Sarah M.', time: '8 min ago', color: 'text-amber-500' },
  { icon: CheckCircle2, text: 'Visa approved for Amit C. · Singapore', time: '12 min ago', color: 'text-emerald-500' },
  { icon: Clock, text: 'Application submitted by Deepa R. · UK', time: '15 min ago', color: 'text-[hsl(var(--blue-700))]' },
  { icon: CheckCircle2, text: 'Visa approved for Vikram J. · USA', time: '18 min ago', color: 'text-emerald-500' },
  { icon: Plane, text: 'Hotel booked for WeHive client · Bali', time: '22 min ago', color: 'text-[hsl(var(--blue-700))]' },
  { icon: Star, text: 'New 5-star review from Kumar P.', time: '25 min ago', color: 'text-amber-500' },
  { icon: CheckCircle2, text: 'Visa approved for Neha G. · Canada', time: '28 min ago', color: 'text-emerald-500' },
  { icon: Clock, text: 'Processing started for Farhan A. · Australia', time: '32 min ago', color: 'text-[hsl(var(--blue-700))]' },
];

function LiveBadge() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-emerald-600">Live</span>
    </div>
  );
}

function UpdateItem({ icon: Icon, text, time, color }) {
  return (
    <div className="flex items-center gap-3 px-6 py-2">
      <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
      <span className="text-[13px] font-semibold text-[hsl(var(--blue-900))] whitespace-nowrap">{text}</span>
      <span className="text-[11px] text-[hsl(var(--blue-900))]/40 whitespace-nowrap">{time}</span>
    </div>
  );
}

export default function LiveTickerMarquee() {
  const doubled = [...LIVE_UPDATES, ...LIVE_UPDATES];

  return (
    <div className="relative bg-gradient-to-r from-[hsl(var(--blue-900))] via-[hsl(var(--blue-700))] to-[hsl(var(--blue-900))] py-3 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[hsl(var(--blue-900))] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[hsl(var(--blue-900))] to-transparent z-10" />

      <div className="absolute left-8 top-1/2 -translate-y-1/2 z-20">
        <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
          <LiveBadge />
        </div>
      </div>

      <div className="flex">
        <motion.div
          className="flex gap-8 items-center"
          animate={{ x: ['0%', '-50%'] }}
          transition={{
            duration: 45,
            ease: 'linear',
            repeat: Infinity,
          }}
        >
          {doubled.map((update, i) => {
            const ItemIcon = update.icon;
            return (
              <div key={i} className="flex items-center gap-3">
                <ItemIcon className={`w-4 h-4 ${update.color} flex-shrink-0`} />
                <span className="text-[13px] font-semibold text-white whitespace-nowrap">{update.text}</span>
                <span className="text-[11px] text-white/40 whitespace-nowrap">{update.time}</span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Plane, Star, Newspaper } from 'lucide-react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../context/AuthContext';

const FALLBACK_UPDATES = [
  { icon: CheckCircle2, text: 'Visa approved for Priya S. · Dubai', time: '2 min ago', color: 'text-emerald-600' },
  { icon: Plane, text: 'Flights booked for Rajesh K. · Tokyo', time: '5 min ago', color: 'text-[hsl(var(--blue-700))]' },
  { icon: Star, text: 'New 5-star review from Sarah M.', time: '8 min ago', color: 'text-[hsl(var(--blue-700))]' },
  { icon: CheckCircle2, text: 'Visa approved for Amit C. · Singapore', time: '12 min ago', color: 'text-emerald-600' },
  { icon: Clock, text: 'Application submitted by Deepa R. · UK', time: '15 min ago', color: 'text-[hsl(var(--blue-700))]' },
  { icon: CheckCircle2, text: 'Visa approved for Vikram J. · USA', time: '18 min ago', color: 'text-emerald-600' },
];

function LiveBadge() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
      <span className="text-[12px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--blue-900))]">Live</span>
    </div>
  );
}

function UpdateItem({ icon: Icon, text, time, color }) {
  return (
    <div className="flex items-center gap-3 px-6 py-2">
      <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
      <span className="text-[13px] font-semibold text-[hsl(var(--blue-900))] whitespace-nowrap">{text}</span>
      <span className="text-[12px] text-[hsl(var(--blue-900))]/40 whitespace-nowrap">{time}</span>
    </div>
  );
}

export default function LiveTickerMarquee() {
  const [updates, setUpdates] = useState(FALLBACK_UPDATES);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await axios.get(`${API}/news?limit=10`);
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        if (items.length > 0) {
          const formatted = items.map(news => ({
            icon: Newspaper,
            text: news.title,
            time: new Date(news.date || news.created_at).toLocaleDateString(),
            color: 'text-[hsl(var(--blue-700))]'
          }));
          setUpdates(formatted);
        }
      } catch (err) {
        // silently fallback
      }
    };
    fetchNews();
  }, []);

  const doubled = [...updates, ...updates, ...updates, ...updates, ...updates, ...updates];

  return (
    <div className="relative flex items-stretch bg-white border-y border-[hsl(var(--border))]" aria-label="Recent activity">
      <div className="relative z-20 shrink-0 flex items-center pl-4 pr-3 sm:pl-8 sm:pr-4 bg-white border-r border-[hsl(var(--border))]">
        <LiveBadge />
      </div>

      <div className="relative flex-1 min-w-0 overflow-hidden py-3">
        <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-white to-transparent z-10" aria-hidden="true" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10" aria-hidden="true" />
        <motion.div
          className="flex w-max gap-10 items-center"
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
                <ItemIcon className={`w-4 h-4 ${update.color} flex-shrink-0`} aria-hidden="true" />
                <span className="text-[14px] font-medium text-[hsl(var(--blue-900))] whitespace-nowrap">{update.text}</span>
                <span className="text-[12px] text-muted-foreground whitespace-nowrap">{update.time}</span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
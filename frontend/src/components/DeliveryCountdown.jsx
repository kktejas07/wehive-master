import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

/**
 * Live countdown to a daily cut-off (default 18:00 IST).
 * Visualises Atlys' "Apply by 11:59 PM today for X-day delivery" hook.
 */
export default function DeliveryCountdown({ cutoffHour = 18, label = 'Apply today for', deliveryDays = 7, compact = false }) {
  const [diff, setDiff] = useState(() => msUntilCutoff(cutoffHour));

  useEffect(() => {
    const id = setInterval(() => setDiff(msUntilCutoff(cutoffHour)), 1000);
    return () => clearInterval(id);
  }, [cutoffHour]);

  const { h, m, s } = formatDiff(diff);

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[hsl(var(--accent))]">
        <Clock className="w-3 h-3" />
        {h}h {m}m left
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-3 rounded-full bg-white border border-black/8 pl-2 pr-4 py-1.5 shadow-sm">
      <span className="h-7 w-7 rounded-full bg-[hsl(var(--accent))] inline-flex items-center justify-center">
        <Clock className="w-3.5 h-3.5 text-white" />
      </span>
      <span className="leading-tight">
        <span className="block text-[10px] uppercase tracking-[0.16em] font-bold text-[hsl(var(--blue-900))]/55">
          {label}
        </span>
        <span className="block text-[13px] font-bold text-[hsl(var(--blue-900))]">
          {pad(h)}:{pad(m)}:{pad(s)} until cut-off · {deliveryDays}d delivery
        </span>
      </span>
    </div>
  );
}

function msUntilCutoff(cutoffHour) {
  const now = new Date();
  const target = new Date(now);
  target.setHours(cutoffHour, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target - now;
}

function formatDiff(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { h, m, s };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

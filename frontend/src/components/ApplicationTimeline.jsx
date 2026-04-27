import { Check, Clock, Send, Eye, ShieldCheck, AlertTriangle } from 'lucide-react';

const STATUS_META = {
  draft: { Icon: Clock, color: '#94a3b8', label: 'Draft' },
  submitted: { Icon: Send, color: '#0a2c8a', label: 'Submitted' },
  in_review: { Icon: Eye, color: '#f59e0b', label: 'In review' },
  approved: { Icon: ShieldCheck, color: '#16a34a', label: 'Approved' },
  rejected: { Icon: AlertTriangle, color: '#e1212c', label: 'Action needed' },
};

export default function ApplicationTimeline({ events, currentStatus }) {
  const list = events && events.length ? events : [];
  return (
    <ol className="relative pl-2">
      {list.map((e, i) => {
        const meta = STATUS_META[e.status] || STATUS_META.draft;
        const Icon = meta.Icon;
        const isLast = i === list.length - 1;
        const isActive = e.status === currentStatus;
        return (
          <li key={e.id} className="relative pl-12 pb-7 last:pb-0">
            <span
              className="absolute left-0 top-0 h-9 w-9 rounded-xl text-white inline-flex items-center justify-center"
              style={{ background: meta.color }}
            >
              <Icon className="w-4 h-4" />
            </span>
            {!isLast && <span className="absolute left-[17px] top-9 bottom-0 w-px bg-black/10" />}
            <div className="flex items-center gap-2">
              <div className="text-[15px] font-bold text-[hsl(var(--blue-900))]">{e.label}</div>
              {isActive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(var(--blue-50))] text-[11px] font-bold text-[hsl(var(--blue-700))]">
                  Current
                </span>
              )}
            </div>
            <div className="text-[12.5px] text-[hsl(var(--blue-900))]/55">
              {new Date(e.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
            {e.note && <div className="mt-1 text-[14px] text-[hsl(var(--blue-900))]/75">{e.note}</div>}
          </li>
        );
      })}
      {list.length === 0 && (
        <li className="rounded-xl bg-[hsl(var(--soft-bg))] border border-dashed border-black/15 p-5 text-[14px] text-[hsl(var(--blue-900))]/65">
          Timeline starts after your first submission.
        </li>
      )}
    </ol>
  );
}

export const STATUS_LABELS = STATUS_META;

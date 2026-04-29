import { Sparkles, Check, FileText, ShieldCheck, Star } from 'lucide-react';

export default function AssistCard() {
  const rows = [
    { id: 'a1', icon: FileText, l: 'Passport scan', s: 'Verified' },
    { id: 'a2', icon: ShieldCheck, l: 'Bank statement', s: 'AES-256' },
    { id: 'a3', icon: Star, l: 'Approval probability', s: '94%' },
  ];
  return (
    <div className="rounded-3xl bg-[hsl(var(--soft-bg))] border border-black/5 p-7 sticky top-28">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] font-bold text-[hsl(var(--accent))]">
        <Sparkles className="w-3.5 h-3.5" /> Document AI
      </div>
      <h3 className="mt-2 font-display font-extrabold text-[22px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
        Snap. Upload. Done.
      </h3>
      <p className="mt-2 text-[14px] leading-relaxed text-[hsl(var(--blue-900))]/65">
        Auto-detects rotation, glare and missing pages. You get a green check or
        a one-line fix — never a vague rejection.
      </p>
      <div className="mt-5 space-y-3">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-white border border-black/5 p-3">
              <span className="h-9 w-9 rounded-lg bg-[hsl(var(--blue-50))] inline-flex items-center justify-center text-[hsl(var(--blue-700))]">
                <Icon className="w-4 h-4" />
              </span>
              <div className="flex-1">
                <div className="text-[13.5px] font-bold text-[hsl(var(--blue-900))]">{r.l}</div>
                <div className="text-[12px] text-[hsl(var(--blue-900))]/55">{r.s}</div>
              </div>
              <Check className="w-4 h-4 text-emerald-600" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

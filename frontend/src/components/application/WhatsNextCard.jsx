import { Map, FileText, Send, Headphones } from 'lucide-react';

export default function WhatsNextCard() {
  const items = [
    { id: 'n1', Icon: FileText, t: 'We verify every document', d: 'Your consultant double-checks each upload before submission.' },
    { id: 'n2', Icon: Send, t: 'Embassy filing', d: 'We file with the consulate and lock your appointment slot.' },
    { id: 'n3', Icon: Headphones, t: 'Real-time updates', d: "You'll see status changes live and on email/WhatsApp." },
  ];
  return (
    <section className="rounded-2xl bg-[hsl(var(--blue-900))] text-white p-6 sm:p-7">
      <div>
        <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-white/80 inline-flex items-center gap-2">
          <Map className="w-3.5 h-3.5 text-[hsl(var(--blue-100))]" /> What happens next
        </div>
        <h3 className="mt-2 font-display font-bold text-[22px] tracking-[-0.02em]">
          We take it from here.
        </h3>
        <ul className="mt-4 space-y-3 text-[14px] text-white/85">
          {items.map((n) => {
            const Icon = n.Icon;
            return (
              <li key={n.id} className="flex gap-3">
                <span className="h-9 w-9 shrink-0 rounded-lg bg-white/10 inline-flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-[14px] font-bold">{n.t}</div>
                  <div className="text-[13px] text-white/75">{n.d}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

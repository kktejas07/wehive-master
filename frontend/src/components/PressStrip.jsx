import { PRESS } from '../data/mock';

export default function PressStrip() {
  return (
    <section className="relative py-12 bg-[hsl(var(--soft-bg))] border-y border-black/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--blue-900))]/55 font-bold mb-7">
          <span className="h-px w-8 bg-black/10" /> Featured in <span className="h-px w-8 bg-black/10" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 items-center">
          {PRESS.map((p) => (
            <div
              key={p}
              className="font-display text-center text-[20px] sm:text-[24px] font-bold tracking-[-0.02em] text-[hsl(var(--blue-900))]/55 hover:text-[hsl(var(--blue-900))] transition"
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

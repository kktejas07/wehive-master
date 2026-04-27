import { PRESS } from '../data/mock';

export default function PressStrip() {
  return (
    <section className="relative py-12 bg-white border-y border-black/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--navy-900))]/50 font-semibold mb-7">
          <span className="h-px w-8 bg-black/10" /> Featured in <span className="h-px w-8 bg-black/10" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 items-center">
          {PRESS.map((p) => (
            <div
              key={p}
              className="font-serif-display text-center text-[22px] sm:text-[26px] text-[hsl(var(--navy-900))]/55 hover:text-[hsl(var(--navy-900))] transition"
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

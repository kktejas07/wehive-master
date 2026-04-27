import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';

export default function CtaBanner() {
  return (
    <section className="relative py-20 sm:py-28 bg-[hsl(var(--cream))]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="relative rounded-[28px] overflow-hidden bg-[hsl(var(--navy-900))] text-white p-10 sm:p-16">
          <div className="absolute inset-0 bg-stripes opacity-25 pointer-events-none" />
          <div className="absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full bg-[hsl(var(--accent))]/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />

          <div className="relative grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.16em] font-semibold text-white/65">
                Ready when you are
              </div>
              <h2 className="mt-3 text-[36px] sm:text-[54px] leading-[1.02] font-semibold tracking-tight">
                The visa, sorted{' '}
                <span className="font-serif-display italic font-normal text-white/85">before your coffee.</span>
              </h2>
              <p className="mt-5 text-[16px] sm:text-[18px] leading-relaxed text-white/70 max-w-xl">
                Start in 90 seconds. Pay only when you are ready to submit.
                Cancel any time before submission, no charge.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button className="rounded-full bg-white text-[hsl(var(--navy-900))] hover:bg-white/90 h-12 px-6 font-semibold">
                  Start my application
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-full text-white hover:bg-white/10 h-12 px-5"
                >
                  Talk to a specialist
                </Button>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-white/8 border border-white/12 backdrop-blur p-6">
                <div className="text-[12px] uppercase tracking-[0.14em] text-white/55 font-semibold">
                  Live
                </div>
                <div className="mt-2 font-serif-display text-[36px] leading-tight">
                  &ldquo;Visa for Tokyo approved.&rdquo;
                </div>
                <div className="mt-2 text-[13px] text-white/60">
                  Daniel C. · 2 minutes ago
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { k: 'Avg. processing', v: '7.2 days' },
                    { k: 'On‑time rate', v: '99.4%' },
                    { k: 'Refund cases', v: '<0.6%' },
                  ].map((m) => (
                    <div
                      key={m.k}
                      className="rounded-xl bg-white/5 border border-white/10 p-3"
                    >
                      <div className="text-[11px] uppercase tracking-[0.14em] text-white/55">
                        {m.k}
                      </div>
                      <div className="mt-1 text-[15px] font-semibold">{m.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

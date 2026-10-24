import { ArrowRight, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { BRAND, KEY_STATS } from '../data/mock';
import { useAuth } from '../context/AuthContext';
import Reveal from './Reveal';

const METRICS = [
  { id: 'm1', k: 'Partner universities', v: KEY_STATS.universities },
  { id: 'm2', k: 'Offices', v: `${KEY_STATS.offices} in India & US` },
  { id: 'm3', k: 'Visa guide', v: `${KEY_STATS.countries} countries` },
];

function MetricCard({ k, v }) {
  return (
    <div className="rounded-xl bg-[hsl(var(--soft-bg))] border border-[hsl(var(--border))] p-3">
      <div className="text-[12px] text-muted-foreground font-medium leading-snug">{k}</div>
      <div className="mt-1 text-[16px] font-semibold text-[hsl(var(--blue-900))] tabular-nums">{v}</div>
    </div>
  );
}

export default function CtaBanner() {
  const { isAuthed } = useAuth();
  const navigate = useNavigate();

  const handleStartApp = () => {
    if (isAuthed) {
      navigate('/account');
    } else {
      navigate('/signup');
    }
  };

  return (
    <section id="contact" className="relative py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="relative rounded-2xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--border))] p-6 sm:p-10 lg:p-14">
          <div className="relative grid lg:grid-cols-12 gap-8 sm:gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="text-[12px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--blue-700))]">
                Ready when you are
              </div>
              <h2 className="mt-3 font-display font-bold text-[28px] sm:text-[36px] leading-[1.15] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
                The visa, sorted before your coffee.
              </h2>
              <p className="mt-4 text-[16px] sm:text-[18px] leading-relaxed text-muted-foreground max-w-xl">
                Walk into our Hyderabad office, call us, or start online. Pay only when you are ready to submit.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                <Button variant="accent" onClick={handleStartApp} className="rounded-xl text-white h-12 px-6 font-semibold">
                  Start my application
                  <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
                </Button>
                <a
                  href={`tel:${BRAND.phoneRaw}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-[hsl(var(--border))] hover:border-[hsl(var(--blue-700))]/40 text-[hsl(var(--blue-900))] h-12 px-5 font-semibold transition-colors"
                >
                  <Phone className="w-4 h-4 text-[hsl(var(--blue-700))]" aria-hidden="true" />
                  {BRAND.phone}
                </a>
              </div>
              <a
                href={`mailto:${BRAND.email}`}
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 text-[15px] font-semibold text-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-800))] hover:underline underline-offset-4 break-all"
              >
                <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
                {BRAND.email}
              </a>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-white border border-[hsl(var(--border))] shadow-sm p-5 sm:p-6">
                <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  Recently approved
                </div>
                <div className="mt-3 font-display font-semibold text-[22px] sm:text-[26px] leading-tight text-[hsl(var(--blue-900))]">
                  “Visa for Tokyo approved.”
                </div>
                <div className="mt-2 text-[14px] text-muted-foreground">
                  Daniel C. · 2 minutes ago
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                  {METRICS.map((m) => (
                    <MetricCard key={m.id} k={m.k} v={m.v} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ShieldCheck, Globe2, Heart, Compass, Phone, Mail, MapPin } from 'lucide-react';
import { STATS, BRAND } from '../data/mock';

const VALUES = [
  { id: 'v1', icon: ShieldCheck, t: 'Honesty over hype', d: 'If a visa takes 14 days, we say 14 days. We do not promise instant approvals we cannot deliver.' },
  { id: 'v2', icon: Globe2, t: 'Built for the world', d: 'Operations in 18 cities, 11 languages, and an embassy network spanning 150+ countries.' },
  { id: 'v3', icon: Heart, t: 'Travel changes lives', d: 'We donate 1% of every visa to organizations that fund refugee documentation worldwide.' },
  { id: 'v4', icon: Compass, t: 'Designed end-to-end', d: 'Every screen, email and SMS is crafted in-house. No off-the-shelf forms, no copy-pasted templates.' },
];

function ValueCard({ v }) {
  const Icon = v.icon;
  return (
    <div className="rounded-3xl bg-white border border-black/5 p-8 card-lift">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))]">
        <Icon className="w-5 h-5" />
      </span>
      <h3 className="mt-5 font-display font-extrabold text-[22px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
        {v.t}
      </h3>
      <p className="mt-2 text-[15px] leading-relaxed text-[hsl(var(--blue-900))]/65">{v.d}</p>
    </div>
  );
}

function ContactCard() {
  const items = [
    { id: 'p', Icon: Phone, label: BRAND.phone, href: `tel:${BRAND.phoneRaw}` },
    { id: 'e', Icon: Mail, label: BRAND.email, href: `mailto:${BRAND.email}` },
    { id: 'a', Icon: MapPin, label: BRAND.address },
    { id: 'b', Icon: MapPin, label: BRAND.ballariAddress },
    { id: 'u', Icon: MapPin, label: BRAND.usaAddress },
  ];
  return (
    <div className="rounded-3xl bg-[hsl(var(--blue-900))] text-white p-8 sm:p-10 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 h-[260px] w-[260px] rounded-full bg-[hsl(var(--accent))]/25 blur-3xl" />
      <div className="relative">
        <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-white/70">Visit us</div>
        <h3 className="mt-2 font-display font-extrabold text-[28px] tracking-[-0.025em]">
          Fly with WeHive
        </h3>
        <ul className="mt-6 space-y-3">
          {items.map(({ id, Icon, label, href }) => (
            <li key={id} className="flex items-start gap-3 text-[15px]">
              <Icon className="w-4 h-4 mt-1 text-[hsl(var(--accent))] shrink-0" />
              {href ? (
                <a href={href} className="hover:underline">{label}</a>
              ) : (
                <span>{label}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function About() {
  return (
    <div className="bg-white">
      <Navbar />
      <section className="pt-32 pb-16 bg-[hsl(var(--soft-bg))] border-b border-black/5">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
            About {BRAND.name}
          </div>
          <h1 className="mt-3 font-display font-extrabold text-[44px] sm:text-[72px] leading-[1.02] tracking-[-0.035em] text-[hsl(var(--blue-900))]">
            We believe a visa{' '}
            <span className="text-[hsl(var(--accent))]">should never</span>{' '}
            stand between you and a memory.
          </h1>
          <p className="mt-6 text-[18px] leading-relaxed text-[hsl(var(--blue-900))]/65 max-w-2xl">
            {BRAND.name} Immigration Services was founded with a simple
            promise — bridging dreams and connecting continents. From a small
            office in Hyderabad we now process visas across 60+ countries, with
            transparent fees, honest timelines, and real human counsellors who
            stay with you long after the stamp.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white border-b border-black/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.id}>
              <div className="font-display font-extrabold text-[44px] sm:text-[54px] leading-none tracking-[-0.03em] text-[hsl(var(--blue-900))]">
                {s.value}
              </div>
              <div className="mt-2 text-[13.5px] text-[hsl(var(--blue-900))]/65">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 bg-[hsl(var(--soft-bg))]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid md:grid-cols-2 gap-6">
          {VALUES.map((v) => (
            <ValueCard key={v.id} v={v} />
          ))}
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <ContactCard />
        </div>
      </section>

      <Footer />
    </div>
  );
}

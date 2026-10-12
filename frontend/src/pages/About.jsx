import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ShieldCheck, Globe2, Heart, Compass, Phone, Mail, MapPin } from 'lucide-react';
import { STATS, BRAND, KEY_STATS } from '../data/mock';

const VALUES = [
  { id: 'v1', icon: ShieldCheck, t: 'Honesty over hype', d: 'If a visa takes 14 days, we say 14 days. We do not promise instant approvals we cannot deliver.' },
  { id: 'v2', icon: Globe2, t: 'Built for the world', d: 'Operations in 18 cities, 11 languages, and an embassy network spanning 150+ countries.' },
  { id: 'v3', icon: Heart, t: 'Travel changes lives', d: 'We donate 1% of every visa to organizations that fund refugee documentation worldwide.' },
  { id: 'v4', icon: Compass, t: 'Designed end-to-end', d: 'Every screen, email and SMS is crafted in-house. No off-the-shelf forms, no copy-pasted templates.' },
];

function ValueCard({ v }) {
  const Icon = v.icon;
  return (
    <div className="card-surface card-lift p-6 sm:p-8">
      <span className="icon-tile">
        <Icon className="w-5 h-5" aria-hidden="true" />
      </span>
      <h3 className="h-card mt-5">{v.t}</h3>
      <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground">{v.d}</p>
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
    <div className="card-surface p-6 sm:p-10 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div>
        <div className="eyebrow">Visit us</div>
        <h2 className="h-section mt-3">Fly with WeHive</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">
          Drop by one of our offices or reach a counsellor by phone or email.
        </p>
      </div>
      <ul className="space-y-4">
        {items.map(({ id, Icon, label, href }) => (
          <li key={id} className="flex items-start gap-3 text-[16px] leading-relaxed text-[hsl(var(--blue-900))]">
            <span className="icon-tile h-9 w-9 rounded-lg">
              <Icon className="w-4 h-4" aria-hidden="true" />
            </span>
            <span className="pt-1.5 min-w-0 break-words">
              {href ? (
                <a href={href} className="link-primary">{label}</a>
              ) : (
                label
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function About() {
  return (
    <div className="bg-white">
      <Navbar />
      <section className="pt-28 md:pt-36 pb-16 md:pb-20 mesh-bg border-b border-[hsl(var(--border))]">
        <div className="container-page">
          <div className="max-w-3xl">
            <div className="eyebrow">About {BRAND.name}</div>
            <h1 className="h-display mt-4">
              We believe a visa{' '}
              <span className="text-[hsl(var(--red-500))]">should never</span>{' '}
              stand between you and a memory.
            </h1>
            <p className="lead mt-6 max-w-2xl">
              {BRAND.name} Immigration Services was founded with a simple
              promise — bridging dreams and connecting continents. From a small
              office in Hyderabad we now process visas across {KEY_STATS.countries} countries, with
              transparent fees, honest timelines, and real human counsellors who
              stay with you long after the stamp.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-white border-b border-[hsl(var(--border))]">
        <div className="container-page grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
          {STATS.map((s) => (
            <div key={s.id} className="border-l-2 border-[hsl(var(--blue-100))] pl-4">
              <div className="font-display font-bold text-[36px] sm:text-[44px] leading-none tracking-[-0.02em] text-[hsl(var(--blue-900))]">
                {s.value}
              </div>
              <div className="mt-2 text-[14px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section section-tint">
        <div className="container-page">
          <div className="max-w-2xl">
            <div className="eyebrow">What we stand for</div>
            <h2 className="h-section mt-3">Four promises behind every application</h2>
          </div>
          <div className="mt-10 grid md:grid-cols-2 gap-4 md:gap-6">
            {VALUES.map((v) => (
              <ValueCard key={v.id} v={v} />
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container-page">
          <ContactCard />
        </div>
      </section>

      <Footer />
    </div>
  );
}

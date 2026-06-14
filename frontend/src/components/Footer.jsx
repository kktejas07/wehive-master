import { Link } from 'react-router-dom';
import { Twitter, Instagram, Linkedin, Youtube, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { BRAND, FOOTER_COLS } from '../data/mock';

function FooterColumn({ col }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.16em] text-white/55 font-bold mb-4">
        {col.title}
      </div>
      <ul className="space-y-3">
        {col.links.map((link) => (
          <li key={link.id}>
            <Link to={link.to} className="text-[14px] text-white/75 hover:text-white transition-colors">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterBrand() {
  const socials = [
    { id: 'tw', Icon: Twitter, href: 'https://twitter.com/wehive' },
    { id: 'ig', Icon: Instagram, href: 'https://instagram.com/wehive' },
    { id: 'li', Icon: Linkedin, href: 'https://linkedin.com/company/wehive' },
    { id: 'yt', Icon: Youtube, href: 'https://youtube.com/@wehive' },
  ];
  return (
    <div className="lg:col-span-4">
      <div className="flex items-center gap-3">
        <img
          src={BRAND.logoWhite}
          alt={BRAND.name}
          className="h-12 w-auto select-none brightness-0 invert"
          draggable={false}
        />
      </div>
      <p className="mt-5 text-white/65 text-[15px] leading-relaxed max-w-sm">
        At {BRAND.name} Immigration Services, we turn aspirations into international opportunities.
        Expert guidance, transparent processes, and a smooth journey from start to finish.
      </p>
      <div className="mt-7 flex items-center gap-3">
        {socials.map(({ id, Icon, href }) => (
          <a
            key={id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 w-10 inline-flex items-center justify-center rounded-full border border-white/15 hover:border-white/40 hover:bg-white/5 transition-colors"
            aria-label="social"
          >
            <Icon className="w-4 h-4" />
          </a>
        ))}
      </div>
    </div>
  );
}

function FooterContact() {
  const items = [
    { id: 'phone', Icon: Phone, label: BRAND.phone, href: `tel:${BRAND.phoneRaw}` },
    { id: 'email', Icon: Mail, label: BRAND.email, href: `mailto:${BRAND.email}` },
    { id: 'addr', Icon: MapPin, label: BRAND.address },
    { id: 'hours', Icon: Clock, label: BRAND.hours },
  ];
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.16em] text-white/55 font-bold mb-4">Get in touch</div>
      <ul className="space-y-3">
        {items.map(({ id, Icon, label, href }) => (
          <li key={id} className="flex items-start gap-3 text-[14px] text-white/80">
            <Icon className="w-4 h-4 mt-0.5 text-[hsl(var(--accent))] shrink-0" />
            {href ? (
              <a href={href} className="hover:text-white transition-colors">{label}</a>
            ) : (
              <span>{label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="relative bg-[hsl(var(--blue-900))] text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.07]" style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }} />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-20 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          <FooterBrand />
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-10">
            {FOOTER_COLS.slice(0, 3).map((col) => (
              <FooterColumn key={col.id} col={col} />
            ))}
            <FooterContact />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-8 border-t border-white/10">
          <p className="text-[13px] text-white/50">
            © {new Date().getFullYear()} {BRAND.name} Immigration Services. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-[12px] text-white/55">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              All systems normal
            </span>
            <span>256-bit SSL · SOC 2 · GDPR · PCI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

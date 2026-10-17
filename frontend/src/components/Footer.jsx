import { Link } from 'react-router-dom';
import { Twitter, Instagram, Linkedin, Youtube, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { BRAND, FOOTER_COLS } from '../data/mock';
import NewsletterSignup from './NewsletterSignup';

// Flag emojis in the link data read as decoration — strip them for the minimal footer.
const stripFlags = (label) => label.replace(/\s*(?:[\u{1F1E6}-\u{1F1FF}]{2})/gu, '');

const headingClass = 'text-[12px] uppercase tracking-[0.14em] text-white/60 font-semibold mb-4';

function FooterColumn({ col }) {
  return (
    <div>
      <h2 className={`font-sans ${headingClass}`}>
        {col.title}
      </h2>
      <ul className="md:space-y-2.5">
        {col.links.map((link) => (
          <li key={link.id}>
            <Link to={link.to} className="inline-block py-2.5 md:py-0 text-[14px] leading-6 text-white/80 hover:text-white transition-colors duration-200">
              {stripFlags(link.label)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterBrand() {
  const socials = [
    { id: 'tw', Icon: Twitter, href: 'https://twitter.com/wehive', label: 'We Hive on X (Twitter)' },
    { id: 'ig', Icon: Instagram, href: 'https://instagram.com/wehive', label: 'We Hive on Instagram' },
    { id: 'li', Icon: Linkedin, href: 'https://linkedin.com/company/wehive', label: 'We Hive on LinkedIn' },
    { id: 'yt', Icon: Youtube, href: 'https://youtube.com/@wehive', label: 'We Hive on YouTube' },
  ];
  return (
    <div className="lg:col-span-4">
      <div className="flex items-center gap-3">
        <img
          src={BRAND.logoWhite}
          alt={BRAND.name}
          className="w-[144px] h-[48px] object-cover select-none brightness-0 invert"
          draggable={false}
        />
      </div>
      <p className="mt-5 text-white/70 text-[15px] leading-relaxed max-w-sm">
        At {BRAND.name} Immigration Services, we turn aspirations into international opportunities.
        Expert guidance, transparent processes, and a smooth journey from start to finish.
      </p>
      <div className="mt-6 flex items-center gap-2">
        {socials.map(({ id, Icon, href, label }) => (
          <a
            key={id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 w-11 inline-flex items-center justify-center rounded-full border border-white/15 text-white/80 hover:text-white hover:border-white/40 hover:bg-white/5 transition-colors duration-200"
            aria-label={label}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
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
      <h2 className={`font-sans ${headingClass}`}>Get in touch</h2>
      <ul className="space-y-3">
        {items.map(({ id, Icon, label, href }) => (
          <li key={id} className="flex items-start gap-3 text-[14px] leading-6 text-white/80">
            <Icon aria-hidden="true" className="w-4 h-4 mt-1 text-white/60 shrink-0" />
            {href ? (
              <a href={href} className="inline-block py-2.5 -my-2.5 md:py-0 md:my-0 hover:text-white transition-colors duration-200 break-words">{label}</a>
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
    <footer className="relative text-white bg-[hsl(var(--blue-900))] bg-[radial-gradient(ellipse_80%_60%_at_15%_0%,rgba(31,69,166,0.55),transparent_60%),radial-gradient(ellipse_60%_50%_at_95%_100%,rgba(225,6,0,0.28),transparent_60%),linear-gradient(180deg,#0B1240_0%,#0B1240_70%)]">
      <div className="flag-stripe" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-20 pb-24 sm:pb-10">
        <NewsletterSignup />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 mb-12 md:mb-16">
          <FooterBrand />
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
            {FOOTER_COLS.slice(0, 3).map((col) => (
              <FooterColumn key={col.id} col={col} />
            ))}
            <FooterContact />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-8 border-t border-white/10">
          <p className="text-[13px] text-white/60">
            © {new Date().getFullYear()} {BRAND.name} Immigration Services. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-white/60">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
              All systems normal
            </span>
            <span>256-bit SSL · SOC 2 · GDPR · PCI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

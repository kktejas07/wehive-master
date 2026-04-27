import { Link } from 'react-router-dom';
import { Twitter, Instagram, Linkedin, Youtube } from 'lucide-react';

const COLS = [
  {
    title: 'Popular visas',
    links: ['United States', 'United Kingdom', 'Schengen', 'Japan', 'Singapore', 'UAE'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Press', 'Trust & safety', 'Contact'],
  },
  {
    title: 'Resources',
    links: ['Help center', 'Visa guides', 'Embassy directory', 'Refund policy', 'Status'],
  },
  {
    title: 'Legal',
    links: ['Terms', 'Privacy', 'Cookies', 'Accessibility'],
  },
];

export default function Footer() {
  return (
    <footer className="relative bg-[hsl(var(--navy-900))] text-white overflow-hidden">
      <div className="absolute inset-0 bg-stripes opacity-30 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-20 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 40 40" className="h-9 w-9">
                <path d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z" fill="#fff" />
                <path
                  d="M14 16 L20 12.5 L26 16 L26 23 L20 26.5 L14 23 Z"
                  fill="none"
                  stroke="#0a1f4d"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <circle cx="30" cy="10" r="2.6" fill="#B91C2C" />
              </svg>
              <span className="text-2xl font-semibold tracking-tight">wehive</span>
            </div>
            <p className="mt-5 text-white/65 text-[15px] leading-relaxed max-w-sm">
              Visas, on time. The fastest, most transparent way to get a travel
              visa — backed by an on‑time guarantee.
            </p>
            <div className="mt-7 flex items-center gap-3">
              {[Twitter, Instagram, Linkedin, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-full border border-white/15 hover:border-white/40 hover:bg-white/5 transition-colors"
                  aria-label="social"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-10">
            {COLS.map((col) => (
              <div key={col.title}>
                <div className="text-[12px] uppercase tracking-[0.14em] text-white/50 font-semibold mb-4">
                  {col.title}
                </div>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <Link
                        to="#"
                        className="text-[14px] text-white/75 hover:text-white transition-colors"
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-8 border-t border-white/10">
          <p className="text-[13px] text-white/50">
            © {new Date().getFullYear()} Wehive Inc. — All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-[12px] text-white/55">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              All systems normal
            </span>
            <span>SOC 2 · GDPR · PCI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

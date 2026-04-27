import { Link, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X, ShieldCheck, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

const NAV = [
  { label: 'Visas', to: '/' },
  { label: 'How it works', to: '/#how' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-[background,backdrop-filter,border-color] duration-300',
        scrolled
          ? 'bg-[hsl(var(--cream))]/85 backdrop-blur-xl border-b border-black/5'
          : 'bg-transparent border-b border-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <Logo />
            <span className="text-[22px] font-semibold tracking-tight text-[hsl(var(--navy-900))]">
              wehive
            </span>
          </Link>
          <span className="hidden md:inline-block w-px h-6 bg-black/10" />
          <div className="hidden md:flex items-center gap-2 text-[13px] text-[hsl(var(--navy-700))]">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--navy-700))] text-white">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div className="leading-tight">
              <div className="font-semibold">Visas On Time</div>
              <div className="underline underline-offset-2 decoration-black/30">Guaranteed</div>
            </div>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'px-4 py-2 text-[14px] font-medium rounded-full transition-colors',
                  isActive && item.to !== '/#how'
                    ? 'text-[hsl(var(--navy-900))] bg-black/5'
                    : 'text-[hsl(var(--navy-900))]/70 hover:text-[hsl(var(--navy-900))] hover:bg-black/5'
                )
              }
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[hsl(var(--navy-900))]/80 hover:text-[hsl(var(--navy-900))] rounded-full hover:bg-black/5 transition-colors">
            <span aria-hidden>🇺🇸</span>
            <span>EN</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <Button
            variant="ghost"
            className="rounded-full text-[hsl(var(--navy-900))] hover:bg-black/5 px-4"
          >
            Sign in
          </Button>
          <Button className="rounded-full btn-navy text-white px-5 h-10 shadow-sm hover:shadow-md">
            Get my visa
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-full hover:bg-black/5"
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-black/5 bg-[hsl(var(--cream))]/95 backdrop-blur-xl">
          <div className="px-5 py-4 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="px-3 py-3 text-[15px] font-medium rounded-lg hover:bg-black/5 text-[hsl(var(--navy-900))]"
              >
                {item.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-3">
              <Button variant="outline" className="flex-1 rounded-full">
                Sign in
              </Button>
              <Button className="flex-1 rounded-full btn-navy text-white">
                Get my visa
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Logo() {
  // Hexagon hive mark in navy with red dot accent
  return (
    <span className="relative inline-flex h-9 w-9 items-center justify-center">
      <svg viewBox="0 0 40 40" className="h-9 w-9">
        <defs>
          <linearGradient id="hex" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#163b85" />
            <stop offset="1" stopColor="#0a1f4d" />
          </linearGradient>
        </defs>
        <path
          d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z"
          fill="url(#hex)"
        />
        <path
          d="M14 16 L20 12.5 L26 16 L26 23 L20 26.5 L14 23 Z"
          fill="none"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="30" cy="10" r="2.6" fill="#B91C2C" />
      </svg>
    </span>
  );
}

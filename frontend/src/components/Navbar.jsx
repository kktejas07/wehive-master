import { Link, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Menu, X, Phone } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { BRAND } from '../data/mock';
import UserMenu from './UserMenu';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
const NAV = [
  { id: 'home', label: 'nav.home', to: '/' },
  { id: 'services', label: 'nav.services', to: '/#services' },
  { id: 'pricing', label: 'nav.pricing', to: '/pricing' },
  { id: 'about', label: 'nav.about', to: '/about' },
];

function NavLinks({ orientation = 'horizontal' }) {
  const { t } = useI18n();
  if (orientation === 'horizontal') {
    return (
      <nav className="hidden lg:flex items-center gap-1">
        {NAV.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'px-4 py-2 text-[14px] font-bold tracking-tight rounded-full transition-colors',
                isActive
                  ? 'text-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))]'
                  : 'text-[hsl(var(--blue-900))]/75 hover:text-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-50))]'
              )
            }
          >
            {t(item.label, item.id)}
          </NavLink>
        ))}
      </nav>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {NAV.map((item) => (
        <Link
          key={item.id}
          to={item.to}
          className="px-3 py-3 text-[15px] font-bold rounded-lg hover:bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-900))]"
        >
          {t(item.label, item.id)}
        </Link>
      ))}
    </div>
  );
}

function PhoneBlock() {
  const { t } = useI18n();
  return (
    <a
      href={`tel:${BRAND.phoneRaw}`}
      className="hidden xl:inline-flex items-center gap-2.5 rounded-full bg-[hsl(var(--accent))] hover:bg-[hsl(var(--red-600))] text-white pr-5 pl-2 py-1.5 transition-colors group"
    >
      <span className="h-9 w-9 rounded-full bg-white/15 group-hover:bg-white/25 inline-flex items-center justify-center">
        <Phone className="w-4 h-4" />
      </span>
      <div className="leading-tight text-left">
        <div className="text-[10px] uppercase tracking-[0.16em] text-white/80 font-bold">{t('cta.callUs')}</div>
        <div className="text-[13.5px] font-bold tracking-tight">{BRAND.phone}</div>
      </div>
    </a>
  );
}

function MobileMenu({ open }) {
  const { isAuthed, openAuth } = useAuth();
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="lg:hidden border-t border-black/5 bg-white/95 backdrop-blur-xl">
      <div className="px-5 py-4 flex flex-col gap-1">
        <NavLinks orientation="vertical" />
        <a
          href={`tel:${BRAND.phoneRaw}`}
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-full btn-accent text-white h-11 font-bold"
        >
          <Phone className="w-4 h-4" />
          {BRAND.phone}
        </a>
        {!isAuthed && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Button
              variant="outline"
              className="rounded-full h-11"
              onClick={() => openAuth('login')}
            >
              {t('cta.signIn')}
            </Button>
            <Button
              className="rounded-full btn-primary text-white h-11"
              onClick={() => openAuth('signup')}
            >
              {t('cta.signUp')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  const onScroll = useCallback(() => {
    setScrolled(window.scrollY > 12);
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-[background,backdrop-filter,border-color] duration-300',
        scrolled
          ? 'bg-white/85 backdrop-blur-xl border-b border-black/5 shadow-[0_4px_30px_-20px_rgba(10,44,138,0.18)]'
          : 'bg-transparent border-b border-transparent'
      )}
    >
      <div className={cn(
        'max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between gap-3 transition-[height] duration-300',
        scrolled ? 'h-[68px] sm:h-[76px]' : 'h-[110px] sm:h-[130px]'
      )}>
        <Link to="/" className="flex items-center gap-2 group shrink-0 relative">
          <div className={cn(
            'relative transition-[width,height] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-visible',
            scrolled ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-24 h-24 sm:w-28 sm:h-28'
          )}>
            {/* Full logo — visible when at top */}
            <img
              src="/brand/wehive-logo.png"
              alt="We Hive"
              draggable={false}
              className={cn(
                'absolute inset-0 h-full w-full object-contain select-none transition-all duration-500 group-hover:scale-[1.04]',
                scrolled ? 'opacity-0 scale-50 rotate-[-12deg] pointer-events-none' : 'opacity-100 scale-100 rotate-0'
              )}
            />
            {/* Favicon — visible when scrolled (mini glyph) */}
            <img
              src="/brand/wehive-favicon.png"
              alt="We Hive"
              draggable={false}
              className={cn(
                'absolute inset-0 h-full w-full object-contain select-none transition-all duration-500 group-hover:scale-[1.08] group-hover:rotate-[6deg]',
                scrolled ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-150 rotate-12 pointer-events-none'
              )}
            />
          </div>
          {/* Wordmark next to favicon when scrolled */}
          <span className={cn(
            'font-display font-extrabold text-[hsl(var(--blue-900))] tracking-[-0.03em] leading-none transition-all duration-500',
            scrolled
              ? 'opacity-100 text-[20px] sm:text-[22px] translate-x-0'
              : 'opacity-0 text-[20px] -translate-x-3 pointer-events-none'
          )}>
            We Hive
          </span>
        </Link>

        <NavLinks />

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <PhoneBlock />
          <UserMenu />
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-full hover:bg-[hsl(var(--blue-50))]"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <MobileMenu open={open} />
    </header>
  );
}

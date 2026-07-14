import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Menu, 
  X, 
  Phone, 
  Home,
  Globe,
  GraduationCap,
  Plane,
  Calculator,
  Search,
  Calendar,
  BookOpen,
  CreditCard,
  Briefcase,
  ChevronDown,
  FileText,
  Mail,
  Wrench,
  Mic,
  Award,
  Newspaper
} from 'lucide-react';
import { cn } from '../lib/utils';

import { Button } from './ui/button';
import { BRAND } from '../data/mock';
import UserMenu from './UserMenu';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
const NAV = [
  { id: 'home', label: 'Home', to: '/', icon: Home },
  {
    id: 'solutions', label: 'Solutions', icon: Briefcase,
    children: [
      { id: 'visa', label: 'Visa Services', to: '/#countries', icon: Globe },
      { id: 'student', label: 'Student Visa', to: '/student-visa', icon: GraduationCap },
      { id: 'fly', label: 'Fly', to: '/map', icon: Plane },
    ]
  },
  {
    id: 'resources', label: 'Resources', icon: BookOpen,
    children: [
      { id: 'assessment', label: 'Visa Calculator', to: '/assessment', icon: Calculator },
      { id: 'track', label: 'Track Application', to: '/track', icon: Search },
      { id: 'blog', label: 'Blog', to: '/blog', icon: FileText },
      { id: 'news', label: 'News', to: '/news', icon: Newspaper },
      { id: 'events', label: 'Global Events', to: '/events', icon: Calendar },
    ]
  },
  {
    id: 'tools', label: 'Tools', icon: Wrench,
    children: [
      { id: 'visa-slot-tracker', label: 'Visa Slot Tracker', to: '/us-visa-slots', icon: Calendar },
      { id: 'intake-calendar', label: 'Intake Calendar', to: '/intake-calendar', icon: BookOpen },
      { id: 'financial-tools', label: 'Financial Tools', to: '/financial-tools', icon: CreditCard },
      { id: 'university-search', label: 'University Search', to: '/universities', icon: Search },
      { id: 'visa-checker', label: 'Visa Checker', to: '/visa-checker', icon: Globe },
      { id: 'visa-interview', label: 'Visa Interview Simulator', to: '/visa-interview', icon: Mic },
      { id: 'scholarship-matcher', label: 'AI Scholarship Matcher', to: '/student-visa', icon: Award },
      { id: 'uni-recommender', label: 'AI University Recommender', to: '/student-visa', icon: GraduationCap },
      { id: 'cost-of-living', label: 'Cost of Living Calculator', to: '/student-visa', icon: Calculator },
      { id: 'sop-lor-writer', label: 'AI SOP / LOR Writer', to: '/student-visa', icon: FileText },
    ]
  },
  { id: 'pricing', label: 'Pricing', to: '/pricing', icon: CreditCard },
  { id: 'contact', label: 'Contact', to: '/contact', icon: Mail },
];

function NavLinks({ orientation = 'horizontal', light = false }) {
  const { t } = useI18n();
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const activeClass = light
    ? 'text-white bg-white/20'
    : 'text-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))]';
  const inactiveClass = light
    ? 'text-white/80 hover:text-white hover:bg-white/10'
    : 'text-[hsl(var(--blue-900))]/75 hover:text-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-50))]';
  const dropdownItemClass = light
    ? 'text-white/80 hover:text-white hover:bg-white/10'
    : 'text-[hsl(var(--blue-900))]/75 hover:text-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-50))]';

  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdown]);

  if (orientation === 'horizontal') {
    return (
      <nav className="hidden lg:flex items-center gap-0.5 mx-2 flex-1 justify-center">
        {NAV.map((item) => {
          const Icon = item.icon;
          if (item.children) {
            const isOpen = openDropdown === item.id;
            return (
              <div key={item.id} className="relative" ref={isOpen ? dropdownRef : null}>
                <button
                  onClick={() => setOpenDropdown(isOpen ? null : item.id)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={cn(
                    'px-2.5 xl:px-3.5 py-1.5 text-[13px] xl:text-[14px] font-bold tracking-tight rounded-full transition-colors inline-flex items-center gap-1.5',
                    isOpen ? activeClass : inactiveClass
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t('nav.' + item.id, item.label)}
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  <div className={cn(
                    'absolute top-full left-1/2 -translate-x-1/2 mt-2 min-w-[220px] rounded-2xl p-2 shadow-xl border backdrop-blur-xl',
                    light ? 'bg-[hsl(var(--blue-900))]/95 border-white/10' : 'bg-white/95 border-black/5'
                  )}>
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <NavLink
                          key={child.id}
                          to={child.to}
                          end={child.to === '/'}
                          onClick={() => setOpenDropdown(null)}
                          className={({ isActive }) =>
                            cn(
                              'px-3 py-2.5 text-[13px] font-bold rounded-xl transition-colors flex items-center gap-3',
                              isActive ? activeClass : dropdownItemClass
                            )
                          }
                        >
                          <span className="shrink-0 w-8 h-8 rounded-lg bg-[hsl(var(--blue-50))] flex items-center justify-center">
                            <ChildIcon className="w-4 h-4 text-[hsl(var(--blue-700))]" />
                          </span>
                          <div className="flex-1">
                            <div>{t('nav.' + child.id, child.label)}</div>
                          </div>
                          {child.badge && (
                            <span className="px-1.5 py-0.5 rounded-full bg-[hsl(var(--accent))] text-[9px] font-extrabold text-white tracking-[0.05em] animate-pulse">
                              {t('badge.' + child.badge.toLowerCase(), child.badge)}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          return (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'px-2.5 xl:px-3.5 py-1.5 text-[13px] xl:text-[14px] font-bold tracking-tight rounded-full transition-colors inline-flex items-center gap-1.5',
                  isActive ? activeClass : inactiveClass
                )
              }
            >
              {Icon ? <Icon className="w-4 h-4" /> : null}
              {t('nav.' + item.id, item.label)}
            </NavLink>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {NAV.map((item) => {
        const Icon = item.icon;
        if (item.children) {
          return (
            <div key={item.id}>
              <div className={cn(
                'px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em]',
                light ? 'text-white/50' : 'text-[hsl(var(--blue-400))]'
              )}>
                {t('nav.' + item.id, item.label)}
              </div>
              {item.children.map((child) => {
                const ChildIcon = child.icon;
                return (
                  <Link
                    key={child.id}
                    to={child.to}
                    className={cn(
                      'px-3 py-3 text-[15px] font-bold rounded-lg transition-colors inline-flex items-center gap-2',
                      light
                        ? 'text-white hover:bg-white/10'
                        : 'hover:bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-900))]'
                    )}
                  >
                    <ChildIcon className="w-4 h-4" />
                    {t('nav.' + child.id, child.label)}
                    {child.badge && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[hsl(var(--accent))] text-[9px] font-extrabold text-white tracking-[0.05em] animate-pulse">
                        {t('badge.' + child.badge.toLowerCase(), child.badge)}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        }
        return (
          <Link
            key={item.id}
            to={item.to}
            className={cn(
              'px-3 py-3 text-[15px] font-bold rounded-lg transition-colors inline-flex items-center gap-2',
              light
                ? 'text-white hover:bg-white/10'
                : 'hover:bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-900))]'
            )}
          >
            {Icon ? <Icon className="w-4 h-4" /> : null}
            {t('nav.' + item.id, item.label)}
            {item.badge && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[hsl(var(--accent))] text-[9px] font-extrabold text-white tracking-[0.05em] animate-pulse">
                {t('badge.' + item.badge.toLowerCase(), item.badge)}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function PhoneBlock() {
  const { t } = useI18n();
  return (
    <a
      href={`tel:${BRAND.phoneRaw}`}
      className="hidden 2xl:inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] hover:bg-[hsl(var(--red-600))] text-white pr-4 pl-1.5 py-1.5 transition-colors group"
    >
      <span className="h-8 w-8 rounded-full bg-white/15 group-hover:bg-white/25 inline-flex items-center justify-center">
        <Phone className="w-3.5 h-3.5" />
      </span>
      <div className="leading-tight text-left">
        <div className="text-[9px] uppercase tracking-[0.14em] text-white/80 font-bold">{t('cta.callUs')}</div>
        <div className="text-[12.5px] font-bold tracking-tight">{BRAND.phone}</div>
      </div>
    </a>
  );
}

function MobileMenu({ open, light = false }) {
  const { isAuthed } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  if (!open) return null;
  return (
    <div className={cn(
      'xl:hidden border-t backdrop-blur-xl',
      light ? 'border-white/10 bg-[hsl(var(--blue-900))]/90' : 'border-black/5 bg-white/95'
    )}>
      <div className="px-5 py-4 flex flex-col gap-1">
        <NavLinks orientation="vertical" light={light} />
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
              onClick={() => navigate('/login')}
            >
              {t('cta.signIn')}
            </Button>
            <Button
              className="rounded-full btn-primary text-white h-11"
              onClick={() => navigate('/signup')}
            >
              {t('cta.signUp')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Navbar({ variant = 'default' }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const isLight = variant === 'light';

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
          : isLight
            ? 'bg-transparent border-b border-transparent'
            : 'bg-white border-b border-black/5'
      )}
    >
      <div className={cn(
        'max-w-[1600px] mx-auto px-4 sm:px-8 xl:px-12 flex items-center justify-between gap-4 xl:gap-8 transition-[height] duration-300',
        scrolled ? 'h-[68px] sm:h-[76px]' : 'h-[90px] sm:h-[110px]'
      )}>
        <Link to="/" className="flex items-center gap-2 group shrink-0 relative">
          <img
            src={BRAND.logo}
            alt={BRAND.name}
            draggable={false}
            className={cn(
              'w-auto select-none object-contain transition-all duration-500 group-hover:scale-[1.04]',
              scrolled ? 'h-10 sm:h-11' : 'h-16 sm:h-20'
            )}
          />
        </Link>

        <NavLinks light={isLight} />

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <NotificationBell />
          <PhoneBlock />
          <UserMenu />
          <a
            href="https://chat.whatsapp.com/F0R1TYMOr8dLwIbr5jLRau"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center justify-center h-10 w-10 rounded-full bg-green-50 text-green-600 hover:bg-green-600 hover:text-white ring-1 ring-green-200 hover:ring-green-600 transition-all duration-200"
            title="Join WhatsApp Community"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </a>
          <a
            href="https://t.me/wehivecommunity"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center justify-center h-10 w-10 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white ring-1 ring-blue-200 hover:ring-blue-600 transition-all duration-200"
            title="Join Telegram Community"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </a>
          <LanguageSwitcher />
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-full hover:bg-[hsl(var(--blue-50))]"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <MobileMenu open={open} light={isLight} />
    </header>
  );
}

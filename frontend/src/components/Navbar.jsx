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
  Newspaper,
  Users
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
      { id: 'visa-help', label: 'Get Visa Help', to: '/visa-enquiry', icon: Mail },
      { id: 'free-consultation', label: 'Free Consultation', to: '/free-consultation', icon: Phone },
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
      { id: 'community', label: 'Community', to: '/community', icon: Users },
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
      { id: 'cost-of-living', label: 'Cost of Living Calculator', to: '/financial-tools?tool=budget', icon: Calculator },
      { id: 'sop-lor-writer', label: 'AI SOP / Cover Letter Writer', to: '/account?tab=aitools', icon: FileText },
    ]
  },
  { id: 'pricing', label: 'Pricing', to: '/pricing', icon: CreditCard },
  { id: 'contact', label: 'Contact', to: '/contact', icon: Mail },
];

const WHATSAPP_URL = 'https://chat.whatsapp.com/F0R1TYMOr8dLwIbr5jLRau';
const TELEGRAM_URL = 'https://t.me/wehivecommunity';

function WhatsAppIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

function TelegramIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  );
}

function NavLinks({ orientation = 'horizontal', light = false }) {
  const { t } = useI18n();
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const activeClass = light
    ? 'text-white bg-white/15'
    : 'text-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))]';
  const inactiveClass = light
    ? 'text-white/85 hover:text-white hover:bg-white/10'
    : 'text-[hsl(var(--blue-900))] hover:text-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-50))]';
  const dropdownItemClass = 'text-[hsl(var(--blue-900))] hover:text-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-50))]';

  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpenDropdown(null); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [openDropdown]);

  const topItem = 'h-10 px-2 xl:px-3 text-[14px] font-semibold rounded-lg transition-colors duration-200 inline-flex items-center gap-1.5 cursor-pointer';

  if (orientation === 'horizontal') {
    return (
      <nav aria-label="Main" className="hidden lg:flex items-center gap-0.5 xl:gap-1 mx-0 xl:mx-2 flex-1 justify-center">
        {NAV.map((item) => {
          if (item.children) {
            const isOpen = openDropdown === item.id;
            const menuId = `nav-menu-${item.id}`;
            return (
              <div key={item.id} className="relative" ref={isOpen ? dropdownRef : null}>
                <button
                  type="button"
                  onClick={() => setOpenDropdown(isOpen ? null : item.id)}
                  onMouseDown={(e) => e.stopPropagation()}
                  aria-expanded={isOpen}
                  aria-controls={menuId}
                  className={cn(topItem, isOpen ? activeClass : inactiveClass)}
                >
                  {t('nav.' + item.id, item.label)}
                  <ChevronDown aria-hidden="true" className={cn('w-4 h-4 opacity-70 transition-transform duration-200', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  <div
                    id={menuId}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 min-w-[288px] rounded-2xl p-2 bg-white border border-[hsl(var(--border))] shadow-lg"
                  >
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
                              'px-2.5 py-2 text-[14px] font-medium rounded-xl transition-colors duration-200 flex items-center gap-3',
                              isActive ? 'text-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))]' : dropdownItemClass
                            )
                          }
                        >
                          <span className="shrink-0 w-8 h-8 rounded-lg bg-[hsl(var(--blue-50))] flex items-center justify-center">
                            <ChildIcon aria-hidden="true" className="w-4 h-4 text-[hsl(var(--blue-700))]" />
                          </span>
                          <span className="flex-1">{t('nav.' + child.id, child.label)}</span>
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
              className={({ isActive }) => cn(topItem, isActive ? activeClass : inactiveClass)}
            >
              {t('nav.' + item.id, item.label)}
            </NavLink>
          );
        })}
      </nav>
    );
  }

  const rowClass = cn(
    'min-h-[44px] px-3 text-[15px] font-medium rounded-xl transition-colors duration-200 flex items-center gap-3',
    light ? 'text-white hover:bg-white/10' : 'text-[hsl(var(--blue-900))] hover:bg-[hsl(var(--blue-50))]'
  );

  return (
    <nav aria-label="Mobile" className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const Icon = item.icon;
        if (item.children) {
          return (
            <div key={item.id} className="pt-3">
              <div className={cn(
                'px-3 pb-1 text-[12px] font-semibold uppercase tracking-[0.14em]',
                light ? 'text-white/70' : 'text-muted-foreground'
              )}>
                {t('nav.' + item.id, item.label)}
              </div>
              {item.children.map((child) => {
                const ChildIcon = child.icon;
                return (
                  <Link key={child.id} to={child.to} className={rowClass}>
                    <ChildIcon aria-hidden="true" className={cn('w-4 h-4 shrink-0', light ? 'text-white/80' : 'text-[hsl(var(--blue-700))]')} />
                    {t('nav.' + child.id, child.label)}
                  </Link>
                );
              })}
            </div>
          );
        }
        return (
          <Link key={item.id} to={item.to} className={rowClass}>
            {Icon ? <Icon aria-hidden="true" className={cn('w-4 h-4 shrink-0', light ? 'text-white/80' : 'text-[hsl(var(--blue-700))]')} /> : null}
            {t('nav.' + item.id, item.label)}
          </Link>
        );
      })}
    </nav>
  );
}

function PhoneBlock() {
  return (
    <a
      href={`tel:${BRAND.phoneRaw}`}
      className="hidden 2xl:inline-flex items-center gap-2 h-10 px-3 rounded-lg text-[14px] font-semibold text-[hsl(var(--blue-900))] hover:text-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-50))] transition-colors duration-200"
    >
      <Phone aria-hidden="true" className="w-4 h-4 text-[hsl(var(--blue-700))]" />
      {BRAND.phone}
    </a>
  );
}

const communityBtn = 'inline-flex items-center justify-center h-10 w-10 rounded-full border border-[hsl(var(--border))] bg-white text-[hsl(var(--blue-900))] hover:text-[hsl(var(--blue-700))] hover:border-[hsl(var(--blue-200))] hover:bg-[hsl(var(--blue-50))] transition-colors duration-200';

function MobileMenu({ open, light = false }) {
  const { isAuthed } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  if (!open) return null;
  return (
    <div
      id="mobile-nav"
      className={cn(
        'lg:hidden border-t max-h-[calc(100dvh-64px)] overflow-y-auto overscroll-contain',
        light ? 'border-white/10 bg-[hsl(var(--blue-900))]' : 'border-[hsl(var(--border))] bg-white'
      )}
    >
      <div className="px-4 sm:px-6 pt-2 pb-6 flex flex-col gap-1">
        <NavLinks orientation="vertical" light={light} />
        <div className="mt-4 pt-4 border-t border-[hsl(var(--border))] flex flex-col gap-2">
          {!isAuthed && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11" onClick={() => navigate('/login')}>
                {t('cta.signIn')}
              </Button>
              <Button className="h-11" onClick={() => navigate('/signup')}>
                {t('cta.signUp')}
              </Button>
            </div>
          )}
          <a
            href={`tel:${BRAND.phoneRaw}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl h-11 border border-[hsl(var(--border))] bg-white text-[15px] font-semibold text-[hsl(var(--blue-900))] hover:bg-[hsl(var(--blue-50))] transition-colors duration-200"
          >
            <Phone aria-hidden="true" className="w-4 h-4 text-[hsl(var(--blue-700))]" />
            {BRAND.phone}
          </a>
          <div className="flex items-center gap-2 pt-1">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={cn(communityBtn, 'h-11 w-11')} aria-label="Join WhatsApp community">
              <WhatsAppIcon className="w-5 h-5" />
            </a>
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={cn(communityBtn, 'h-11 w-11')} aria-label="Join Telegram community">
              <TelegramIcon className="w-5 h-5" />
            </a>
            <div className="ml-auto">
              <LanguageSwitcher tone="nav" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Navbar({ variant = 'default' }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const { pathname } = useLocation();
  const isLight = variant === 'light';

  const onScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    setScrolled(currentScrollY > 12);

    if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
      setHidden(true);
    } else if (currentScrollY < lastScrollY.current) {
      setHidden(false);
    }

    lastScrollY.current = currentScrollY;
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const transparent = isLight && !scrolled && !open;

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-[transform,background-color,box-shadow] duration-300 ease-out',
        hidden && !open ? '-translate-y-full' : 'translate-y-0',
        transparent
          ? 'bg-transparent border-b border-transparent'
          : 'bg-white border-b border-[hsl(var(--border))]',
        scrolled && 'shadow-sm'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 xl:gap-6 h-16 sm:h-[72px]">
        <Link to="/" className="flex items-center shrink-0 rounded-lg" aria-label={`${BRAND.name} home`}>
          <img
            src={BRAND.logo}
            alt={BRAND.name}
            draggable={false}
            className={cn(
              'w-[120px] h-[40px] sm:w-[144px] sm:h-[48px] lg:w-[120px] lg:h-[40px] xl:w-[144px] xl:h-[48px] object-cover select-none',
              transparent && 'brightness-0 invert'
            )}
          />
        </Link>

        <NavLinks light={transparent} />

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
          <NotificationBell />
          <PhoneBlock />
          <UserMenu light={transparent} />
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(communityBtn, 'hidden xl:inline-flex')}
            title="Join WhatsApp community"
            aria-label="Join WhatsApp community"
          >
            <WhatsAppIcon className="w-[18px] h-[18px]" />
          </a>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(communityBtn, 'hidden xl:inline-flex')}
            title="Join Telegram community"
            aria-label="Join Telegram community"
          >
            <TelegramIcon className="w-[18px] h-[18px]" />
          </a>
          <div className="hidden lg:block">
            <LanguageSwitcher tone="nav" />
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              'lg:hidden inline-flex items-center justify-center h-11 w-11 rounded-xl transition-colors duration-200',
              transparent ? 'text-white hover:bg-white/10' : 'text-[hsl(var(--blue-900))] hover:bg-[hsl(var(--blue-50))]'
            )}
            aria-label="Toggle menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <MobileMenu open={open} light={false} />
      <div className="flag-stripe absolute inset-x-0 bottom-0" aria-hidden="true" />
    </header>
  );
}

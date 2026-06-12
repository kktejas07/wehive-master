import { Link, NavLink, useLocation } from 'react-router-dom';
import { BRAND } from '../../data/mock';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  LayoutDashboard, Users as UsersIcon, FileStack, Globe, Plug, Download, UserCog,
  LogOut, ArrowLeft, Banknote, Megaphone, Settings, ClipboardList, Tag, Briefcase,
} from 'lucide-react';
import { avatarUrl } from '../../lib/avatars';

const TABS = [
  { id: 'overview',     to: '/admin',               label: 'Overview',     Icon: LayoutDashboard, testid: 'admin-nav-overview' },
  { id: 'users',        to: '/admin/users',         label: 'Users',        Icon: UsersIcon,       testid: 'admin-nav-users' },
  { id: 'applications', to: '/admin/applications',  label: 'Applications', Icon: FileStack,       testid: 'admin-nav-applications' },
  { id: 'countries',    to: '/admin/countries',     label: 'Countries',    Icon: Globe,           testid: 'admin-nav-countries' },
  { id: 'pricing',      to: '/admin/pricing',       label: 'Pricing',      Icon: Banknote,        testid: 'admin-nav-pricing' },
  { id: 'events',       to: '/admin/events',        label: 'Events',       Icon: Megaphone,       testid: 'admin-nav-events' },
  { id: 'requests',    to: '/admin/requests',      label: 'Requests',     Icon: ClipboardList,   testid: 'admin-nav-requests' },
  { id: 'promotions',  to: '/admin/promotions',    label: 'Promotions',   Icon: Tag,             testid: 'admin-nav-promotions' },
  { id: 'promocodes',  to: '/admin/promocodes',    label: 'Promo Codes',   Icon: Tag,             testid: 'admin-nav-promocodes' },
  { id: 'agents',       to: '/admin/agents',        label: 'Agents',       Icon: Briefcase,       testid: 'admin-nav-agents' },
  { id: 'staff',        to: '/admin/staff',         label: 'Staff',        Icon: UserCog,         testid: 'admin-nav-staff' },
  { id: 'integrations', to: '/admin/integrations',  label: 'Integrations', Icon: Plug,            testid: 'admin-nav-integrations' },
  { id: 'exports',      to: '/admin/exports',       label: 'Exports',      Icon: Download,        testid: 'admin-nav-exports' },
  { id: 'settings',     to: '/admin/settings',      label: 'Settings',     Icon: Settings,        testid: 'admin-nav-settings' },
];

export default function AdminShell({ children }) {
  const { admin, logout } = useAdminAuth();
  const { pathname } = useLocation();

  const user = admin;

  return (
    <div className="min-h-screen bg-[#0b1020] text-slate-100" data-testid="admin-shell">
      <div className="grid lg:grid-cols-[260px_1fr] min-h-screen">
        <aside className="hidden lg:flex flex-col bg-[#0a0e1e] border-r border-white/5 p-5">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-200 hover:text-white">
            <img src={BRAND.logo} alt="We Hive" className="h-10 w-auto" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-bold">Admin</span>
          </Link>

          <nav className="mt-8 space-y-1 flex-1">
            {TABS.map((t) => {
              const Icon = t.Icon;
              const active = pathname === t.to || (t.id !== 'overview' && pathname.startsWith(t.to));
              return (
                <NavLink
                  key={t.id}
                  to={t.to}
                  end={t.id === 'overview'}
                  data-testid={t.testid}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-bold transition ${
                    active
                      ? 'bg-[hsl(var(--accent))] text-white shadow-[0_10px_30px_-10px_rgba(225,33,44,0.6)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/5">
            <div className="flex items-center gap-3 px-1">
              <span className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-white/10">
                <img
                  src={avatarUrl({ seed: user?.email || user?.id, gender: 'hero' })}
                  alt="admin"
                  className="h-full w-full object-cover"
                />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-bold truncate">{user?.name || 'Admin'}</div>
                <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 hover:border-white/30 py-1.5 text-[12px] font-bold text-slate-300"
              >
                <ArrowLeft className="w-3 h-3" /> Site
              </Link>
              <button
                onClick={logout}
                data-testid="admin-logout-btn"
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 py-1.5 text-[12px] font-bold text-slate-200"
              >
                <LogOut className="w-3 h-3" /> Sign out
              </button>
            </div>
          </div>
        </aside>

        <main className="p-5 sm:p-8 lg:p-10 max-w-full overflow-hidden">
          {/* Mobile tab pill bar */}
          <div className="lg:hidden flex overflow-x-auto gap-2 mb-5 -mx-5 px-5">
            {TABS.map((t) => {
              const active = pathname === t.to || (t.id !== 'overview' && pathname.startsWith(t.to));
              return (
                <NavLink
                  key={t.id}
                  to={t.to}
                  end={t.id === 'overview'}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold ${
                    active ? 'bg-[hsl(var(--accent))] text-white' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {t.label}
                </NavLink>
              );
            })}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-[hsl(var(--accent))]">
          We Hive · Super Admin
        </div>
        <h1 className="mt-2 font-display font-extrabold text-[32px] sm:text-[40px] tracking-[-0.03em] text-white">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[14px] text-slate-400 max-w-xl">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Panel({ children, className = '' }) {
  return (
    <div className={`rounded-2xl bg-[#111632] border border-white/5 p-5 ${className}`}>{children}</div>
  );
}

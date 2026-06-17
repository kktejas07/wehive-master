import { Link, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { BRAND } from '../../data/mock';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient } from '../../lib/admin';
import {
  LayoutDashboard, Users as UsersIcon, FileStack, Globe, Plug, Download, UserCog,
  LogOut, ArrowLeft, Banknote, Megaphone, Settings, ClipboardList, Tag, Briefcase, Image as ImageIcon,
  Key, User,
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
  { id: 'destinations', to: '/admin/destinations',  label: 'Destinations', Icon: ImageIcon,       testid: 'admin-nav-destinations' },
  { id: 'settings',     to: '/admin/settings',      label: 'Settings',     Icon: Settings,        testid: 'admin-nav-settings' },
];

export default function AdminShell({ children }) {
  const { admin, logout } = useAdminAuth();
  const { pathname } = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  const user = admin;

  const handlePasswordChange = async () => {
    if (pwForm.new !== pwForm.confirm) { setPwError('Passwords do not match'); return; }
    setPwSaving(true); setPwError('');
    try {
      await adminClient().put('/change-password', { current_password: pwForm.current, new_password: pwForm.new });
      setPwModal(false); setPwForm({ current: '', new: '', confirm: '' });
    } catch (e) {
      setPwError(e.response?.data?.detail || 'Password change failed');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="h-screen bg-[#0b1020] text-slate-100" data-testid="admin-shell">
      <div className="grid lg:grid-cols-[260px_1fr] h-screen">
        <aside className="hidden lg:flex flex-col bg-[#0a0e1e] border-r border-white/5 p-5 overflow-y-auto admin-scrollbar">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-200 hover:text-white">
            <img src={BRAND.logo} alt="We Hive" className="h-10 w-auto brightness-0 invert" />
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
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-3 px-1 w-full hover:bg-white/5 rounded-xl py-2 -mx-1 transition"
              >
                <span className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-white/10 shrink-0">
                  <img
                    src={avatarUrl({ seed: user?.email || user?.id, gender: 'hero' })}
                    alt="admin"
                    className="h-full w-full object-cover"
                  />
                </span>
                <div className="min-w-0 text-left">
                  <div className="text-[13px] font-bold truncate">{user?.name || 'Admin'}</div>
                  <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                </div>
              </button>

              {profileOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-[#111632] border border-white/10 shadow-2xl overflow-hidden z-50">
                  <button
                    onClick={() => { setPwModal(true); setProfileOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] font-semibold text-slate-300 hover:bg-white/5 transition"
                  >
                    <Key className="w-3.5 h-3.5" /> Change Password
                  </button>
                  <button
                    onClick={() => { logout(); setProfileOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] font-semibold text-red-400 hover:bg-white/5 transition border-t border-white/5"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 hover:border-white/30 py-1.5 px-4 text-[12px] font-bold text-slate-300 w-full"
              >
                <ArrowLeft className="w-3 h-3" /> Site
              </Link>
            </div>
          </div>
        </aside>

        <main className="p-5 sm:p-8 lg:p-10 max-w-full overflow-y-auto relative z-10 admin-scrollbar">
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

      {/* Password Change Modal */}
      {pwModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setPwModal(false)}>
          <div className="rounded-2xl bg-[#111632] border border-white/10 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-[16px] font-bold text-white mb-4">Change Password</h3>
              <div className="space-y-3">
                <input type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} placeholder="Current password" className="w-full h-11 px-4 rounded-xl bg-black/30 border border-white/10 text-[14px] text-white placeholder:text-slate-600 outline-none focus:border-[hsl(var(--accent))]" />
                <input type="password" value={pwForm.new} onChange={e => setPwForm(p => ({ ...p, new: e.target.value }))} placeholder="New password" className="w-full h-11 px-4 rounded-xl bg-black/30 border border-white/10 text-[14px] text-white placeholder:text-slate-600 outline-none focus:border-[hsl(var(--accent))]" />
                <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Confirm new password" className="w-full h-11 px-4 rounded-xl bg-black/30 border border-white/10 text-[14px] text-white placeholder:text-slate-600 outline-none focus:border-[hsl(var(--accent))]" />
                {pwError && <p className="text-[12px] text-red-400 font-semibold">{pwError}</p>}
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setPwModal(false)} className="flex-1 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[13px] transition">Cancel</button>
                <button onClick={handlePasswordChange} disabled={pwSaving || !pwForm.current || !pwForm.new} className="flex-1 h-11 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-50 text-white font-bold text-[13px] transition">{pwSaving ? 'Saving...' : 'Update Password'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
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

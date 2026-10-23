import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BRAND } from '../../data/mock';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, canWrite, ROLE_NAMES } from '../../lib/admin';
import {
  LayoutDashboard, Users as UsersIcon, FileStack, Globe, Plug, Download, UserCog,
  LogOut, ArrowLeft, Banknote, Megaphone, Settings, ClipboardList, Tag, Briefcase, Image as ImageIcon,
  Key, User, Building2, BookOpen, Database, FileText, Bot, Brain, Newspaper, ShieldCheck, Mail,
  Inbox, CreditCard, History, Activity, ScanSearch, Lock,
} from 'lucide-react';
import { avatarUrl } from '../../lib/avatars';
import { useDialogA11y } from '../../hooks/use-dialog-a11y';

const TABS = [
  { id: 'overview',     to: '/admin',               label: 'Overview',     Icon: LayoutDashboard, testid: 'admin-nav-overview' },
  { id: 'users',        to: '/admin/users',         label: 'Users',        Icon: UsersIcon,       testid: 'admin-nav-users' },
  { id: 'applications', to: '/admin/applications',  label: 'Applications', Icon: FileStack,       testid: 'admin-nav-applications' },
  { id: 'review',       to: '/admin/review',        label: 'Doc review',   Icon: ScanSearch,      testid: 'admin-nav-review' },
  { id: 'leads',        to: '/admin/leads',         label: 'Leads',        Icon: Inbox,           testid: 'admin-nav-leads' },
  { id: 'payments',     to: '/admin/payments',      label: 'Payments',     Icon: CreditCard,      testid: 'admin-nav-payments' },
  { id: 'countries',    to: '/admin/countries',     label: 'Countries',    Icon: Globe,           testid: 'admin-nav-countries' },
  { id: 'pricing',      to: '/admin/pricing',       label: 'Pricing',      Icon: Banknote,        testid: 'admin-nav-pricing' },
  { id: 'events',       to: '/admin/events',        label: 'Hero Events',  Icon: Megaphone,       testid: 'admin-nav-events' },
  { id: 'global-events',to: '/admin/global-events', label: 'Global Events',Icon: Globe,           testid: 'admin-nav-global-events' },
  { id: 'moderation',   to: '/admin/moderation',    label: 'Moderation',   Icon: Newspaper,       testid: 'admin-nav-moderation' },
  { id: 'requests',    to: '/admin/requests',      label: 'Requests',     Icon: ClipboardList,   testid: 'admin-nav-requests' },
  { id: 'promotions',  to: '/admin/promotions',    label: 'Promotions',   Icon: Tag,             testid: 'admin-nav-promotions' },
  { id: 'promocodes',  to: '/admin/promocodes',    label: 'Promo Codes',   Icon: Tag,             testid: 'admin-nav-promocodes' },
  { id: 'agents',       to: '/admin/agents',        label: 'Agents',       Icon: Briefcase,       testid: 'admin-nav-agents' },
  { id: 'staff',        to: '/admin/staff',         label: 'Staff',        Icon: UserCog,         testid: 'admin-nav-staff' },
  { id: 'admins',       to: '/admin/admins',        label: 'Admins',       Icon: ShieldCheck,     testid: 'admin-nav-admins', superOnly: true },
  { id: 'newsletter',   to: '/admin/newsletter',    label: 'Newsletter',   Icon: Mail,            testid: 'admin-nav-newsletter' },
  { id: 'integrations', to: '/admin/integrations',  label: 'Integrations', Icon: Plug,            testid: 'admin-nav-integrations', superOnly: true },
  { id: 'universities', to: '/admin/universities',  label: 'Universities', Icon: Building2,       testid: 'admin-nav-universities' },
  { id: 'programs',     to: '/admin/programs',      label: 'Programs',     Icon: BookOpen,        testid: 'admin-nav-programs' },
  { id: 'exports',      to: '/admin/exports',       label: 'Exports',      Icon: Download,        testid: 'admin-nav-exports' },
  { id: 'destinations', to: '/admin/destinations',  label: 'Destinations', Icon: ImageIcon,        testid: 'admin-nav-destinations' },
  { id: 'rag',          to: '/admin/rag',           label: 'RAG & Vectors', Icon: Database,        testid: 'admin-nav-rag' },
  { id: 'prompts',      to: '/admin/prompts',       label: 'Prompts',      Icon: FileText,         testid: 'admin-nav-prompts' },
  { id: 'agents-v2',    to: '/admin/agents-v2',     label: 'Agents V2',    Icon: Bot,              testid: 'admin-nav-agents-v2' },
  { id: 'hive-learning', to: '/admin/hive-learning', label: 'Hive Learning', Icon: Brain,           testid: 'admin-nav-hive-learning' },
  { id: 'health',       to: '/admin/health',        label: 'System health', Icon: Activity,       testid: 'admin-nav-health' },
  { id: 'audit',        to: '/admin/audit',         label: 'Audit log',    Icon: History,         testid: 'admin-nav-audit' },
  { id: 'security',     to: '/admin/security',      label: 'My security',  Icon: Lock,            testid: 'admin-nav-security' },
  { id: 'settings',     to: '/admin/settings',      label: 'Settings',     Icon: Settings,        testid: 'admin-nav-settings', superOnly: true },
];

export default function AdminShell({ children }) {
  const { admin, logout } = useAdminAuth();
  const pathname = useLocation().pathname.replace(/\/+$/, '') || '/';
  const [profileOpen, setProfileOpen] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const dialogProps = useDialogA11y(pwModal, () => setPwModal(false));
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  const user = admin;
  const [critical, setCritical] = useState(0);
  useEffect(() => {
    adminClient()
      .get('/alerts')
      .then((r) => setCritical((r.data.items || []).filter((a) => a.severity === 'critical').length))
      .catch(() => {});
  }, []);
  const badge = (t) => t.id === 'applications' && critical > 0 && (
    <span
      data-testid={`admin-nav-applications-critical${t.mobile ? '-m' : ''}`}
      title={`${critical} critical alert${critical === 1 ? '' : 's'}`}
      className={`${t.mobile ? 'ml-1.5' : 'ml-auto'} min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold tabular-nums`}
    >
      {critical}
    </span>
  );
  const tabs = TABS.filter((t) => !t.superOnly || admin?.is_super_admin);
  const mustEnrol = !!admin?.two_factor_required;
  const role = admin?.admin_role;
  const limited = admin && !canWrite(admin, 'manage');

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
    <div className="admin-theme h-screen bg-[#0b1020] text-slate-100" data-testid="admin-shell">
      <div className="grid lg:grid-cols-[260px_1fr] h-screen">
        <aside className="hidden lg:flex flex-col bg-[#0a0e1e] border-r border-white/5 p-5 overflow-y-auto admin-scrollbar">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-200 hover:text-white">
            <img src={BRAND.logo} alt="We Hive" className="h-10 w-auto brightness-0 invert" />
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-semibold">Admin</span>
          </Link>

          <nav aria-label="Admin sections" className="mt-8 space-y-0.5 flex-1">
            {tabs.map((t) => {
              const Icon = t.Icon;
              const active = pathname === t.to || (t.id !== 'overview' && pathname.startsWith(t.to));
              return (
                <NavLink
                  key={t.id}
                  to={t.to}
                  end={t.id === 'overview'}
                  data-testid={t.testid}
                  className={`flex items-center gap-3 px-3 min-h-[40px] rounded-lg text-[13.5px] font-semibold transition-colors duration-150 ${
                    active
                      ? 'bg-[hsl(var(--blue-700))] text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  {badge(t)}
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
                  <div className="text-[12px] text-slate-400 truncate">{user?.email}</div>
                </div>
              </button>

              {profileOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-[#111632] border border-white/10 shadow-2xl overflow-hidden z-50">
                  <button
                    onClick={() => { setPwModal(true); setProfileOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-4 min-h-[40px] text-[13px] font-semibold text-slate-200 hover:bg-white/5 transition-colors"
                  >
                    <Key className="w-3.5 h-3.5" /> Change Password
                  </button>
                  <button
                    onClick={() => { logout(); setProfileOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-4 min-h-[40px] text-[13px] font-semibold text-red-300 hover:bg-white/5 transition-colors border-t border-white/5"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 hover:border-white/30 min-h-[36px] px-4 text-[12px] font-semibold text-slate-300 hover:text-white transition-colors w-full"
              >
                <ArrowLeft className="w-3 h-3" /> Site
              </Link>
            </div>
          </div>
        </aside>

        <main className="p-5 sm:p-8 lg:p-10 max-w-full overflow-y-auto relative z-10 admin-scrollbar">
          {/* Mobile tab pill bar */}
          <nav aria-label="Admin sections" className="lg:hidden flex overflow-x-auto snap-x scroll-px-5 [scrollbar-width:none] gap-1.5 mb-5 -mx-5 px-5">
            {tabs.map((t) => {
              const active = pathname === t.to || (t.id !== 'overview' && pathname.startsWith(t.to));
              return (
                <NavLink
                  key={t.id}
                  to={t.to}
                  end={t.id === 'overview'}
                  className={`shrink-0 snap-start inline-flex items-center rounded-lg px-3.5 min-h-[40px] text-[13px] font-semibold whitespace-nowrap transition-colors ${
                    active ? 'bg-[hsl(var(--blue-700))] text-white' : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  {t.label}
                  {badge({ ...t, mobile: true })}
                </NavLink>
              );
            })}
          </nav>
          {mustEnrol && (
            <div role="alert" data-testid="admin-2fa-required" className="mb-5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-100">
              Two-factor sign-in is required for every admin. Turn it on below to unlock the rest of the panel.
            </div>
          )}
          {!mustEnrol && limited && (
            <div data-testid="admin-role-banner" className="mb-5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[12.5px] text-slate-300">
              You're signed in as <span className="font-semibold text-white">{ROLE_NAMES[role] || role}</span>
              {role === 'viewer' ? ' — you can view everything but not change it.' : role === 'support'
                ? ' — you can work on applications, leads and document review; everything else is view-only.'
                : ' — you can manage payments, pricing and promo codes; everything else is view-only.'}
            </div>
          )}
          {mustEnrol && !pathname.startsWith('/admin/security') ? <Navigate to="/admin/security" replace /> : children}
        </main>
      </div>

      {/* Password Change Modal */}
      {pwModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setPwModal(false)}>
          <div {...dialogProps} className="rounded-2xl bg-[#111632] border border-white/10 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-[16px] font-semibold text-white mb-4">Change password</h3>
              <div className="space-y-2">
                <label htmlFor="admin-pw-current" className="block text-[12px] font-semibold text-slate-300 mb-1">Current password</label>
                <input id="admin-pw-current" type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} placeholder="Current password" className="w-full h-11 px-4 rounded-xl bg-black/30 border border-white/10 text-[14px] text-white placeholder:text-slate-500 outline-none focus:border-[hsl(var(--blue-700))]" />
                <label htmlFor="admin-pw-new" className="block text-[12px] font-semibold text-slate-300 mb-1">New password</label>
                <input id="admin-pw-new" type="password" value={pwForm.new} onChange={e => setPwForm(p => ({ ...p, new: e.target.value }))} placeholder="New password" className="w-full h-11 px-4 rounded-xl bg-black/30 border border-white/10 text-[14px] text-white placeholder:text-slate-500 outline-none focus:border-[hsl(var(--blue-700))]" />
                <label htmlFor="admin-pw-confirm" className="block text-[12px] font-semibold text-slate-300 mb-1">Confirm new password</label>
                <input id="admin-pw-confirm" type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Confirm new password" className="w-full h-11 px-4 rounded-xl bg-black/30 border border-white/10 text-[14px] text-white placeholder:text-slate-500 outline-none focus:border-[hsl(var(--blue-700))]" />
                {pwError && <p className="text-[12px] text-red-400 font-semibold">{pwError}</p>}
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setPwModal(false)} className="flex-1 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-[13px] transition-colors">Cancel</button>
                <button onClick={handlePasswordChange} disabled={pwSaving || !pwForm.current || !pwForm.new} className="flex-1 h-11 rounded-xl bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] disabled:opacity-50 text-white font-semibold text-[13px] transition-colors">{pwSaving ? 'Saving...' : 'Update Password'}</button>
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
    <div className="flex items-end justify-between gap-4 flex-wrap mb-6 sm:mb-8 pb-5 border-b border-white/5">
      <div>
        <div className="text-[12px] uppercase tracking-[0.14em] font-semibold text-blue-300">
          We Hive · Super Admin
        </div>
        <h1 className="mt-1.5 font-display font-bold text-[26px] sm:text-[32px] leading-tight tracking-[-0.02em] text-white">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[14px] text-slate-400 max-w-2xl">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Panel({ children, className = '' }) {
  return (
    <div className={`rounded-2xl bg-[#111632] border border-white/[0.08] p-4 sm:p-5 ${className}`}>{children}</div>
  );
}

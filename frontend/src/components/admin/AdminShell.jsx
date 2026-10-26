import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import { BRAND } from '../../data/mock';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, canWrite, ROLE_NAMES } from '../../lib/admin';
import {
  LayoutDashboard, Users as UsersIcon, FileStack, Globe, Plug, Download, UserCog,
  LogOut, ArrowLeft, Banknote, Megaphone, Settings, ClipboardList, Tag, Briefcase, Image as ImageIcon,
  Key, Building2, BookOpen, Database, FileText, Bot, Brain, Newspaper, ShieldCheck, Mail,
  Inbox, CreditCard, History, Activity, ScanSearch, Lock, BarChart3, ChevronLeft, ChevronRight, Pencil,
} from 'lucide-react';
import { avatarUrl } from '../../lib/avatars';
import { useDialogA11y } from '../../hooks/use-dialog-a11y';

// Groups define sidebar section order and headers
const GROUPS = [
  'Overview',
  'Users & Applications',
  'Content & Destinations',
  'Commercial',
  'AI & System',
  'Admin',
];

const TABS = [
  { id: 'overview',      to: '/admin',                label: 'Overview',      Icon: LayoutDashboard, testid: 'admin-nav-overview',      group: 'Overview' },
  { id: 'monitoring',    to: '/admin/monitoring',     label: 'Monitoring',    Icon: BarChart3,       testid: 'admin-nav-monitoring',    group: 'Overview' },
  { id: 'users',         to: '/admin/users',          label: 'Users',         Icon: UsersIcon,       testid: 'admin-nav-users',         group: 'Users & Applications' },
  { id: 'applications',  to: '/admin/applications',   label: 'Applications',  Icon: FileStack,       testid: 'admin-nav-applications',  group: 'Users & Applications' },
  { id: 'review',        to: '/admin/review',         label: 'Doc review',    Icon: ScanSearch,      testid: 'admin-nav-review',        group: 'Users & Applications' },
  { id: 'leads',         to: '/admin/leads',          label: 'Leads',         Icon: Inbox,           testid: 'admin-nav-leads',         group: 'Users & Applications' },
  { id: 'countries',     to: '/admin/countries',      label: 'Countries',     Icon: Globe,           testid: 'admin-nav-countries',     group: 'Content & Destinations' },
  { id: 'universities',  to: '/admin/universities',   label: 'Universities',  Icon: Building2,       testid: 'admin-nav-universities',  group: 'Content & Destinations' },
  { id: 'programs',      to: '/admin/programs',       label: 'Programs',      Icon: BookOpen,        testid: 'admin-nav-programs',      group: 'Content & Destinations' },
  { id: 'destinations',  to: '/admin/destinations',   label: 'Destinations',  Icon: ImageIcon,       testid: 'admin-nav-destinations',  group: 'Content & Destinations' },
  { id: 'events',        to: '/admin/events',         label: 'Hero Events',   Icon: Megaphone,       testid: 'admin-nav-events',        group: 'Content & Destinations' },
  { id: 'global-events', to: '/admin/global-events',  label: 'Global Events', Icon: Globe,           testid: 'admin-nav-global-events', group: 'Content & Destinations' },
  { id: 'hive-learning', to: '/admin/hive-learning',  label: 'Hive Learning', Icon: Brain,           testid: 'admin-nav-hive-learning', group: 'Content & Destinations' },
  { id: 'moderation',    to: '/admin/moderation',     label: 'Moderation',    Icon: Newspaper,       testid: 'admin-nav-moderation',    group: 'Content & Destinations' },
  { id: 'payments',      to: '/admin/payments',       label: 'Payments',      Icon: CreditCard,      testid: 'admin-nav-payments',      group: 'Commercial' },
  { id: 'pricing',       to: '/admin/pricing',        label: 'Pricing',       Icon: Banknote,        testid: 'admin-nav-pricing',       group: 'Commercial' },
  { id: 'promotions',    to: '/admin/promotions',     label: 'Promotions',    Icon: Tag,             testid: 'admin-nav-promotions',    group: 'Commercial' },
  { id: 'promocodes',    to: '/admin/promocodes',     label: 'Promo Codes',   Icon: Tag,             testid: 'admin-nav-promocodes',    group: 'Commercial' },
  { id: 'requests',      to: '/admin/requests',       label: 'Requests',      Icon: ClipboardList,   testid: 'admin-nav-requests',      group: 'Commercial' },
  { id: 'agents',        to: '/admin/agents',         label: 'Agents',        Icon: Briefcase,       testid: 'admin-nav-agents',        group: 'Commercial' },
  { id: 'exports',       to: '/admin/exports',        label: 'Exports',       Icon: Download,        testid: 'admin-nav-exports',       group: 'Commercial' },
  { id: 'rag',           to: '/admin/rag',            label: 'RAG & Vectors', Icon: Database,        testid: 'admin-nav-rag',           group: 'AI & System' },
  { id: 'prompts',       to: '/admin/prompts',        label: 'Prompts',       Icon: FileText,        testid: 'admin-nav-prompts',       group: 'AI & System' },
  { id: 'agents-v2',     to: '/admin/agents-v2',      label: 'Agents V2',     Icon: Bot,             testid: 'admin-nav-agents-v2',     group: 'AI & System' },
  { id: 'newsletter',    to: '/admin/newsletter',     label: 'Newsletter',    Icon: Mail,            testid: 'admin-nav-newsletter',    group: 'AI & System' },
  { id: 'health',        to: '/admin/health',         label: 'System health', Icon: Activity,        testid: 'admin-nav-health',        group: 'AI & System' },
  { id: 'integrations',  to: '/admin/integrations',   label: 'Integrations',  Icon: Plug,            testid: 'admin-nav-integrations',  group: 'AI & System', superOnly: true },
  { id: 'staff',         to: '/admin/staff',          label: 'Staff',         Icon: UserCog,         testid: 'admin-nav-staff',         group: 'Admin' },
  { id: 'admins',        to: '/admin/admins',         label: 'Admins',        Icon: ShieldCheck,     testid: 'admin-nav-admins',        group: 'Admin', superOnly: true },
  { id: 'audit',         to: '/admin/audit',          label: 'Audit log',     Icon: History,         testid: 'admin-nav-audit',         group: 'Admin' },
  { id: 'security',      to: '/admin/security',       label: 'My security',   Icon: Lock,            testid: 'admin-nav-security',      group: 'Admin' },
  { id: 'settings',      to: '/admin/settings',       label: 'Settings',      Icon: Settings,        testid: 'admin-nav-settings',      group: 'Admin', superOnly: true },
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
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [nameBusy, setNameBusy] = useState(false);

  // Responsive layout
  const responsive = useResponsive();

  // Manual collapse override (stored) — only applies when showSidebar + !iconOnly
  const [userCollapsed, setUserCollapsed] = useState(() => {
    try { return localStorage.getItem('admin-sidebar-collapsed') === '1'; } catch { return false; }
  });
  const toggleCollapse = () => setUserCollapsed((v) => {
    const next = !v;
    try { localStorage.setItem('admin-sidebar-collapsed', next ? '1' : '0'); } catch {}
    return next;
  });

  // Derive effective collapsed state: tablet always icon-rail; large screens use manual toggle
  const collapsed = !responsive.showSidebar ? false : (responsive.iconOnly || userCollapsed);

  const user = admin;
  const [critical, setCritical] = useState(0);
  useEffect(() => {
    adminClient()
      .get('/alerts')
      .then((r) => setCritical((r.data.items || []).filter((a) => a.severity === 'critical').length))
      .catch(() => {});
  }, []);
  const badge = (t, mobile = false) => t.id === 'applications' && critical > 0 && (
    <span
      data-testid={`admin-nav-applications-critical${mobile ? '-m' : ''}`}
      title={`${critical} critical alert${critical === 1 ? '' : 's'}`}
      className={`${mobile ? 'ml-1.5' : collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'} min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold tabular-nums`}
    >
      {critical}
    </span>
  );
  const tabs = TABS.filter((t) => !t.superOnly || admin?.is_super_admin);
  const mustEnrol = !!admin?.two_factor_required;
  const role = admin?.admin_role;
  const limited = admin && !canWrite(admin, 'manage');

  const saveName = async () => {
    if (!nameVal.trim()) return;
    setNameBusy(true);
    try {
      await adminClient().put('/me', { name: nameVal.trim() });
      setEditingName(false);
      window.location.reload();
    } catch { } finally { setNameBusy(false); }
  };

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
    <div className="admin-theme h-screen bg-[#F8FAFF] text-[#1B2B5E]" data-testid="admin-shell"
      style={{ fontSize: `${responsive.textScale}rem` }}>
      <div className="grid h-screen transition-[grid-template-columns] duration-200"
        style={{ gridTemplateColumns: responsive.showSidebar ? `${responsive.sidebarWidth}px 1fr` : '1fr' }}>
        <aside className={`${responsive.showSidebar ? 'flex' : 'hidden'} flex-col bg-[#F0F4FF] border-r border-[#E8EDF8] overflow-y-auto admin-scrollbar`}>
          {/* Logo + collapse toggle */}
          <div className={`flex items-center border-b border-[#E8EDF8] shrink-0 ${collapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'}`}>
            {!collapsed && (
              <Link to="/" className="inline-flex items-center gap-2 text-[#1B2B5E] hover:text-[#011CB5] min-w-0">
                <img src={BRAND.logo} alt="We Hive" className="h-8 w-auto shrink-0" />
                <span className="text-[10px] uppercase tracking-[0.16em] text-gray-400 font-bold">Admin</span>
              </Link>
            )}
            <button
              onClick={toggleCollapse}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="h-7 w-7 rounded-lg bg-[#E5EBFF] hover:bg-[#D0DCFF] inline-flex items-center justify-center text-gray-500 hover:text-[#011CB5] transition-colors shrink-0"
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flag-stripe" />

          {/* Grouped nav */}
          <nav aria-label="Admin sections" className={`flex-1 overflow-y-auto py-3 admin-scrollbar ${collapsed ? 'px-1.5' : 'px-3'}`}>
            {GROUPS.map((group) => {
              const groupTabs = tabs.filter((t) => t.group === group);
              if (!groupTabs.length) return null;
              return (
                <div key={group} className={collapsed ? 'mb-3' : 'mb-5'}>
                  {!collapsed && (
                    <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-gray-400 px-2 mb-1.5">{group}</div>
                  )}
                  <div className="space-y-0.5">
                    {groupTabs.map((t) => {
                      const Icon = t.Icon;
                      const active = pathname === t.to || (t.id !== 'overview' && pathname.startsWith(t.to));
                      if (collapsed) {
                        return (
                          <NavLink
                            key={t.id}
                            to={t.to}
                            end={t.id === 'overview'}
                            data-testid={t.testid}
                            title={t.label}
                            className={`relative flex items-center justify-center h-10 w-full rounded-lg transition-colors duration-150 ${
                              active ? 'bg-[#011CB5] text-white' : 'text-gray-500 hover:text-[#011CB5] hover:bg-[#EEF2FF]'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {badge(t)}
                          </NavLink>
                        );
                      }
                      return (
                        <NavLink
                          key={t.id}
                          to={t.to}
                          end={t.id === 'overview'}
                          data-testid={t.testid}
                          className={`flex items-center gap-3 px-3 min-h-[38px] rounded-lg text-[13px] font-semibold transition-colors duration-150 ${
                            active
                              ? 'text-white shadow-sm border-l-[3px] border-[#011CB5] pl-[10px]'
                              : 'text-gray-500 hover:text-[#1B2B5E] hover:bg-[#EEF2FF] border-l-[3px] border-transparent'
                          }`}
                          style={active ? { background: 'linear-gradient(90deg, #011CB5 0%, rgba(1,28,181,0.75) 100%)' } : {}}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{t.label}</span>
                          {badge(t)}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Footer: avatar + site link */}
          <div className={`border-t border-[#E8EDF8] shrink-0 ${collapsed ? 'p-2' : 'p-3'}`}>
            {collapsed ? (
              <div className="space-y-1.5">
                <button onClick={() => setProfileOpen(!profileOpen)} className="relative w-full flex justify-center" title={user?.email}>
                  <span className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-[#E8EDF8]">
                    <img src={avatarUrl({ seed: user?.email || user?.id, gender: 'hero' })} alt="admin" className="h-full w-full object-cover" />
                  </span>
                </button>
                <Link to="/" title="Back to site" className="flex items-center justify-center h-8 rounded-lg bg-[#EEF2FF] hover:bg-[#E5EBFF] text-gray-500 hover:text-[#011CB5] transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <>
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-3 px-1 w-full hover:bg-[#EEF2FF] rounded-xl py-2 -mx-1 transition"
                  >
                    <span className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-[#E8EDF8] shrink-0">
                      <img src={avatarUrl({ seed: user?.email || user?.id, gender: 'hero' })} alt="admin" className="h-full w-full object-cover" />
                    </span>
                    <div className="min-w-0 text-left">
                      <div className="text-[13px] font-bold text-[#1B2B5E] truncate">{user?.name || 'Admin'}</div>
                      <div className="text-[12px] text-gray-500 truncate">{user?.email}</div>
                    </div>
                  </button>

                  {profileOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-white border border-[#E8EDF8] shadow-lg overflow-hidden z-50">
                      {editingName ? (
                        <div className="px-4 py-3 flex gap-2">
                          <input
                            autoFocus
                            value={nameVal}
                            onChange={(e) => setNameVal(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                            placeholder="Display name"
                            className="flex-1 h-8 px-2 rounded-lg bg-gray-50 border border-gray-200 text-[13px] text-[#1B2B5E] placeholder:text-gray-400 outline-none focus:border-[#011CB5]"
                          />
                          <button disabled={nameBusy} onClick={saveName} className="h-8 px-3 rounded-lg bg-[#011CB5] text-white text-[12px] font-bold disabled:opacity-50">
                            {nameBusy ? '…' : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setNameVal(user?.name || ''); setEditingName(true); }}
                          className="flex items-center gap-2.5 w-full px-4 min-h-[40px] text-[13px] font-semibold text-gray-700 hover:bg-[#F5F7FF] transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit name
                        </button>
                      )}
                      <button
                        onClick={() => { setPwModal(true); setProfileOpen(false); setEditingName(false); }}
                        className="flex items-center gap-2.5 w-full px-4 min-h-[40px] text-[13px] font-semibold text-gray-700 hover:bg-[#F5F7FF] transition-colors border-t border-[#E8EDF8]"
                      >
                        <Key className="w-3.5 h-3.5" /> Change Password
                      </button>
                      <button
                        onClick={() => { logout(); setProfileOpen(false); }}
                        className="flex items-center gap-2.5 w-full px-4 min-h-[40px] text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors border-t border-[#E8EDF8]"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign out
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#E8EDF8] hover:border-blue-300 min-h-[34px] px-4 text-[12px] font-semibold text-gray-600 hover:text-[#1B2B5E] transition-colors w-full"
                  >
                    <ArrowLeft className="w-3 h-3" /> Site
                  </Link>
                </div>
              </>
            )}
          </div>
        </aside>

        <main className="overflow-y-auto relative z-10 admin-scrollbar bg-[#F8FAFF]"
          style={{ padding: `${responsive.gutter}px`, fontSize: 'inherit' }}>
          <div style={responsive.contentMax ? { maxWidth: `${responsive.contentMax}px`, margin: '0 auto' } : undefined}>
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
                    active ? 'bg-[#011CB5] text-white' : 'bg-white border border-[#E8EDF8] text-gray-600 hover:text-[#1B2B5E]'
                  }`}
                >
                  {t.label}
                  {badge({ ...t, mobile: true })}
                </NavLink>
              );
            })}
          </nav>
          {mustEnrol && (
            <div role="alert" data-testid="admin-2fa-required" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
              Two-factor sign-in is required for every admin. Turn it on below to unlock the rest of the panel.
            </div>
          )}
          {!mustEnrol && limited && (
            <div data-testid="admin-role-banner" className="mb-5 rounded-xl border border-[#E8EDF8] bg-blue-50 px-4 py-2.5 text-[12.5px] text-gray-700">
              You're signed in as <span className="font-semibold text-[#1B2B5E]">{ROLE_NAMES[role] || role}</span>
              {role === 'viewer' ? ' — you can view everything but not change it.' : role === 'support'
                ? ' — you can work on applications, leads and document review; everything else is view-only.'
                : ' — you can manage payments, pricing and promo codes; everything else is view-only.'}
            </div>
          )}
          {mustEnrol && !pathname.startsWith('/admin/security') ? <Navigate to="/admin/security" replace /> : children}
          </div>
        </main>
      </div>

      {/* Password Change Modal */}
      {pwModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setPwModal(false)}>
          <div {...dialogProps} className="rounded-2xl bg-white border border-[#E8EDF8] w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-[16px] font-semibold text-[#1B2B5E] mb-4">Change password</h3>
              <div className="space-y-2">
                <label htmlFor="admin-pw-current" className="block text-[12px] font-semibold text-gray-600 mb-1">Current password</label>
                <input id="admin-pw-current" type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} placeholder="Current password" className="w-full h-11 px-4 rounded-xl bg-gray-50 border border-gray-200 text-[14px] text-[#1B2B5E] placeholder:text-gray-400 outline-none focus:border-[#011CB5]" />
                <label htmlFor="admin-pw-new" className="block text-[12px] font-semibold text-gray-600 mb-1">New password</label>
                <input id="admin-pw-new" type="password" value={pwForm.new} onChange={e => setPwForm(p => ({ ...p, new: e.target.value }))} placeholder="New password" className="w-full h-11 px-4 rounded-xl bg-gray-50 border border-gray-200 text-[14px] text-[#1B2B5E] placeholder:text-gray-400 outline-none focus:border-[#011CB5]" />
                <label htmlFor="admin-pw-confirm" className="block text-[12px] font-semibold text-gray-600 mb-1">Confirm new password</label>
                <input id="admin-pw-confirm" type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Confirm new password" className="w-full h-11 px-4 rounded-xl bg-gray-50 border border-gray-200 text-[14px] text-[#1B2B5E] placeholder:text-gray-400 outline-none focus:border-[#011CB5]" />
                {pwError && <p className="text-[12px] text-red-600 font-semibold">{pwError}</p>}
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setPwModal(false)} className="flex-1 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[13px] transition-colors">Cancel</button>
                <button onClick={handlePasswordChange} disabled={pwSaving || !pwForm.current || !pwForm.new} className="flex-1 h-11 rounded-xl bg-[#011CB5] hover:bg-[#0122D4] disabled:opacity-50 text-white font-semibold text-[13px] transition-colors">{pwSaving ? 'Saving...' : 'Update Password'}</button>
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
    <div className="flex items-end justify-between gap-4 flex-wrap mb-6 sm:mb-8 pb-5 border-b border-[#E8EDF8]">
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#011CB5]">
          We Hive · Super Admin
        </div>
        <h1 className="mt-1.5 font-display font-bold text-[26px] sm:text-[32px] leading-tight tracking-[-0.02em] text-[#1B2B5E]">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[13px] text-gray-500 max-w-2xl">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Panel({ children, className = '' }) {
  return (
    <div
      className={`card-lift relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${className}`}
      style={{ background: '#FFFFFF', borderColor: '#E8EDF8', boxShadow: '0 1px 4px rgba(27,43,94,0.06)' }}
    >
      {children}
    </div>
  );
}

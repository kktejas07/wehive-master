/**
 * AdminShell.jsx — WeHive admin panel shell.
 *
 * Uses the same design system as the landing pages and the user account
 * (index.css): Figtree headings + Noto Sans body, white `.card-surface` cards,
 * `.icon-tile` icons, `.eyebrow` labels and a light sidebar whose active item
 * is the solid navy pill from the account nav. The `admin-theme` class on the
 * root defines the --glass / --text-* variables the tab components rely on.
 *
 * Exports for tabs: AdminHeader, Panel, StatCard, ItemRow, Pill, SectionLabel.
 */

import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import { BRAND } from '../../data/mock';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, canWrite, canViewTab, ROLE_NAMES } from '../../lib/admin';
import {
  LayoutDashboard, Users as UsersIcon, FileStack, Globe, Plug, Download, UserCog,
  LogOut, ArrowLeft, Banknote, Megaphone, Settings, ClipboardList, Tag, Briefcase, Image as ImageIcon,
  Key, Building2, BookOpen, Database, FileText, Bot, Brain, Newspaper, ShieldCheck, Mail,
  Inbox, CreditCard, History, Activity, ScanSearch, Lock, BarChart3, ChevronLeft, ChevronRight, Pencil, Clock, Share2, CalendarCheck,
  Eye, Target, UserCheck, GitBranch, Radar, PenTool, Gift, GraduationCap,
} from 'lucide-react';
import { avatarUrl } from '../../lib/avatars';
import { useDialogA11y } from '../../hooks/use-dialog-a11y';

/* ─── Sidebar width constants ──────────────────────────────────────────── */
const SIDEBAR_OPEN   = 248;
const SIDEBAR_CLOSED =  60;

/* ─── Nav groups & tabs ────────────────────────────────────────────────── */
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
  { id: 'announcements', to: '/admin/announcements', label: 'Announcements', Icon: Megaphone,    testid: 'admin-nav-announcements', group: 'Content & Destinations' },
  { id: 'hive-learning', to: '/admin/hive-learning',  label: 'Hive Learning', Icon: Brain,           testid: 'admin-nav-hive-learning', group: 'Content & Destinations' },
  { id: 'moderation',    to: '/admin/moderation',     label: 'Moderation',    Icon: Newspaper,       testid: 'admin-nav-moderation',    group: 'Content & Destinations' },
  { id: 'payments',      to: '/admin/payments',       label: 'Payments',      Icon: CreditCard,      testid: 'admin-nav-payments',      group: 'Commercial' },
  { id: 'pricing',       to: '/admin/pricing',        label: 'Pricing',       Icon: Banknote,        testid: 'admin-nav-pricing',       group: 'Commercial' },
  { id: 'promotions',    to: '/admin/promotions',     label: 'Promotions',    Icon: Tag,             testid: 'admin-nav-promotions',    group: 'Commercial' },
  { id: 'promocodes',    to: '/admin/promocodes',     label: 'Promo Codes',   Icon: Tag,             testid: 'admin-nav-promocodes',    group: 'Commercial' },
  { id: 'requests',      to: '/admin/requests',       label: 'Requests',      Icon: ClipboardList,   testid: 'admin-nav-requests',      group: 'Commercial' },
  { id: 'agents',        to: '/admin/agents',         label: 'Agents',        Icon: Briefcase,       testid: 'admin-nav-agents',        group: 'Commercial' },
  { id: 'referrals',     to: '/admin/referrals',     label: 'Referrals',     Icon: Share2,       testid: 'admin-nav-referrals',     group: 'Commercial' },
  { id: 'offers',        to: '/admin/offers',        label: 'Offers',        Icon: Gift,         testid: 'admin-nav-offers',        group: 'Commercial' },
  { id: 'campus',        to: '/admin/campus',        label: 'Campus',        Icon: GraduationCap, testid: 'admin-nav-campus',      group: 'Commercial' },
  { id: 'exports',       to: '/admin/exports',        label: 'Exports',       Icon: Download,        testid: 'admin-nav-exports',       group: 'Commercial' },
  { id: 'rag',           to: '/admin/rag',            label: 'RAG & Vectors', Icon: Database,        testid: 'admin-nav-rag',           group: 'AI & System' },
  { id: 'prompts',       to: '/admin/prompts',        label: 'Prompts',       Icon: FileText,        testid: 'admin-nav-prompts',       group: 'AI & System' },
  { id: 'agents-v2',     to: '/admin/agents-v2',      label: 'Agents V2',     Icon: Bot,             testid: 'admin-nav-agents-v2',     group: 'AI & System' },
  { id: 'agentic',        to: '/admin/agentic',        label: 'Agentic AI',    Icon: Bot,             testid: 'admin-nav-agentic',       group: 'AI & System' },
  { id: 'observability',   to: '/admin/observability',     label: 'Observability',     Icon: Eye,            testid: 'admin-nav-observability',  group: 'AI & System' },
  { id: 'rag-eval',        to: '/admin/rag-eval',          label: 'RAG Eval',          Icon: Target,         testid: 'admin-nav-rag-eval',       group: 'AI & System' },
  { id: 'student-memory',  to: '/admin/student-memory',    label: 'Student Memory',    Icon: UserCheck,      testid: 'admin-nav-student-memory', group: 'AI & System' },
  { id: 'graph-rag',       to: '/admin/graph-rag',         label: 'Graph RAG',         Icon: GitBranch,      testid: 'admin-nav-graph-rag',      group: 'AI & System' },
  { id: 'scraping',        to: '/admin/scraping',          label: 'Scraping',          Icon: Radar,          testid: 'admin-nav-scraping',       group: 'AI & System' },
  { id: 'content-pipeline',to: '/admin/content-pipeline',  label: 'Content Pipeline',  Icon: PenTool,        testid: 'admin-nav-content-pipeline',group: 'AI & System' },
  { id: 'slot-monitor',      to: '/admin/slot-monitor',      label: 'Slot Monitor',      Icon: Clock,          testid: 'admin-nav-slot-monitor',      group: 'AI & System' },
  { id: 'visa-scheduling',   to: '/admin/visa-scheduling',   label: 'Visa Scheduling',   Icon: CalendarCheck,  testid: 'admin-nav-visa-scheduling',   group: 'AI & System' },
  { id: 'newsletter',    to: '/admin/newsletter',     label: 'Newsletter',    Icon: Mail,            testid: 'admin-nav-newsletter',    group: 'AI & System' },
  { id: 'health',        to: '/admin/health',         label: 'System health', Icon: Activity,        testid: 'admin-nav-health',        group: 'AI & System' },
  { id: 'integrations',  to: '/admin/integrations',   label: 'Integrations',  Icon: Plug,            testid: 'admin-nav-integrations',  group: 'AI & System', superOnly: true },
  { id: 'staff',         to: '/admin/staff',          label: 'Staff',         Icon: UserCog,         testid: 'admin-nav-staff',         group: 'Admin' },
  { id: 'admins',        to: '/admin/admins',         label: 'Admins',        Icon: ShieldCheck,     testid: 'admin-nav-admins',        group: 'Admin', superOnly: true },
  { id: 'audit',         to: '/admin/audit',          label: 'Audit log',     Icon: History,         testid: 'admin-nav-audit',         group: 'Admin' },
  { id: 'security',      to: '/admin/security',       label: 'My security',   Icon: Lock,            testid: 'admin-nav-security',      group: 'Admin' },
  { id: 'settings',      to: '/admin/settings',       label: 'Settings',      Icon: Settings,        testid: 'admin-nav-settings',      group: 'Admin', superOnly: true },
];

/* ─── Main Shell ──────────────────────────────────────────────────────── */
export default function AdminShell({ children }) {
  const { admin, logout } = useAdminAuth();
  const pathname = useLocation().pathname.replace(/\/+$/, '') || '/';
  const [profileOpen, setProfileOpen]   = useState(false);
  const [pwModal, setPwModal]           = useState(false);
  const dialogProps = useDialogA11y(pwModal, () => setPwModal(false));
  const [pwForm, setPwForm]             = useState({ current: '', new: '', confirm: '' });
  const [pwSaving, setPwSaving]         = useState(false);
  const [pwError, setPwError]           = useState('');
  const [editingName, setEditingName]   = useState(false);
  const [nameVal, setNameVal]           = useState('');
  const [nameBusy, setNameBusy]         = useState(false);
  const responsive = useResponsive();

  /* collapse state */
  const [userCollapsed, setUserCollapsed] = useState(() => {
    try { return localStorage.getItem('admin-sidebar-collapsed') === '1'; } catch { return false; }
  });
  const toggleCollapse = () => setUserCollapsed((v) => {
    const next = !v;
    try { localStorage.setItem('admin-sidebar-collapsed', next ? '1' : '0'); } catch {}
    return next;
  });
  const collapsed = !responsive.showSidebar ? false : (responsive.iconOnly || userCollapsed);

  /* critical alerts badge */
  const user = admin;
  const [critical, setCritical] = useState(0);
  useEffect(() => {
    adminClient().get('/alerts')
      .then((r) => setCritical((r.data.items || []).filter((a) => a.severity === 'critical').length))
      .catch(() => {});
  }, []);

  const badge = (t, mobile = false) =>
    t.id === 'applications' && critical > 0 && (
      <span
        title={`${critical} critical alert${critical === 1 ? '' : 's'}`}
        className={`${mobile ? 'ml-1.5' : collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'} min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-[#E10600] text-white text-[10px] font-bold tabular-nums`}
      >
        {critical}
      </span>
    );

  const tabs       = TABS.filter((t) => (!t.superOnly || admin?.is_super_admin) && canViewTab(admin, t.id));
  const mustEnrol  = !!admin?.two_factor_required;
  const role       = admin?.admin_role;
  const limited    = admin && !canWrite(admin, 'manage');

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
    } finally { setPwSaving(false); }
  };

  /* ── Sidebar width via CSS variable (smooth transition) ── */
  const sidebarW = collapsed ? SIDEBAR_CLOSED : SIDEBAR_OPEN;

  return (
    <div
      className="admin-theme h-screen overflow-hidden"
      style={{
        /* same tokens as the landing pages / user account (index.css :root) */
        '--font-display': 'var(--font-heading)',
        '--bg':     'hsl(var(--soft-bg))',
        '--panel':  '#FFFFFF',
        '--ink':    'hsl(var(--blue-900))',
        '--muted':  'hsl(var(--muted-foreground))',
        '--line':   'hsl(var(--border))',
        '--blue':   'hsl(var(--blue-700))',
        '--red':    '#E10600',
        '--gold':   '#F2A900',
        '--soft':   'hsl(var(--blue-50))',
        '--ok':     '#0F8A4B',
        '--warn':   '#B86A00',
        /* sidebar: light rail, like the account page nav */
        '--rail':   '#FFFFFF',
        '--rail-t': 'hsl(var(--blue-50))',
        '--rail-a': 'hsl(var(--muted-foreground))',
        fontFamily: 'var(--font-body)',
        background: 'var(--bg)',
        color:      'var(--ink)',
      }}
      data-testid="admin-shell"
    >
      <div
        className="grid h-screen"
        style={{
          gridTemplateColumns: responsive.showSidebar
            ? `${sidebarW}px 1fr`
            : '1fr',
          transition: 'grid-template-columns 220ms cubic-bezier(.4,0,.2,1)',
        }}
      >
        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside
          className={`${responsive.showSidebar ? 'flex' : 'hidden'} flex-col overflow-y-auto overflow-x-hidden`}
          style={{ background: 'var(--rail)', borderRight: '1px solid var(--line)' }}
        >
          {/* Logo row */}
          <div
            className="flex items-center shrink-0 h-14"
            style={{
              borderBottom: '1px solid var(--line)',
              padding: collapsed ? '0' : '0 14px',
              justifyContent: collapsed ? 'center' : 'space-between',
            }}
          >
            {!collapsed && (
              <Link to="/" className="inline-flex items-center gap-2 min-w-0">
                <img src={BRAND.logo} alt="We Hive" className="w-[96px] h-[32px] object-cover shrink-0" />
                <span
                  style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
                    textTransform: 'uppercase', color: 'var(--rail-a)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Admin
                </span>
              </Link>
            )}
            <button
              onClick={toggleCollapse}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--rail-t)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--rail-a)',
                flexShrink: 0,
              }}
            >
              {collapsed
                ? <ChevronRight style={{ width: 14, height: 14 }} />
                : <ChevronLeft  style={{ width: 14, height: 14 }} />}
            </button>
          </div>

          {/* Flag stripe */}
          <div style={{ height: 3, background: 'linear-gradient(90deg,#011CB5 0%,#E10600 100%)', flexShrink: 0 }} />

          {/* Nav */}
          <nav
            aria-label="Admin sections"
            className="flex-1 overflow-y-auto py-3"
            style={{ padding: collapsed ? '12px 6px' : '12px 8px' }}
          >
            {GROUPS.map((group) => {
              const groupTabs = tabs.filter((t) => t.group === group);
              if (!groupTabs.length) return null;
              return (
                <div key={group} style={{ marginBottom: collapsed ? 12 : 20 }}>
                  {!collapsed && (
                    <div style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
                      textTransform: 'uppercase', color: 'var(--rail-a)',
                      padding: '0 8px', marginBottom: 4,
                      fontFamily: 'var(--font-display)',
                    }}>
                      {group}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {groupTabs.map((t) => {
                      const Icon  = t.Icon;
                      const exact = t.id === 'overview';
                      const active = exact
                        ? pathname === t.to
                        : pathname === t.to || pathname.startsWith(t.to + '/');

                      if (collapsed) {
                        return (
                          <NavLink
                            key={t.id} to={t.to} end={exact}
                            title={t.label}
                            style={{
                              position: 'relative',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              height: 40, borderRadius: 12,
                              background: active ? 'var(--blue)' : 'transparent',
                              color: active ? '#fff' : 'var(--rail-a)',
                              textDecoration: 'none', transition: 'background 150ms',
                            }}
                            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--rail-t)'; }}
                            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                          >
                            <Icon style={{ width: 16, height: 16 }} />
                            {badge(t)}
                          </NavLink>
                        );
                      }

                      return (
                        <NavLink
                          key={t.id} to={t.to} end={exact}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '16px 1fr auto',
                            alignItems: 'center', gap: 12,
                            padding: '0 12px', minHeight: 40, borderRadius: 12,
                            background: active ? 'var(--blue)' : 'transparent',
                            color: active ? '#fff' : 'var(--rail-a)',
                            fontSize: 13, fontWeight: 600, textDecoration: 'none',
                            transition: 'background 150ms',
                            fontFamily: 'var(--font-body)',
                          }}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--rail-t)'; }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.label}
                          </span>
                          {badge(t)}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div style={{ borderTop: '1px solid var(--line)', padding: collapsed ? 8 : 12, flexShrink: 0 }}>
            {collapsed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  title={user?.email}
                  style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--line)', background: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <img src={avatarUrl({ seed: user?.email || user?.id, gender: 'hero' })} alt="admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
                <Link to="/" title="Back to site" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--rail-t)', color: 'var(--rail-a)', textDecoration: 'none',
                }}>
                  <ArrowLeft style={{ width: 14, height: 14 }} />
                </Link>
              </div>
            ) : (
              <>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      padding: '6px 4px', borderRadius: 10, background: 'none',
                      border: 'none', cursor: 'pointer', color: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid var(--line)' }}>
                      <img src={avatarUrl({ seed: user?.email || user?.id, gender: 'hero' })} alt="admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.name || 'Admin'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--rail-a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.email}
                      </div>
                    </div>
                  </button>

                  {profileOpen && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 8,
                      borderRadius: 12, background: 'var(--panel)', border: '1px solid var(--line)',
                      boxShadow: '0 8px 24px rgba(0,0,0,.14)', overflow: 'hidden', zIndex: 50,
                    }}>
                      {editingName ? (
                        <div style={{ padding: '10px 12px', display: 'flex', gap: 8 }}>
                          <input
                            autoFocus value={nameVal}
                            onChange={(e) => setNameVal(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                            placeholder="Display name"
                            style={{
                              flex: 1, height: 36, padding: '0 10px', borderRadius: 8,
                              background: 'var(--soft)', border: '1px solid var(--line)',
                              fontSize: 13, color: 'var(--ink)', outline: 'none', fontFamily: 'var(--font-body)',
                            }}
                          />
                          <button disabled={nameBusy} onClick={saveName} style={{
                            height: 36, padding: '0 14px', borderRadius: 8,
                            background: 'var(--blue)', color: '#fff', border: 'none',
                            fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: nameBusy ? .5 : 1,
                          }}>
                            {nameBusy ? '…' : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <ProfileMenuItem onClick={() => { setNameVal(user?.name || ''); setEditingName(true); }} icon={<Pencil style={{ width: 14, height: 14 }} />} label="Edit name" />
                      )}
                      <ProfileMenuItem
                        onClick={() => { setPwModal(true); setProfileOpen(false); setEditingName(false); }}
                        icon={<Key style={{ width: 14, height: 14 }} />}
                        label="Change Password"
                        border
                      />
                      <ProfileMenuItem
                        onClick={() => { logout(); setProfileOpen(false); }}
                        icon={<LogOut style={{ width: 14, height: 14 }} />}
                        label="Sign out"
                        border danger
                      />
                    </div>
                  )}
                </div>
                <Link
                  to="/"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    marginTop: 8, height: 34, borderRadius: 10, width: '100%',
                    background: 'var(--rail-t)', color: 'var(--rail-a)', textDecoration: 'none',
                    fontSize: 12, fontWeight: 600, border: '1px solid var(--line)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <ArrowLeft style={{ width: 12, height: 12 }} /> Back to site
                </Link>
              </>
            )}
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────────────── */}
        <main
          className="overflow-y-auto admin-scrollbar"
          style={{ background: 'var(--bg)', padding: responsive.gutter ?? 24, fontSize: 'inherit' }}
        >
          <div style={responsive.contentMax ? { maxWidth: responsive.contentMax, margin: '0 auto' } : undefined}>
            {/* Mobile tab pill bar */}
            <nav aria-label="Admin sections" className="lg:hidden flex overflow-x-auto snap-x [scrollbar-width:none] gap-1.5 mb-5 -mx-5 px-5" style={{ scrollPaddingLeft: 20 }}>
              {tabs.map((t) => {
                const exact = t.id === 'overview';
                const active = exact ? pathname === t.to : pathname.startsWith(t.to);
                return (
                  <NavLink
                    key={t.id} to={t.to} end={exact}
                    style={{
                      flexShrink: 0, display: 'inline-flex', alignItems: 'center',
                      borderRadius: 10, padding: '0 14px', minHeight: 40,
                      fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', textDecoration: 'none',
                      background: active ? 'var(--blue)' : 'var(--panel)',
                      color: active ? '#fff' : 'var(--muted)',
                      border: `1px solid ${active ? 'transparent' : 'var(--line)'}`,
                    }}
                  >
                    {t.label}
                  </NavLink>
                );
              })}
            </nav>

            {mustEnrol && (
              <div role="alert" style={{
                marginBottom: 20, borderRadius: 12, border: '1px solid #F2A90033',
                background: '#FFF9EC', padding: '10px 16px', fontSize: 13, color: 'var(--warn)',
              }}>
                Two-factor sign-in is required for every admin. Turn it on below to unlock the rest of the panel.
              </div>
            )}
            {!mustEnrol && limited && (
              <div style={{
                marginBottom: 20, borderRadius: 12, border: '1px solid var(--soft)',
                background: 'var(--soft)', padding: '10px 16px', fontSize: 12.5, color: 'var(--ink)',
              }}>
                You're signed in as <strong style={{ color: 'var(--blue)' }}>{ROLE_NAMES[role] || role}</strong>
                {role === 'viewer' ? ' — you can view everything but not change it.' : role === 'support'
                  ? ' — you can work on applications, leads and document review; everything else is view-only.'
                  : ' — you can manage payments, pricing and promo codes; everything else is view-only.'}
              </div>
            )}
            {mustEnrol && !pathname.startsWith('/admin/security')
              ? <Navigate to="/admin/security" replace />
              : children}
          </div>
        </main>
      </div>

      {/* ── Password Change Modal ─────────────────────────────────── */}
      {pwModal && (
        <div
          onClick={() => setPwModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, background: 'rgba(8,12,36,.55)', backdropFilter: 'blur(4px)',
          }}
        >
          <div
            {...dialogProps}
            onClick={(e) => e.stopPropagation()}
            style={{
              borderRadius: 16, background: 'var(--panel)', border: '1px solid var(--line)',
              width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,.2)',
            }}
          >
            <div style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                Change password
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['admin-pw-current', 'current', 'Current password'],
                  ['admin-pw-new', 'new', 'New password'],
                  ['admin-pw-confirm', 'confirm', 'Confirm new password'],
                ].map(([id, field, label]) => (
                  <div key={id}>
                    <label htmlFor={id} style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {label}
                    </label>
                    <input
                      id={id} type="password" value={pwForm[field]}
                      onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                      placeholder={label}
                      style={{
                        width: '100%', height: 44, padding: '0 14px', borderRadius: 10,
                        background: 'var(--soft)', border: '1px solid var(--line)',
                        fontSize: 14, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
                        fontFamily: 'var(--font-body)',
                      }}
                    />
                  </div>
                ))}
                {pwError && <p style={{ margin: 0, fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>{pwError}</p>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button onClick={() => setPwModal(false)} style={btnStyle('ghost')}>Cancel</button>
                <button
                  onClick={handlePasswordChange}
                  disabled={pwSaving || !pwForm.current || !pwForm.new}
                  style={btnStyle('primary')}
                >
                  {pwSaving ? 'Saving…' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helper: profile dropdown menu item ──────────────────────────────── */
function ProfileMenuItem({ onClick, icon, label, border, danger }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '0 16px', minHeight: 42, border: 'none',
        borderTop: border ? '1px solid var(--line)' : 'none',
        background: hover ? (danger ? '#FFF0F0' : 'var(--soft)') : 'transparent',
        color: danger ? 'var(--red)' : 'var(--ink)',
        fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
        fontFamily: 'var(--font-body)',
      }}
    >
      {icon}{label}
    </button>
  );
}

/* ── Button style helper ─────────────────────────────────────────────── */
function btnStyle(variant) {
  const base = {
    flex: 1, height: 44, borderRadius: 10, fontSize: 13, fontWeight: 600,
    border: 'none', cursor: 'pointer', transition: 'opacity 150ms',
    fontFamily: 'var(--font-body)',
  };
  if (variant === 'primary') return { ...base, background: 'var(--blue)', color: '#fff' };
  return { ...base, background: 'var(--soft)', color: 'var(--muted)' };
}

/* ─── Exported layout helpers (used by tab components) ──────────────── */

/** Page header with eyebrow + title + optional right slot */
export function AdminHeader({ title, subtitle, right, eyebrow }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--line)' }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow || 'We Hive · Admin'}</div>
        <h1 style={{
          margin: 0, fontFamily: 'var(--font-heading)',
          fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em',
          lineHeight: 1.2, color: 'var(--ink)',
        }}>
          {title}
        </h1>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)', maxWidth: 560 }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/** White card panel — the landing/account `.card-surface` */
export function Panel({ children, className = '', style = {} }) {
  return (
    <div className={`card-surface ${className}`} style={{ padding: 20, ...style }}>
      {children}
    </div>
  );
}

/** Stat card — icon tile + label + large number + optional trend */
export function StatCard({ label, value, trend, trendUp, icon: Icon }) {
  return (
    <div className="card-surface" style={{ padding: 20 }}>
      {Icon && <span className="icon-tile"><Icon style={{ width: 20, height: 20 }} aria-hidden="true" /></span>}
      <div style={{ marginTop: Icon ? 16 : 0, fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>{label}</div>
      <div className="font-display tabular-nums" style={{ marginTop: 4, fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1 }}>
        {value ?? '—'}
      </div>
      {trend !== undefined && (
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: trendUp ? 'var(--ok)' : 'var(--red)' }}>
          {trendUp ? '↑' : '↓'} {trend}
        </div>
      )}
    </div>
  );
}

/**
 * Boarding-pass item row — matches Social Studio Create-tab card style
 *
 * Usage:
 *   <ItemRow
 *     avatar={<img .../>}
 *     title="John Doe"
 *     sub="john@example.com"
 *     right={<Pill variant="ok">Active</Pill>}
 *   />
 */
export function ItemRow({ avatar, title, sub, right, onClick, style = {} }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onClick && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '44px 1fr auto',
        gap: 12, padding: '11px 14px',
        border: '1px solid var(--line)', borderRadius: 12,
        background: hover ? 'var(--soft)' : 'var(--panel)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 120ms',
        alignItems: 'center',
        ...style,
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
        {avatar}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </div>
        {sub && <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

/**
 * Status pill badge
 * variant: 'ok' | 'red' | 'gold' | 'blue' | 'muted'
 */
export function Pill({ variant = 'muted', children }) {
  const map = {
    ok:    { bg: '#E6F6EE', color: 'var(--ok)' },
    red:   { bg: '#FDECEA', color: 'var(--red)' },
    gold:  { bg: '#FEF3DC', color: 'var(--warn)' },
    blue:  { bg: 'var(--soft)', color: 'var(--blue)' },
    muted: { bg: '#F0F1F5', color: 'var(--muted)' },
  };
  const { bg, color } = map[variant] || map.muted;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
      background: bg, color,
      fontFamily: 'var(--font-heading)',
    }}>
      {children}
    </span>
  );
}

/** Section label (uppercase eyebrow above a group of items) */
export function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
      textTransform: 'uppercase', color: 'var(--muted)',
      marginBottom: 8, fontFamily: 'var(--font-heading)',
    }}>
      {children}
    </div>
  );
}

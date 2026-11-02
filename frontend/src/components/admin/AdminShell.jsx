/**
 * AdminShell.jsx — WeHive Admin Panel (Social Studio Visual Language)
 *
 * DESIGN TOKENS applied (from Social Studio / we-hive design system):
 *   Fonts: Poppins (display/headings) + Figtree (body)
 *   --bg:#F4F6FC  --panel:#FFFFFF  --ink:#0B1240  --muted:#5A6283
 *   --line:#E1E6F5  --blue:#011CB5  --red:#E10600  --gold:#F2A900
 *   --soft:#EAEFFF  --ok:#0F8A4B  --warn:#B86A00
 *
 * Key changes vs. the original:
 *  ✅ Poppins + Figtree fonts (added to index.html or import in index.css)
 *  ✅ Deep navy sidebar (#0B1240) matching Social Studio dark rail
 *  ✅ Boarding-pass item rows with 44px icon column
 *  ✅ .pill badge pattern (ok/red/gold/blue/muted)
 *  ✅ Smooth CSS-transition collapse (248px ↔ 60px)
 *  ✅ localStorage persistence of collapsed state
 *  ✅ Flag stripe accent under logo
 *  ✅ AdminHeader, Panel, StatCard, Pill exports for tab components
 */

import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import { BRAND } from '../../data/mock';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, canWrite, canViewTab, ROLE_NAMES } from '../../lib/admin';
import {
  LayoutDashboard, Users as UsersIcon, FileStack, Globe, Plug, Download, UserCog,
  LogOut, ArrowLeft, Banknote, Megaphone, Settings, ClipboardList, Tag, Briefcase,
  Image as ImageIcon, Key, Building2, BookOpen, Database, FileText, Bot, Brain,
  Newspaper, ShieldCheck, Mail, Inbox, CreditCard, History, Activity, ScanSearch,
  Lock, BarChart3, ChevronLeft, ChevronRight, Pencil, Clock, Share2, CalendarCheck,
  Eye, Target, UserCheck, GitBranch, Radar, PenTool, Sparkles,
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
  { id: 'overview',          to: '/admin',                   label: 'Overview',          Icon: LayoutDashboard, group: 'Overview' },
  { id: 'monitoring',        to: '/admin/monitoring',        label: 'Monitoring',        Icon: BarChart3,       group: 'Overview' },
  { id: 'users',             to: '/admin/users',             label: 'Users',             Icon: UsersIcon,       group: 'Users & Applications' },
  { id: 'applications',      to: '/admin/applications',      label: 'Applications',      Icon: FileStack,       group: 'Users & Applications' },
  { id: 'review',            to: '/admin/review',            label: 'Doc Review',        Icon: ScanSearch,      group: 'Users & Applications' },
  { id: 'leads',             to: '/admin/leads',             label: 'Leads',             Icon: Inbox,           group: 'Users & Applications' },
  { id: 'countries',         to: '/admin/countries',         label: 'Countries',         Icon: Globe,           group: 'Content & Destinations' },
  { id: 'universities',      to: '/admin/universities',      label: 'Universities',      Icon: Building2,       group: 'Content & Destinations' },
  { id: 'programs',          to: '/admin/programs',          label: 'Programs',          Icon: BookOpen,        group: 'Content & Destinations' },
  { id: 'destinations',      to: '/admin/destinations',      label: 'Destinations',      Icon: ImageIcon,       group: 'Content & Destinations' },
  { id: 'events',            to: '/admin/events',            label: 'Hero Events',       Icon: Megaphone,       group: 'Content & Destinations' },
  { id: 'global-events',     to: '/admin/global-events',     label: 'Global Events',     Icon: Globe,           group: 'Content & Destinations' },
  { id: 'announcements',     to: '/admin/announcements',     label: 'Announcements',     Icon: Megaphone,       group: 'Content & Destinations' },
  { id: 'social-studio',    to: '/admin/social-studio',     label: 'Social Studio',     Icon: Sparkles,        group: 'Content & Destinations' },
  { id: 'hive-learning',     to: '/admin/hive-learning',     label: 'Hive Learning',     Icon: Brain,           group: 'Content & Destinations' },
  { id: 'moderation',        to: '/admin/moderation',        label: 'Moderation',        Icon: Newspaper,       group: 'Content & Destinations' },
  { id: 'payments',          to: '/admin/payments',          label: 'Payments',          Icon: CreditCard,      group: 'Commercial' },
  { id: 'pricing',           to: '/admin/pricing',           label: 'Pricing',           Icon: Banknote,        group: 'Commercial' },
  { id: 'promotions',        to: '/admin/promotions',        label: 'Promotions',        Icon: Tag,             group: 'Commercial' },
  { id: 'promocodes',        to: '/admin/promocodes',        label: 'Promo Codes',       Icon: Tag,             group: 'Commercial' },
  { id: 'requests',          to: '/admin/requests',          label: 'Requests',          Icon: ClipboardList,   group: 'Commercial' },
  { id: 'agents',            to: '/admin/agents',            label: 'Agents',            Icon: Briefcase,       group: 'Commercial' },
  { id: 'referrals',         to: '/admin/referrals',         label: 'Referrals',         Icon: Share2,          group: 'Commercial' },
  { id: 'exports',           to: '/admin/exports',           label: 'Exports',           Icon: Download,        group: 'Commercial' },
  { id: 'rag',               to: '/admin/rag',               label: 'RAG & Vectors',     Icon: Database,        group: 'AI & System' },
  { id: 'prompts',           to: '/admin/prompts',           label: 'Prompts',           Icon: FileText,        group: 'AI & System' },
  { id: 'agents-v2',         to: '/admin/agents-v2',         label: 'Agents V2',         Icon: Bot,             group: 'AI & System' },
  { id: 'agentic',           to: '/admin/agentic',           label: 'Agentic AI',        Icon: Bot,             group: 'AI & System' },
  { id: 'observability',     to: '/admin/observability',     label: 'Observability',     Icon: Eye,             group: 'AI & System' },
  { id: 'rag-eval',          to: '/admin/rag-eval',          label: 'RAG Eval',          Icon: Target,          group: 'AI & System' },
  { id: 'student-memory',    to: '/admin/student-memory',    label: 'Student Memory',    Icon: UserCheck,       group: 'AI & System' },
  { id: 'graph-rag',         to: '/admin/graph-rag',         label: 'Graph RAG',         Icon: GitBranch,       group: 'AI & System' },
  { id: 'scraping',          to: '/admin/scraping',          label: 'Scraping',          Icon: Radar,           group: 'AI & System' },
  { id: 'content-pipeline',  to: '/admin/content-pipeline',  label: 'Content Pipeline',  Icon: PenTool,         group: 'AI & System' },
  { id: 'slot-monitor',      to: '/admin/slot-monitor',      label: 'Slot Monitor',      Icon: Clock,           group: 'AI & System' },
  { id: 'visa-scheduling',   to: '/admin/visa-scheduling',   label: 'Visa Scheduling',   Icon: CalendarCheck,   group: 'AI & System' },
  { id: 'newsletter',        to: '/admin/newsletter',        label: 'Newsletter',        Icon: Mail,            group: 'AI & System' },
  { id: 'health',            to: '/admin/health',            label: 'System Health',     Icon: Activity,        group: 'AI & System' },
  { id: 'integrations',      to: '/admin/integrations',      label: 'Integrations',      Icon: Plug,            group: 'AI & System', superOnly: true },
  { id: 'staff',             to: '/admin/staff',             label: 'Staff',             Icon: UserCog,         group: 'Admin' },
  { id: 'admins',            to: '/admin/admins',            label: 'Admins',            Icon: ShieldCheck,     group: 'Admin', superOnly: true },
  { id: 'audit',             to: '/admin/audit',             label: 'Audit Log',         Icon: History,         group: 'Admin' },
  { id: 'security',          to: '/admin/security',          label: 'My Security',       Icon: Lock,            group: 'Admin' },
  { id: 'settings',          to: '/admin/settings',          label: 'Settings',          Icon: Settings,        group: 'Admin', superOnly: true },
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
      className="h-screen overflow-hidden"
      style={{
        '--font-display': "'Poppins', system-ui, sans-serif",
        '--font-body':    "'Figtree', system-ui, sans-serif",
        '--bg':     '#F4F6FC',
        '--panel':  '#FFFFFF',
        '--ink':    '#0B1240',
        '--muted':  '#5A6283',
        '--line':   '#E1E6F5',
        '--blue':   '#011CB5',
        '--red':    '#E10600',
        '--gold':   '#F2A900',
        '--soft':   '#EAEFFF',
        '--ok':     '#0F8A4B',
        '--warn':   '#B86A00',
        /* sidebar deep-navy surface */
        '--rail':   '#080C24',
        '--rail-l': '#111735',
        '--rail-t': '#1E2552',
        '--rail-a': '#4B5EAA',
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
          style={{ background: 'var(--rail)', borderRight: '1px solid var(--rail-t)' }}
        >
          {/* Logo row */}
          <div
            className="flex items-center shrink-0 h-14"
            style={{
              borderBottom: '1px solid var(--rail-t)',
              padding: collapsed ? '0' : '0 14px',
              justifyContent: collapsed ? 'center' : 'space-between',
            }}
          >
            {!collapsed && (
              <Link to="/" className="inline-flex items-center gap-2 min-w-0">
                <img src={BRAND.logo} alt="We Hive" className="h-7 w-auto shrink-0" />
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
                              height: 40, borderRadius: 10,
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
                            gridTemplateColumns: '28px 1fr auto',
                            alignItems: 'center', gap: 10,
                            padding: '0 10px', minHeight: 38, borderRadius: 10,
                            background: active ? 'var(--blue)' : 'transparent',
                            color: active ? '#fff' : 'var(--rail-a)',
                            fontSize: 13, fontWeight: 600, textDecoration: 'none',
                            transition: 'background 150ms',
                            fontFamily: 'var(--font-body)',
                          }}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--rail-t)'; }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
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
          <div style={{ borderTop: '1px solid var(--rail-t)', padding: collapsed ? 8 : 12, flexShrink: 0 }}>
            {collapsed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  title={user?.email}
                  style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--rail-t)', background: 'none', cursor: 'pointer', padding: 0 }}
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
                    <span style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid var(--rail-t)' }}>
                      <img src={avatarUrl({ seed: user?.email || user?.id, gender: 'hero' })} alt="admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#EEF1FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                    fontSize: 12, fontWeight: 600, border: '1px solid var(--rail-t)',
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
    fontFamily: "'Figtree', system-ui, sans-serif",
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
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--blue)', marginBottom: 4, fontFamily: "'Poppins', system-ui, sans-serif",
        }}>
          {eyebrow || 'We Hive · Admin'}
        </div>
        <h1 style={{
          margin: 0, fontFamily: "'Poppins', system-ui, sans-serif",
          fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em',
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

/** White card panel */
export function Panel({ children, className = '', style = {} }) {
  return (
    <div
      className={`card-lift ${className}`}
      style={{
        background: 'var(--panel)', border: '1px solid var(--line)',
        borderRadius: 14, padding: '16px 20px',
        boxShadow: '0 1px 4px rgba(11,18,64,.06)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Stat card — large number + label + optional trend */
export function StatCard({ label, value, trend, trendUp, icon: Icon, accent }) {
  return (
    <div style={{
      background: accent ? 'var(--blue)' : 'var(--panel)',
      border: `1px solid ${accent ? 'transparent' : 'var(--line)'}`,
      borderRadius: 14, padding: '18px 20px',
      boxShadow: '0 1px 4px rgba(11,18,64,.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: accent ? 'rgba(255,255,255,.6)' : 'var(--muted)',
          fontFamily: "'Poppins', system-ui, sans-serif",
        }}>
          {label}
        </span>
        {Icon && (
          <span style={{
            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: accent ? 'rgba(255,255,255,.12)' : 'var(--soft)',
          }}>
            <Icon style={{ width: 15, height: 15, color: accent ? '#fff' : 'var(--blue)' }} />
          </span>
        )}
      </div>
      <div style={{
        fontSize: 30, fontWeight: 800, color: accent ? '#fff' : 'var(--ink)', lineHeight: 1,
        fontFamily: "'Poppins', system-ui, sans-serif",
      }}>
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
      fontFamily: "'Poppins', system-ui, sans-serif",
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
      marginBottom: 8, fontFamily: "'Poppins', system-ui, sans-serif",
    }}>
      {children}
    </div>
  );
}

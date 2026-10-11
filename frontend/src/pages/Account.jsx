import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { User as UserIcon, FileText, Compass, Settings, Loader2, ChevronRight, Check, Pencil, Save, X, ScanLine, Sparkles, Share2, Copy, Users, Gift, Bot, ClipboardList, Clock, CheckCircle, XCircle, Send, Briefcase, GraduationCap } from 'lucide-react';
import { avatarUrl, HERO_PRESETS } from '../lib/avatars';
import { statusColor } from '../lib/utils';
import ScansTab from '../components/account/ScansTab';
import PromoBanner from '../components/PromoBanner';
import AICoverLetterModal from '../components/ai/AICoverLetterModal';
import AIItineraryModal from '../components/ai/AIItineraryModal';
import AIRiskAnalysisModal from '../components/ai/AIRiskAnalysisModal';
import OpenMarketAI from '../components/OpenMarketAI';
import PremiumGate from '../components/PremiumGate';
import AIMarketplaceSettings from '../components/ai/AIMarketplaceSettings';
import UniversityAppsTab from '../components/account/UniversityAppsTab';
import AIAgentsTab from '../components/account/AIAgentsTab';
import AIInsightsPanel from '../components/AIInsightsPanel';

const TABS = [
  { id: 'profile', label: 'Profile', Icon: UserIcon },
  { id: 'applications', label: 'Applications', Icon: FileText },
  { id: 'university-apps', label: 'University Apps', Icon: GraduationCap },
  { id: 'referrals', label: 'Referrals', Icon: Users },
  { id: 'aitools', label: 'AI Tools', Icon: Sparkles },
  { id: 'ai-agents', label: 'AI Agents', Icon: Bot },
  { id: 'scans', label: 'My scans', Icon: ScanLine },
  { id: 'plans', label: 'Saved plans', Icon: Compass },
  { id: 'ai-marketplace', label: 'AI Marketplace', Icon: Bot },
  { id: 'requests', label: 'My Requests', Icon: ClipboardList },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

function Tabs({ value, onChange }) {
  const navRef = useRef(null);
  // On narrow screens the tabs are a horizontal scroll row; keep the active one in view.
  useEffect(() => {
    const el = navRef.current?.querySelector('[aria-current="page"]');
    const nav = navRef.current;
    if (!el || !nav || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = el.offsetLeft - nav.offsetLeft - 16;
  }, [value]);
  return (
    <nav ref={navRef} aria-label="Account sections" className="-mx-4 px-4 sm:mx-0 sm:px-0 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible snap-x scroll-px-4 [scrollbar-width:none] pb-1 lg:pb-0 lg:sticky lg:top-24">
      {TABS.map((t) => {
        const Icon = t.Icon;
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-current={active ? 'page' : undefined}
            className={`shrink-0 snap-start lg:w-full flex items-center gap-2.5 lg:gap-3 px-3.5 lg:px-4 min-h-[44px] rounded-xl text-[14px] font-semibold whitespace-nowrap transition-colors duration-200 ${
              active
                ? 'bg-[hsl(var(--blue-700))] text-white shadow-sm'
                : 'text-muted-foreground bg-white lg:bg-transparent border border-border lg:border-transparent hover:bg-[hsl(var(--blue-50))] hover:text-[hsl(var(--blue-900))]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

function ProfileTab({ user, token, onUpdated }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [gender, setGender] = useState(user.gender || '');

  useEffect(() => {
    setName(user.name || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setGender(user.gender || '');
  }, [user]);

  const onSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API}/users/me`,
        { name: name.trim(), email: email.trim() || null, phone: phone.trim() || null, gender: gender || null },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast({ title: 'Profile saved' });
      setEditing(false);
      onUpdated?.();
    } catch (e) {
      toast({
        title: 'Could not save',
        description: e?.response?.data?.detail || 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => {
    setName(user.name || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setGender(user.gender || '');
    setEditing(false);
  };

  return (
    <div data-testid="profile-tab">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-display font-bold text-[24px] sm:text-[28px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
          Profile
        </h2>
        {!editing ? (
          <Button
            data-testid="profile-edit-btn"
            variant="outline"
            onClick={() => setEditing(true)}
            className="rounded-xl h-11 px-5 font-bold border-slate-300 hover:border-[hsl(var(--blue-700))]/30"
          >
            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button data-testid="profile-cancel-btn" variant="outline" disabled={saving} onClick={onCancel} className="rounded-xl h-11 px-5 font-bold border-slate-300">
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
            <Button data-testid="profile-save-btn" disabled={saving} onClick={onSave} className="rounded-xl h-11 px-5 font-bold btn-accent text-white">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                <span className="inline-flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Save</span>
              )}
            </Button>
          </div>
        )}
      </div>

      {!editing ? (
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {[
            { id: 'name',     label: 'Name',             value: user.name || 'Not set' },
            { id: 'email',    label: 'Email',            value: user.email || 'Not set' },
            { id: 'phone',    label: 'Mobile',           value: user.phone || 'Not set' },
            { id: 'gender',   label: 'Gender',           value: (user.gender || 'Not set').toString() },
            { id: 'plan',     label: 'Plan',             value: user.is_premium ? 'Premium' : 'Free' },
            { id: 'verified', label: 'Verified channel', value: user.email_verified ? 'Email' : user.phone_verified ? 'Mobile (OTP)' : 'None' },
          ].map((i) => (
            <div key={i.id} className="rounded-2xl bg-white border border-border p-5" data-testid={`profile-row-${i.id}`}>
              <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">
                {i.label}
              </div>
              <div className="mt-1 text-[15px] font-bold text-[hsl(var(--blue-900))]">{i.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <EditField label="Name" testid="profile-name-input" value={name} onChange={setName} placeholder="Your full name" />
          <EditField label="Email" testid="profile-email-input" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <EditField label="Mobile" testid="profile-phone-input" type="tel" value={phone} onChange={setPhone} placeholder="+91 9XXXX XXXXX" />
          <EditSelect label="Gender" testid="profile-gender-input" value={gender} onChange={setGender}>
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </EditSelect>
        </div>
      )}
      {!editing && (
        <div className="mt-8 border-t border-border pt-8">
          <AIInsightsPanel />
        </div>
      )}
    </div>
  );
}

function EditField({ label, value, onChange, placeholder, type = 'text', testid }) {
  return (
    <label className="block rounded-2xl bg-white border border-border px-5 py-3 hover:border-[hsl(var(--blue-700))]/25 focus-within:border-[hsl(var(--blue-700))]/40 transition">
      <span className="block text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">{label}</span>
      <input
        data-testid={testid}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-0.5 w-full bg-transparent border-0 outline-none focus:outline-none placeholder:text-[hsl(var(--blue-900))]/35 text-[15px] font-bold text-[hsl(var(--blue-900))]"
      />
    </label>
  );
}

function EditSelect({ label, value, onChange, children, testid }) {
  return (
    <label className="block rounded-2xl bg-white border border-border px-5 py-3 hover:border-[hsl(var(--blue-700))]/25 focus-within:border-[hsl(var(--blue-700))]/40 transition">
      <span className="block text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">{label}</span>
      <select
        data-testid={testid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full bg-transparent border-0 outline-none focus:outline-none text-[15px] font-bold text-[hsl(var(--blue-900))]"
      >
        {children}
      </select>
    </label>
  );
}

function ApplicationsTab({ token }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    axios
      .get(`${API}/users/me/applications`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setItems(r.data))
      .catch(() => setItems([]));
  }, [token]);
  if (!items) return <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blue-700))]" />;
  if (items.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        sub="Start a visa application from any country page \u2014 it will show up here."
        cta={{ to: '/', label: 'Browse countries' }}
      />
    );
  }
  return (
    <div className="space-y-3">
      {items.map((a) => (
        <Link
          key={a.id}
          to={`/account/applications/${a.id}`}
          className="block rounded-2xl bg-white border border-border hover:border-[hsl(var(--blue-700))]/20 p-5 transition"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[15px] font-bold text-[hsl(var(--blue-900))]">
                  {a.country_id.toUpperCase()} · {a.visa_type}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-bold capitalize ${statusColor(a.status)}`}>
                  {(a.status || 'draft').replace('_', ' ')}
                </span>
              </div>
              <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                #{a.id?.slice(0, 8).toUpperCase()} · created {new Date(a.created_at).toLocaleDateString()}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[hsl(var(--blue-900))]/40 shrink-0" />
          </div>
        </Link>
      ))}
    </div>
  );
}

function PlansTab({ token }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    axios
      .get(`${API}/users/me/saved-plans`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setItems(r.data))
      .catch(() => setItems([]));
  }, [token]);
  if (!items) return <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blue-700))]" />;
  if (items.length === 0) {
    return (
      <EmptyState
        title="No saved holiday plans"
        sub="Open the holiday planner for any country and tap Save plan."
        cta={{ to: '/holiday/jp', label: 'Plan a Japan trip' }}
      />
    );
  }
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {items.map((p) => (
        <Link key={p.id} to={`/holiday/${p.country_id}`} className="rounded-2xl bg-white border border-border p-5 hover:border-[hsl(var(--blue-700))]/20">
          <div className="text-[15px] font-bold text-[hsl(var(--blue-900))]">{p.country_id.toUpperCase()}</div>
          <div className="mt-1 text-[12.5px] text-muted-foreground">{p.duration_days} days</div>
        </Link>
      ))}
    </div>
  );
}

function AIToolsTab({ token, isPremium }) {
  const [apps, setApps] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [premiumGate, setPremiumGate] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    axios
      .get(`${API}/users/me/applications`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setApps(r.data || []))
      .catch(() => setApps([]));
  }, [token]);

  const openTool = (app) => {
    if (!app || app.status === 'draft') {
      toast({ title: 'Submit your application first', description: 'AI tools are available after your application is submitted.' });
      return;
    }
    setSelectedApp(app);
    setActiveModal('cover-letter');
  };

  const handleToolClick = (toolId) => {
    if (!isPremium) {
      setPremiumGate(toolId);
      return;
    }
    if (!selectedApp || selectedApp.status === 'draft') {
      toast({ title: 'Select an application first', description: 'Tap an application above to use this tool.' });
      return;
    }
    setActiveModal(toolId);
  };

  if (!apps) return <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blue-700))]" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-[24px] sm:text-[28px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
          AI Tools
        </h2>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Select an application to use an AI tool. Tools work best after submission.
        </p>
      </div>

      {apps.length === 0 ? (
        <EmptyState
          title="No applications yet"
          sub="Start a visa application from any country page — then come back to use AI tools."
          cta={{ to: '/', label: 'Browse countries' }}
        />
      ) : (
        <div className="space-y-3">
          <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">
            Your applications — tap one to use AI tools
          </div>
          {apps.map((a) => (
            <button
              key={a.id}
              onClick={() => openTool(a)}
              className="w-full flex items-center justify-between gap-4 rounded-2xl bg-white border border-border hover:border-[hsl(var(--blue-700))]/20 p-5 text-left transition"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[15px] font-bold text-[hsl(var(--blue-900))]">
                    {a.country_id?.toUpperCase()} · {a.visa_type}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-bold capitalize ${statusColor(a.status)}`}>
                    {(a.status || 'draft').replace('_', ' ')}
                  </span>
                </div>
                <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                  #{a.id?.slice(0, 8).toUpperCase()}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[hsl(var(--blue-900))]/40 shrink-0" />
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { id: 'cover-letter', label: 'Cover Letter / SOP', Icon: FileText, desc: 'Write a professional cover letter' },
          { id: 'itinerary', label: 'AI Itinerary', Icon: Compass, desc: 'Plan your day-by-day trip' },
          { id: 'risk', label: 'Risk Analyser', Icon: Check, desc: 'Check rejection risk before submitting' },
        ].map(({ id, label, Icon, desc }) => (
          <button
            key={id}
            onClick={() => handleToolClick(id)}
            className="rounded-2xl border border-border bg-white p-4 text-left shadow-sm hover:border-[hsl(var(--blue-700))]/30 hover:shadow-md transition duration-200"
          >
            <div className="h-10 w-10 rounded-xl inline-flex items-center justify-center mb-3 bg-[hsl(var(--blue-50))]">
              <Icon className="w-5 h-5 text-[hsl(var(--blue-700))]" />
            </div>
            <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{label}</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">{desc}</div>
          </button>
        ))}
      </div>

      <PremiumGate
        open={!!premiumGate}
        onClose={() => setPremiumGate(null)}
        feature={premiumGate === 'cover-letter' ? 'Cover Letter / SOP Writer' : premiumGate === 'itinerary' ? 'AI Itinerary Planner' : 'Risk Analyser'}
      />
      <AICoverLetterModal
        open={activeModal === 'cover-letter'}
        onClose={() => setActiveModal(null)}
        applicationId={selectedApp?.id}
        country_id={selectedApp?.country_id}
        visa_type={selectedApp?.visa_type}
        formData={selectedApp?.form_data}
      />
      <AIItineraryModal
        open={activeModal === 'itinerary'}
        onClose={() => setActiveModal(null)}
        applicationId={selectedApp?.id}
        country_id={selectedApp?.country_id}
      />
      <AIRiskAnalysisModal
        open={activeModal === 'risk'}
        onClose={() => setActiveModal(null)}
        applicationId={selectedApp?.id}
      />
    </div>
  );
}

function SettingsTab({ user, token, onUpdated }) {
  const { toast } = useToast();
  const [name, setName] = useState(user.name || '');
  const [gender, setGender] = useState(user.gender || 'hero');
  const [seed, setSeed] = useState(user.avatar_seed || HERO_PRESETS[0].seed);
  const [style, setStyle] = useState(user.avatar_style || HERO_PRESETS[0].style);
  const [busy, setBusy] = useState(false);

  const onSave = async () => {
    setBusy(true);
    try {
      await axios.put(
        `${API}/users/me`,
        // Backend accepts gender ∈ male|female|other only; 'hero' is a local avatar-style choice.
        {
          name,
          ...(['male', 'female', 'other'].includes(gender) ? { gender } : {}),
          avatar_seed: seed,
          avatar_style: style,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: 'Saved', description: 'Profile updated.' });
      onUpdated?.();
    } catch {
      toast({ title: 'Could not save' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 className="font-display font-bold text-[24px] sm:text-[28px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
        Profile & avatar
      </h2>

      {/* Avatar preview + gender */}
      <div className="mt-6 flex flex-col sm:flex-row gap-6 items-start">
        <div className="flex flex-col items-center gap-2">
          <span className="h-28 w-28 rounded-2xl overflow-hidden bg-[hsl(var(--blue-50))] ring-1 ring-border shadow-sm">
            <img loading="lazy" decoding="async" src={avatarUrl({ seed, gender, style })} alt="avatar preview" className="h-full w-full object-cover" />
          </span>
          <span className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">Preview</span>
        </div>
        <div className="flex-1 w-full">
          <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
            Choose your hero style
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {HERO_PRESETS.map((p) => {
              const active = seed === p.seed;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSeed(p.seed);
                    setStyle(p.style);
                  }}
                  className={`relative rounded-2xl bg-white border-2 p-1.5 transition ${
                    active ? 'border-[hsl(var(--blue-700))] shadow-md' : 'border-border hover:border-[hsl(var(--blue-700))]/30'
                  }`}
                >
                  <span className="block aspect-square rounded-xl overflow-hidden bg-[hsl(var(--blue-50))]">
                    <img loading="lazy" decoding="async" src={avatarUrl({ seed: p.seed, style: p.style })} alt={p.label} className="h-full w-full object-cover" />
                  </span>
                  <span className="block text-[12px] font-bold mt-1 text-muted-foreground truncate">
                    {p.label}
                  </span>
                  {active && (
                    <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-[hsl(var(--blue-700))] text-white inline-flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
              Gender (used to tune avatar)
            </div>
            <div className="inline-flex p-1 rounded-full bg-[hsl(var(--soft-bg))] border border-border">
              {[
                { id: 'male', label: 'Male' },
                { id: 'female', label: 'Female' },
                { id: 'other', label: 'Other' },
                { id: 'hero', label: 'Hero (default)' },
              ].map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGender(g.id)}
                  className={`rounded-full px-3.5 min-h-[36px] text-[13px] font-semibold transition-colors ${
                    gender === g.id
                      ? 'bg-white shadow-sm text-[hsl(var(--blue-700))]'
                      : 'text-muted-foreground hover:text-[hsl(var(--blue-900))]'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 max-w-md">
        <label className="block text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
          Display name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-12 rounded-xl border border-slate-300 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[15px] text-[hsl(var(--blue-900))] transition"
        />
        <Button onClick={onSave} disabled={busy} className="mt-4 rounded-xl btn-accent text-white h-11 px-5 font-bold">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
        </Button>
      </div>

      <div className="mt-10 pt-8 border-t border-border">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-[hsl(var(--blue-700))]" />
          <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-700))]">Open Market AI</span>
        </div>
        <OpenMarketAI />
      </div>
    </div>
  );
}

function ReferralsTab({ token }) {
  const { toast } = useToast();
  const [code, setCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    axios.get(`${API}/referrals/my-code`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        let referralCode = r.data.code;
        if (!referralCode) {
          try {
            const createRes = await axios.post(`${API}/referrals/code`, {}, { headers: { Authorization: `Bearer ${token}` } });
            referralCode = createRes.data.code;
          } catch {}
        }
        setCode(referralCode);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    axios.get(`${API}/referrals/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setStats(r.data))
      .catch(() => {});
  }, [token]);

  const handleShare = async (medium) => {
    if (!code) return;
    const url = `${window.location.origin}/signup?ref=${code}`;
    const text = `Apply for your visa with WeHive — use my referral code ${code} to get ₹500 off your first application! ${url}`;
    if (medium === 'copy') {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Referral code copied!' });
    } else if (medium === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else if (medium === 'email') {
      window.open(`mailto:?subject=WeHive referral&body=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-[24px] sm:text-[28px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
          Referral Program
        </h2>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Share your code — earn ₹500 credit for every friend who applies.
        </p>
      </div>

      <div className="rounded-2xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-700))]/15 p-6 sm:p-8 text-[hsl(var(--blue-900))]">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-5 h-5 text-[hsl(var(--blue-700))]" />
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--blue-700))]">Your referral code</span>
        </div>
        <div className="h-14 flex items-center mb-6">
          {loading ? (
            <Loader2 className="w-7 h-7 animate-spin text-[hsl(var(--blue-700))]" />
          ) : (
            <div className="text-[32px] sm:text-4xl font-display font-bold tracking-[0.08em] break-all">{code || '---------'}</div>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleShare('copy')}
            disabled={loading || !code}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-300 hover:border-[hsl(var(--blue-700))]/40 hover:text-[hsl(var(--blue-700))] disabled:opacity-50 disabled:cursor-not-allowed h-11 px-5 text-[14px] font-semibold transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy code'}
          </button>
          <button
            onClick={() => handleShare('whatsapp')}
            disabled={loading || !code}
            className="inline-flex items-center gap-2 rounded-xl btn-accent text-white disabled:opacity-50 disabled:cursor-not-allowed h-11 px-5 text-[14px] font-semibold transition-colors"
          >
            Share on WhatsApp
          </button>
          <button
            onClick={() => handleShare('email')}
            disabled={loading || !code}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-300 hover:border-[hsl(var(--blue-700))]/40 hover:text-[hsl(var(--blue-700))] disabled:opacity-50 disabled:cursor-not-allowed h-11 px-5 text-[14px] font-semibold transition-colors"
          >
            Share via Email
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: 'Total referrals', value: stats.total_referrals || 0 },
            { label: 'Credits earned', value: `₹${stats.total_earned || 0}` },
            { label: 'Pending', value: `₹${stats.pending_reward || 0}` },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white border border-border shadow-sm p-4 sm:p-5">
              <div className="text-[12px] font-medium text-muted-foreground">{s.label}</div>
              <div className="mt-1 text-[22px] sm:text-[24px] font-display font-bold tabular-nums text-[hsl(var(--blue-900))]">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-black/15 p-6 text-center">
        <div className="text-[14px] text-muted-foreground">
          <strong>How it works:</strong> Share your code with friends. When they apply and pay, you earn ₹500 credit. Credits can be redeemed on your next visa application.
        </div>
      </div>
    </div>
  );
}

const REQUEST_TYPE_LABELS = {
  profile_update: 'Profile Update',
  info_request: 'Information Request',
  document_request: 'Document Request',
};

const STATUS_BADGE = {
  pending: { label: 'Pending', Icon: Clock, cls: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Approved', Icon: CheckCircle, cls: 'bg-green-50 text-green-700' },
  rejected: { label: 'Rejected', Icon: XCircle, cls: 'bg-red-50 text-red-700' },
};

function RequestsTab({ user, token }) {
  const { toast } = useToast();
  const [requests, setRequests] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    request_type: 'profile_update',
    name: '',
    email: '',
    phone: '',
    gender: '',
    message: '',
  });

  const load = () => {
    axios
      .get(`${API}/users/me/profile-requests`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setRequests(r.data))
      .catch(() => setRequests([]));
  };

  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async () => {
    if (form.request_type === 'profile_update' && !form.name && !form.email && !form.phone && !form.gender) {
      toast({ title: 'Fill in at least one field to request a change.' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        request_type: form.request_type,
        message: form.message || null,
        ...(form.request_type === 'profile_update' ? {
          name: form.name || null,
          email: form.email || null,
          phone: form.phone || null,
          gender: form.gender || null,
        } : {}),
      };
      await axios.post(`${API}/users/me/profile-requests`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: 'Request submitted', description: 'An admin will review it shortly.' });
      setShowForm(false);
      setForm({ request_type: 'profile_update', name: '', email: '', phone: '', gender: '', message: '' });
      load();
    } catch (e) {
      toast({ title: 'Could not submit', description: e?.response?.data?.detail || 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-[24px] sm:text-[28px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
            My Requests
          </h2>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Submit a request to update your profile or ask for information. Admins review and approve each request.
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="rounded-xl btn-primary text-white h-11 px-5 font-semibold text-[14px]"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" /> New Request
          </Button>
        )}
      </div>

      {showForm && (
        <div className="rounded-2xl bg-white border border-[hsl(var(--blue-700))]/20 p-6 space-y-4">
          <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">New Request</div>

          <div>
            <label htmlFor="account-request-type" className="block text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground mb-1.5">
              Request type
            </label>
            <select id="account-request-type"
              value={form.request_type}
              onChange={(e) => setForm((f) => ({ ...f, request_type: e.target.value }))}
              className="w-full h-11 rounded-xl border border-slate-300 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px] font-bold text-[hsl(var(--blue-900))] bg-white"
            >
              <option value="profile_update">Profile Update</option>
              <option value="info_request">Information Request</option>
              <option value="document_request">Document Request</option>
            </select>
          </div>

          {form.request_type === 'profile_update' && (
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { key: 'name', label: 'New Name', placeholder: user.name || 'Your full name' },
                { key: 'email', label: 'New Email', placeholder: user.email || 'you@example.com', type: 'email' },
                { key: 'phone', label: 'New Phone', placeholder: user.phone || '+91 9XXXX XXXXX', type: 'tel' },
              ].map(({ key, label, placeholder, type = 'text' }) => (
                <div key={key}>
                  <label htmlFor={`account-${key}`} className="block text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground mb-1.5">
                    {label}
                  </label>
                  <input
                    id={`account-${key}`}
                    type={type}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full h-11 rounded-xl border border-slate-300 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px] font-bold text-[hsl(var(--blue-900))] placeholder:font-normal placeholder:text-[hsl(var(--blue-900))]/35"
                  />
                </div>
              ))}
              <div>
                <label htmlFor="account-gender" className="block text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground mb-1.5">
                  Gender
                </label>
                <select id="account-gender"
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                  className="w-full h-11 rounded-xl border border-slate-300 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px] font-bold text-[hsl(var(--blue-900))] bg-white"
                >
                  <option value="">No change</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="account-message-to-admin-optional" className="block text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground mb-1.5">
              Message to admin (optional)
            </label>
            <textarea id="account-message-to-admin-optional"
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Describe what you need or why you're making this request…"
              rows={3}
              className="w-full rounded-xl border border-slate-300 focus:border-[hsl(var(--blue-700))] outline-none px-4 py-3 text-[14px] text-[hsl(var(--blue-900))] resize-none placeholder:text-[hsl(var(--blue-900))]/35"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={submitting}
              className="rounded-xl h-11 px-5 font-bold border-slate-300"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={submitting}
              className="rounded-xl h-11 px-5 font-bold btn-accent text-white"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1" /> Submit</>}
            </Button>
          </div>
        </div>
      )}

      {!requests && <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blue-700))]" />}

      {requests && requests.length === 0 && !showForm && (
        <div className="rounded-2xl bg-white border border-dashed border-black/15 p-10 text-center">
          <ClipboardList className="w-8 h-8 text-[hsl(var(--blue-900))]/25 mx-auto mb-3" />
          <div className="font-display font-bold text-[18px] text-[hsl(var(--blue-900))]">No requests yet</div>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Submit a request above and an admin will review it for you.
          </p>
        </div>
      )}

      {requests && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((r) => {
            const badge = STATUS_BADGE[r.status] || STATUS_BADGE.pending;
            const BadgeIcon = badge.Icon;
            return (
              <div key={r.id} className="rounded-2xl bg-white border border-border p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-bold text-[hsl(var(--blue-900))]">
                        {REQUEST_TYPE_LABELS[r.request_type] || r.request_type}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-bold ${badge.cls}`}>
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      Submitted {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {r.request_type === 'profile_update' && r.requested_fields && Object.keys(r.requested_fields).length > 0 && (
                  <div className="mt-3 grid sm:grid-cols-2 gap-2">
                    {Object.entries(r.requested_fields).map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-[hsl(var(--soft-bg))] px-4 py-2">
                        <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">{k}</div>
                        <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">{v}</div>
                      </div>
                    ))}
                  </div>
                )}

                {r.message && (
                  <div className="mt-3 text-[13px] text-muted-foreground italic">"{r.message}"</div>
                )}

                {r.admin_note && (
                  <div className={`mt-3 rounded-xl px-4 py-3 text-[13px] font-medium ${r.status === 'approved' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    <span className="font-bold">Admin note: </span>{r.admin_note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, sub, cta }) {
  return (
    <div className="rounded-2xl bg-white border border-dashed border-black/15 p-10 text-center">
      <div className="font-display font-bold text-[20px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">{title}</div>
      <p className="mt-1 text-[14px] text-muted-foreground">{sub}</p>
      {cta && (
        <Link to={cta.to} className="mt-5 inline-flex items-center gap-1 rounded-xl btn-primary text-white h-11 px-5 font-semibold text-[14px]">
          {cta.label} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

export default function Account() {
  const { user, token, isAuthed, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'profile';

  useEffect(() => {
    if (!loading && !isAuthed) navigate('/login', { replace: true });
  }, [loading, isAuthed, navigate]);

  if (!user) {
    return (
      <div className="bg-white">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-white">
      <Navbar />
      <main data-testid="account-dashboard" className="pt-24 sm:pt-28 pb-16 bg-[hsl(var(--soft-bg))] min-h-[80vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-4 lg:gap-8">
          <div className="lg:col-span-12 min-w-0">
            <PromoBanner className="mb-2" />
          </div>
          <aside className="lg:col-span-3 min-w-0">
            <div className="rounded-2xl bg-white border border-border shadow-sm p-4 lg:p-5 mb-3 lg:mb-4">
              <div className="flex items-center gap-3">
                <span className="h-12 w-12 rounded-full overflow-hidden bg-[hsl(var(--blue-50))] ring-1 ring-black/5">
                  <img loading="lazy" decoding="async"
                    src={avatarUrl({
                      seed: user.avatar_seed || user.email || user.phone || user.id,
                      gender: user.gender || 'hero',
                      style: user.avatar_style,
                    })}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                </span>
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-[hsl(var(--blue-900))] truncate">
                    {user.name || 'Welcome'}
                  </div>
                  <div className="text-[12px] text-muted-foreground truncate">
                    {user.email || user.phone}
                  </div>
                </div>
              </div>
            </div>
            <Tabs value={tab} onChange={(t) => setParams({ tab: t })} />
            <Link to="/agent" className="mt-3 hidden lg:flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-[hsl(var(--blue-700))]/30 hover:bg-[hsl(var(--blue-50))] transition group">
              <Briefcase className="w-4 h-4 text-[hsl(var(--blue-700))]" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">Agent Portal</div>
                <div className="text-[12px] text-muted-foreground">Manage students & commissions</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--blue-900))]/30 group-hover:text-[hsl(var(--blue-700))]" />
            </Link>
          </aside>
          <section className="lg:col-span-9 min-w-0">
            <div className="rounded-2xl bg-white border border-border shadow-sm p-5 sm:p-8 min-h-[420px]">
              {tab === 'profile' && <ProfileTab user={user} token={token} onUpdated={refreshUser} />}
              {tab === 'applications' && <ApplicationsTab token={token} />}
              {tab === 'university-apps' && <UniversityAppsTab token={token} />}
              {tab === 'referrals' && <ReferralsTab token={token} />}
              {tab === 'aitools' && <AIToolsTab token={token} isPremium={user?.is_premium} />}
              {tab === 'scans' && <ScansTab user={user} token={token} />}
              {tab === 'plans' && <PlansTab token={token} />}
              {tab === 'ai-agents' && <AIAgentsTab />}
              {tab === 'ai-marketplace' && <AIMarketplaceSettings />}
              {tab === 'requests' && <RequestsTab user={user} token={token} />}
              {tab === 'settings' && <SettingsTab user={user} token={token} onUpdated={refreshUser} />}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

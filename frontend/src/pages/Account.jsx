import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { User as UserIcon, FileText, Compass, Settings, Loader2, ChevronRight, Check, Pencil, Save, X, ScanLine } from 'lucide-react';
import { avatarUrl, HERO_PRESETS } from '../lib/avatars';
import ScansTab from '../components/account/ScansTab';

const TABS = [
  { id: 'profile', label: 'Profile', Icon: UserIcon },
  { id: 'applications', label: 'Applications', Icon: FileText },
  { id: 'scans', label: 'My scans', Icon: ScanLine },
  { id: 'plans', label: 'Saved plans', Icon: Compass },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

function Tabs({ value, onChange }) {
  return (
    <nav className="sticky top-24 space-y-1">
      {TABS.map((t) => {
        const Icon = t.Icon;
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold transition ${
              active
                ? 'bg-[hsl(var(--blue-700))] text-white'
                : 'text-[hsl(var(--blue-900))]/70 hover:bg-[hsl(var(--blue-50))] hover:text-[hsl(var(--blue-900))]'
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
        <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
          Profile
        </h2>
        {!editing ? (
          <Button
            data-testid="profile-edit-btn"
            variant="outline"
            onClick={() => setEditing(true)}
            className="rounded-full h-10 px-4 font-bold border-black/10 hover:border-[hsl(var(--blue-700))]/30"
          >
            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button data-testid="profile-cancel-btn" variant="outline" disabled={saving} onClick={onCancel} className="rounded-full h-10 px-4 font-bold border-black/10">
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
            <Button data-testid="profile-save-btn" disabled={saving} onClick={onSave} className="rounded-full h-10 px-4 font-bold btn-accent text-white">
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
            <div key={i.id} className="rounded-2xl bg-white border border-black/5 p-5" data-testid={`profile-row-${i.id}`}>
              <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-[hsl(var(--blue-900))]/55">
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
    </div>
  );
}

function EditField({ label, value, onChange, placeholder, type = 'text', testid }) {
  return (
    <label className="block rounded-2xl bg-white border border-black/8 px-5 py-3 hover:border-[hsl(var(--blue-700))]/25 focus-within:border-[hsl(var(--blue-700))]/40 transition">
      <span className="block text-[11px] uppercase tracking-[0.16em] font-bold text-[hsl(var(--blue-900))]/55">{label}</span>
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
    <label className="block rounded-2xl bg-white border border-black/8 px-5 py-3 hover:border-[hsl(var(--blue-700))]/25 focus-within:border-[hsl(var(--blue-700))]/40 transition">
      <span className="block text-[11px] uppercase tracking-[0.16em] font-bold text-[hsl(var(--blue-900))]/55">{label}</span>
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
  const statusColor = (s) => {
    if (s === 'approved') return 'bg-emerald-100 text-emerald-700';
    if (s === 'in_review') return 'bg-amber-100 text-amber-700';
    if (s === 'rejected') return 'bg-red-100 text-red-700';
    if (s === 'submitted') return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-700';
  };
  return (
    <div className="space-y-3">
      {items.map((a) => (
        <Link
          key={a.id}
          to={`/account/applications/${a.id}`}
          className="block rounded-2xl bg-white border border-black/5 hover:border-[hsl(var(--blue-700))]/20 p-5 transition"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[15px] font-bold text-[hsl(var(--blue-900))]">
                  {a.country_id.toUpperCase()} · {a.visa_type}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${statusColor(a.status)}`}>
                  {(a.status || 'draft').replace('_', ' ')}
                </span>
              </div>
              <div className="mt-0.5 text-[12.5px] text-[hsl(var(--blue-900))]/55">
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
        <Link key={p.id} to={`/holiday/${p.country_id}`} className="rounded-2xl bg-white border border-black/5 p-5 hover:border-[hsl(var(--blue-700))]/20">
          <div className="text-[15px] font-bold text-[hsl(var(--blue-900))]">{p.country_id.toUpperCase()}</div>
          <div className="mt-1 text-[12.5px] text-[hsl(var(--blue-900))]/55">{p.duration_days} days</div>
        </Link>
      ))}
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
        { name, gender, avatar_seed: seed, avatar_style: style },
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
      <h2 className="font-display font-extrabold text-[26px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
        Profile & avatar
      </h2>

      {/* Avatar preview + gender */}
      <div className="mt-6 flex flex-col sm:flex-row gap-6 items-start">
        <div className="flex flex-col items-center gap-2">
          <span className="h-28 w-28 rounded-3xl overflow-hidden bg-[hsl(var(--blue-50))] ring-2 ring-white shadow-[0_20px_40px_-20px_rgba(10,44,138,0.4)]">
            <img src={avatarUrl({ seed, gender, style })} alt="avatar preview" className="h-full w-full object-cover" />
          </span>
          <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55">Preview</span>
        </div>
        <div className="flex-1 w-full">
          <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/60 mb-2">
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
                    active ? 'border-[hsl(var(--blue-700))] shadow-md' : 'border-black/5 hover:border-[hsl(var(--blue-700))]/30'
                  }`}
                >
                  <span className="block aspect-square rounded-xl overflow-hidden bg-[hsl(var(--blue-50))]">
                    <img src={avatarUrl({ seed: p.seed, style: p.style })} alt={p.label} className="h-full w-full object-cover" />
                  </span>
                  <span className="block text-[11px] font-bold mt-1 text-[hsl(var(--blue-900))]/75 truncate">
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
            <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/60 mb-2">
              Gender (used to tune avatar)
            </div>
            <div className="inline-flex p-1 rounded-full bg-[hsl(var(--soft-bg))] border border-black/5">
              {[
                { id: 'male', label: 'Male' },
                { id: 'female', label: 'Female' },
                { id: 'other', label: 'Other' },
                { id: 'hero', label: 'Hero (default)' },
              ].map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGender(g.id)}
                  className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition ${
                    gender === g.id
                      ? 'bg-white shadow-sm text-[hsl(var(--blue-700))]'
                      : 'text-[hsl(var(--blue-900))]/60 hover:text-[hsl(var(--blue-900))]'
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
        <label className="block text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/60 mb-1.5">
          Display name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-12 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[15px] text-[hsl(var(--blue-900))] transition"
        />
        <Button onClick={onSave} disabled={busy} className="mt-4 rounded-full btn-primary text-white h-11 px-6 font-bold">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ title, sub, cta }) {
  return (
    <div className="rounded-2xl bg-white border border-dashed border-black/15 p-10 text-center">
      <div className="font-display font-extrabold text-[20px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">{title}</div>
      <p className="mt-1 text-[14px] text-[hsl(var(--blue-900))]/60">{sub}</p>
      {cta && (
        <Link to={cta.to} className="mt-5 inline-flex items-center gap-1 rounded-full btn-primary text-white h-10 px-5 font-bold text-[13px]">
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
      <main className="pt-28 pb-16 bg-[hsl(var(--soft-bg))] min-h-[80vh]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-3">
            <div className="rounded-2xl bg-white border border-black/5 p-5 mb-4">
              <div className="flex items-center gap-3">
                <span className="h-12 w-12 rounded-full overflow-hidden bg-[hsl(var(--blue-50))] ring-1 ring-black/5">
                  <img
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
                  <div className="text-[12px] text-[hsl(var(--blue-900))]/55 truncate">
                    {user.email || user.phone}
                  </div>
                </div>
              </div>
            </div>
            <Tabs value={tab} onChange={(t) => setParams({ tab: t })} />
          </aside>
          <section className="lg:col-span-9">
            <div className="rounded-3xl bg-white border border-black/5 p-8 min-h-[420px]">
              {tab === 'profile' && <ProfileTab user={user} token={token} onUpdated={refreshUser} />}
              {tab === 'applications' && <ApplicationsTab token={token} />}
              {tab === 'scans' && <ScansTab user={user} token={token} />}
              {tab === 'plans' && <PlansTab token={token} />}
              {tab === 'settings' && <SettingsTab user={user} token={token} onUpdated={refreshUser} />}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

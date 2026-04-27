import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { User as UserIcon, FileText, Compass, Settings, Loader2, ChevronRight } from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'Profile', Icon: UserIcon },
  { id: 'applications', label: 'Applications', Icon: FileText },
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

function ProfileTab({ user }) {
  return (
    <div>
      <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
        Profile
      </h2>
      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {[
          { id: 'name', label: 'Name', value: user.name || 'Not set' },
          { id: 'email', label: 'Email', value: user.email || 'Not set' },
          { id: 'phone', label: 'Mobile', value: user.phone || 'Not set' },
          { id: 'verified', label: 'Verified channel', value: user.email_verified ? 'Email' : user.phone_verified ? 'Mobile (OTP)' : 'None' },
        ].map((i) => (
          <div key={i.id} className="rounded-2xl bg-white border border-black/5 p-5">
            <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-[hsl(var(--blue-900))]/55">
              {i.label}
            </div>
            <div className="mt-1 text-[15px] font-bold text-[hsl(var(--blue-900))]">{i.value}</div>
          </div>
        ))}
      </div>
    </div>
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
        <div key={a.id} className="rounded-2xl bg-white border border-black/5 p-5 flex items-center justify-between">
          <div>
            <div className="text-[15px] font-bold text-[hsl(var(--blue-900))]">{a.country_id.toUpperCase()} \u00B7 {a.visa_type}</div>
            <div className="text-[12.5px] text-[hsl(var(--blue-900))]/55">Status: {a.status}</div>
          </div>
          <Link to={`/visa/${a.country_id}`} className="inline-flex items-center gap-1 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline">
            Open <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
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
  const [busy, setBusy] = useState(false);
  const onSave = async () => {
    setBusy(true);
    try {
      await axios.put(
        `${API}/users/me`,
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: 'Saved' });
      onUpdated?.();
    } catch {
      toast({ title: 'Could not save' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="max-w-md">
      <h2 className="font-display font-extrabold text-[24px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">Settings</h2>
      <label className="block mt-6 text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/60 mb-1.5">
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
  const { user, token, isAuthed, loading } = useAuth();
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
                <span className="h-11 w-11 rounded-full bg-[hsl(var(--blue-700))] text-white inline-flex items-center justify-center font-bold">
                  {(user.name || user.email || user.phone || '?').charAt(0).toUpperCase()}
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
              {tab === 'profile' && <ProfileTab user={user} />}
              {tab === 'applications' && <ApplicationsTab token={token} />}
              {tab === 'plans' && <PlansTab token={token} />}
              {tab === 'settings' && <SettingsTab user={user} token={token} />}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

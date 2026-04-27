import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, User as UserIcon, LogOut, FileText, Compass, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { avatarUrl } from '../lib/avatars';

export default function UserMenu() {
  const { user, logout, openAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => openAuth('login')}
          className="hidden sm:inline-flex items-center px-3 py-2 rounded-full text-[13px] font-bold text-[hsl(var(--blue-900))]/80 hover:text-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-50))] transition"
        >
          Sign in
        </button>
        <button
          onClick={() => openAuth('signup')}
          className="hidden md:inline-flex items-center rounded-full btn-primary text-white px-4 py-2 text-[13px] font-bold"
        >
          Sign up
        </button>
      </div>
    );
  }

  const initial = (user.name || user.email || user.phone || '?').charAt(0).toUpperCase();
  const display = user.name || user.email || user.phone;
  const seed = user.avatar_seed || user.email || user.phone || user.id;
  const aUrl = avatarUrl({ seed, gender: user.gender || 'hero', style: user.avatar_style });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-white border border-black/8 hover:border-[hsl(var(--blue-700))]/30 px-2 py-1.5 transition"
      >
        <span className="h-8 w-8 rounded-full overflow-hidden bg-[hsl(var(--blue-50))] ring-1 ring-black/5">
          <img src={aUrl} alt={initial} className="h-full w-full object-cover" />
        </span>
        <span className="hidden sm:inline text-[13px] font-bold text-[hsl(var(--blue-900))] max-w-[140px] truncate">
          {display}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-[hsl(var(--blue-900))]/55" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl backdrop-blur-xl bg-white/85 border border-white/40 shadow-[0_20px_50px_-25px_rgba(10,44,138,0.4)] p-2 z-50">
          <div className="px-3 py-3 border-b border-black/5 flex items-center gap-3">
            <span className="h-10 w-10 rounded-full overflow-hidden bg-[hsl(var(--blue-50))] ring-2 ring-white">
              <img src={aUrl} alt={initial} className="h-full w-full object-cover" />
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-bold text-[hsl(var(--blue-900))] truncate">{display}</div>
              <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55">
                Signed in
              </div>
            </div>
          </div>
          {[
            { id: 'account', to: '/account', Icon: UserIcon, label: 'My account' },
            { id: 'apps', to: '/account?tab=applications', Icon: FileText, label: 'My applications' },
            { id: 'plans', to: '/account?tab=plans', Icon: Compass, label: 'Saved holiday plans' },
            { id: 'settings', to: '/account?tab=settings', Icon: Settings, label: 'Settings' },
          ].map((it) => {
            const Icon = it.Icon;
            return (
              <Link
                key={it.id}
                to={it.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] text-[hsl(var(--blue-900))] hover:bg-[hsl(var(--blue-50))]"
              >
                <Icon className="w-4 h-4 text-[hsl(var(--blue-700))]" />
                {it.label}
              </Link>
            );
          })}
          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="w-full text-left flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] text-[hsl(var(--accent))] hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

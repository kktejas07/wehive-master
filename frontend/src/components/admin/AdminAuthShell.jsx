import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { BRAND } from '../../data/mock';

export default function AdminAuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-[#0b1020] text-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative noise + accent glows */}
      <div aria-hidden className="absolute top-[-15%] left-[-10%] h-[420px] w-[420px] rounded-full bg-[hsl(var(--accent))]/20 blur-[140px]" />
      <div aria-hidden className="absolute bottom-[-20%] right-[-10%] h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[160px]" />
      <div aria-hidden className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      <div className="relative w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <img src={BRAND.logo} alt="We Hive" className="h-12 w-auto" />
          <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-bold">Admin</span>
        </Link>

        <div className="rounded-3xl bg-[#111632]/80 backdrop-blur-xl border border-white/8 p-8 sm:p-10 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.6)]">
          <h1 className="font-display font-extrabold text-[32px] sm:text-[36px] leading-[1.1] tracking-[-0.03em] text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-[14px] text-slate-400 leading-relaxed">{subtitle}</p>
          )}
          <div className="mt-7">{children}</div>
        </div>

        {footer && (
          <div className="mt-5 text-center text-[13px] text-slate-500">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({ label, testid, type = 'text', value, onChange, placeholder, autoComplete, disabled }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-1.5">{label}</span>
      <div className="relative">
        <input
          data-testid={testid}
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className="w-full h-11 px-4 rounded-xl bg-black/30 border border-white/10 focus:border-[hsl(var(--accent))] focus:bg-black/40 text-[14px] text-white placeholder:text-slate-600 outline-none transition disabled:opacity-60 pr-10"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </label>
  );
}

export function PasswordStrength({ password }) {
  const checks = [
    { id: 'len',  ok: password.length >= 8,            label: '8+ characters' },
    { id: 'num',  ok: /\d/.test(password),             label: 'a number' },
    { id: 'alpha',ok: /[a-zA-Z]/.test(password),       label: 'a letter' },
    { id: 'spc',  ok: /[^a-zA-Z0-9]/.test(password),   label: 'a symbol (optional)' },
  ];
  const score = checks.filter((c) => c.ok).length;
  const color = score >= 3 ? 'bg-emerald-500' : score >= 2 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="mt-2">
      <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full transition-all ${color}`} style={{ width: `${(score / 4) * 100}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-slate-500">
        {checks.map((c) => (
          <span key={c.id} className={c.ok ? 'text-emerald-300' : ''}>
            {c.ok ? '✓' : '·'} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PrimaryButton({ children, disabled, onClick, testid, type = 'button' }) {
  return (
    <button
      type={type}
      data-testid={testid}
      disabled={disabled}
      onClick={onClick}
      className="w-full h-12 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-60 text-white font-bold text-[14px] tracking-tight transition shadow-[0_20px_40px_-15px_rgba(225,33,44,0.5)]"
    >
      {children}
    </button>
  );
}

export function ErrorMessage({ text }) {
  if (!text) return null;
  return (
    <div role="alert" data-testid="admin-auth-error" className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-3.5 py-2.5 text-[12.5px] text-red-300">
      {text}
    </div>
  );
}

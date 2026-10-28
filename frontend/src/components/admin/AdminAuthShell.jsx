import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { BRAND } from '../../data/mock';

export default function AdminAuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))] flex items-center justify-center px-4 py-10 sm:p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-3 mb-6">
          <img src={BRAND.logo} alt="We Hive" className="h-12 w-auto" />
          <span className="text-[12px] uppercase tracking-[0.14em] text-[hsl(var(--blue-700))] font-semibold border-l border-border pl-3">Admin</span>
        </Link>

        <div className="rounded-2xl bg-white border border-border p-6 sm:p-8 shadow-sm">
          <h1 className="font-display font-bold text-[28px] sm:text-[32px] leading-[1.15] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">{subtitle}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>

        {footer && (
          <div className="mt-5 text-center text-[14px] text-muted-foreground">
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
      <span className="block text-[13px] font-semibold text-[hsl(var(--blue-900))] mb-1.5">{label}</span>
      <div className="relative">
        <input
          data-testid={testid}
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className="w-full h-12 px-4 rounded-xl bg-white border border-slate-300 focus:border-[hsl(var(--blue-700))] focus:ring-2 focus:ring-[hsl(var(--blue-700))]/20 text-[15px] text-[hsl(var(--blue-900))] placeholder:text-[var(--text-secondary)] outline-none transition-colors disabled:opacity-60 pr-11"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            tabIndex={-1}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-[hsl(var(--blue-900))] transition-colors"
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
      <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full transition-all ${color}`} style={{ width: `${(score / 4) * 100}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
        {checks.map((c) => (
          <span key={c.id} className={c.ok ? 'text-emerald-700' : ''}>
            {c.ok ? 'OK' : '·'} {c.label}
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
      className="w-full h-12 rounded-xl btn-accent disabled:opacity-60 text-[var(--text-primary)] font-semibold text-[15px] transition-colors"
    >
      {children}
    </button>
  );
}

export function ErrorMessage({ text }) {
  if (!text) return null;
  return (
    <div role="alert" data-testid="admin-auth-error" className="mt-4 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-[13px] text-red-700">
      {text}
    </div>
  );
}

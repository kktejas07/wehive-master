import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import AdminAuthShell, { Field, PrimaryButton, ErrorMessage } from '../components/admin/AdminAuthShell';

function formatDetail(d) {
  if (d == null) return 'Something went wrong. Please try again.';
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((e) => e?.msg || JSON.stringify(e)).join(' ');
  return String(d.msg || d);
}

export default function AdminForgotPassword() {
  const { forgotPassword } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await forgotPassword({ email: email.trim() });
      setSent(res);
    } catch (ex) {
      setErr(formatDetail(ex?.response?.data?.detail) || ex.message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AdminAuthShell
        title="Check your email"
        subtitle="If an admin account exists for that email, we've sent a reset link valid for 30 minutes."
        footer={
          <>
            <Link to="/admin/login" className="text-[hsl(var(--blue-700))] font-semibold hover:underline">
              Back to sign-in
            </Link>
          </>
        }
      >
        <div className="flex flex-col items-center text-center">
          <span className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-700 inline-flex items-center justify-center mb-4">
            <Mail className="w-7 h-7" />
          </span>
          <p className="text-[15px] text-muted-foreground">
            {sent.message}
          </p>
          {sent.dev_mode && sent.dev_link && (
            <div className="mt-5 w-full rounded-xl bg-amber-50 border border-amber-200 p-4 text-left">
              <div className="text-[12px] uppercase tracking-[0.14em] font-semibold text-amber-800 mb-1">Dev mode</div>
              <p className="text-[13px] text-amber-900 leading-relaxed">
                SMTP isn't configured, so we're showing the reset link here. Open it to set a new password:
              </p>
              <a
                data-testid="admin-forgot-dev-link"
                href={`/admin/reset-password?token=${encodeURIComponent(sent.dev_token)}`}
                className="mt-2 inline-block text-[13px] font-mono text-[hsl(var(--blue-700))] break-all hover:underline"
              >
                /admin/reset-password?token={sent.dev_token.slice(0, 12)}…
              </a>
            </div>
          )}
        </div>
      </AdminAuthShell>
    );
  }

  return (
    <AdminAuthShell
      title="Reset your password"
      subtitle="Enter your admin email and we'll send a secure reset link."
      footer={
        <>
          Remembered it?{' '}
          <Link to="/admin/login" className="text-[hsl(var(--blue-700))] font-semibold hover:underline">
            Back to sign-in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" data-testid="admin-forgot-form">
        <Field label="Email" testid="admin-forgot-email" type="email" value={email} onChange={setEmail} placeholder="admin@wehive.co.in" autoComplete="email" />
        <ErrorMessage text={err} />
        <PrimaryButton type="submit" disabled={busy || !email} testid="admin-forgot-submit">
          {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Send reset link'}
        </PrimaryButton>
      </form>
    </AdminAuthShell>
  );
}

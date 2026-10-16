import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import AdminAuthShell, { Field, PrimaryButton, ErrorMessage } from '../components/admin/AdminAuthShell';

function formatDetail(d) {
  if (d == null) return 'Something went wrong. Please try again.';
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((e) => e?.msg || JSON.stringify(e)).join(' ');
  return String(d.msg || d);
}

export default function AdminLogin() {
  const { login, isAuthed } = useAdminAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const raw = params.get('next') || '';
  // Only follow in-app admin paths (no open redirect).
  const next = raw.startsWith('/admin') && !raw.startsWith('/admin/login') ? raw : '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (isAuthed) navigate(next, { replace: true });
  }, [isAuthed, navigate, next]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login({ email: email.trim(), password });
      navigate(next, { replace: true });
    } catch (ex) {
      setErr(formatDetail(ex?.response?.data?.detail) || ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminAuthShell
      title="Admin sign-in"
      subtitle="Access the Wehive control room. Only allow-listed emails can log in here."
      footer={
        <>
          New admin?{' '}
          <Link to="/admin/signup" className="text-[hsl(var(--blue-700))] font-semibold hover:underline" data-testid="admin-goto-signup">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" data-testid="admin-login-form">
        <Field label="Email" testid="admin-login-email" type="email" value={email} onChange={setEmail} placeholder="admin@wehive.co.in" autoComplete="email" />
        <Field label="Password" testid="admin-login-password" type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" />
        <ErrorMessage text={err} />
        <PrimaryButton type="submit" disabled={busy || !email || !password} testid="admin-login-submit">
          {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Sign in to admin'}
        </PrimaryButton>
        <div className="text-center">
          <Link to="/admin/forgot-password" className="text-[14px] font-medium text-[hsl(var(--blue-700))] hover:underline" data-testid="admin-goto-forgot">
            Forgot your password?
          </Link>
        </div>
      </form>
    </AdminAuthShell>
  );
}

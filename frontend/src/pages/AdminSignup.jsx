import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import AdminAuthShell, { Field, PrimaryButton, ErrorMessage, PasswordStrength } from '../components/admin/AdminAuthShell';

function formatDetail(d) {
  if (d == null) return 'Something went wrong. Please try again.';
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((e) => e?.msg || JSON.stringify(e)).join(' ');
  return String(d.msg || d);
}

export default function AdminSignup() {
  const { signup, isAuthed } = useAdminAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bootstrapToken, setBootstrapToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (isAuthed) navigate('/admin', { replace: true });
  }, [isAuthed, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await signup({ email: email.trim(), password, name: name.trim(), bootstrapToken: bootstrapToken.trim() });
      navigate('/admin', { replace: true });
    } catch (ex) {
      setErr(formatDetail(ex?.response?.data?.detail) || ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminAuthShell
      title="Create admin account"
      subtitle="For the first admin only: your email must be on the ADMIN_EMAILS allow-list and you need the server's ADMIN_BOOTSTRAP_TOKEN. Later admins are added by an existing admin."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/admin/login" className="text-[hsl(var(--accent))] font-bold hover:underline" data-testid="admin-goto-login">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" data-testid="admin-signup-form">
        <Field label="Full name" testid="admin-signup-name" value={name} onChange={setName} placeholder="Jane Operator" autoComplete="name" />
        <Field label="Email" testid="admin-signup-email" type="email" value={email} onChange={setEmail} placeholder="you@wehive.co.in" autoComplete="email" />
        <div>
          <Field label="Password" testid="admin-signup-password" type="password" value={password} onChange={setPassword} placeholder="At least 8 chars + a number" autoComplete="new-password" />
          {password && <PasswordStrength password={password} />}
        </div>
        <Field label="Setup token" testid="admin-signup-bootstrap" type="password" value={bootstrapToken} onChange={setBootstrapToken} placeholder="ADMIN_BOOTSTRAP_TOKEN" autoComplete="off" />
        <ErrorMessage text={err} />
        <PrimaryButton type="submit" disabled={busy || !name || !email || !password || !bootstrapToken} testid="admin-signup-submit">
          {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Create admin account'}
        </PrimaryButton>
      </form>
    </AdminAuthShell>
  );
}

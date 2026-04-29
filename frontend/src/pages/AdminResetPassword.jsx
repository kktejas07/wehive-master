import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import AdminAuthShell, { Field, PrimaryButton, ErrorMessage, PasswordStrength } from '../components/admin/AdminAuthShell';

function formatDetail(d) {
  if (d == null) return 'Something went wrong. Please try again.';
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((e) => e?.msg || JSON.stringify(e)).join(' ');
  return String(d.msg || d);
}

export default function AdminResetPassword() {
  const { resetPassword } = useAdminAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    // If user landed here with a token in URL, prefill and focus password field
    setToken(params.get('token') || '');
  }, [params]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (password !== confirm) {
      setErr('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await resetPassword({ token: token.trim(), new_password: password });
      setDone(true);
      setTimeout(() => navigate('/admin', { replace: true }), 1500);
    } catch (ex) {
      setErr(formatDetail(ex?.response?.data?.detail) || ex.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AdminAuthShell title="Password reset" subtitle="Redirecting you to the dashboard…">
        <div className="flex flex-col items-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-300 mb-3" />
          <p className="text-[14px] text-slate-300">You're signed in with your new password.</p>
        </div>
      </AdminAuthShell>
    );
  }

  return (
    <AdminAuthShell
      title="Set a new password"
      subtitle="Your reset link is single-use and expires 30 minutes after it was sent."
      footer={
        <>
          <Link to="/admin/login" className="text-[hsl(var(--accent))] font-bold hover:underline">
            Back to sign-in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" data-testid="admin-reset-form">
        <Field
          label="Reset token"
          testid="admin-reset-token"
          value={token}
          onChange={setToken}
          placeholder="Paste from the email"
          disabled={!!params.get('token')}
        />
        <div>
          <Field label="New password" testid="admin-reset-password" type="password" value={password} onChange={setPassword} placeholder="At least 8 chars" autoComplete="new-password" />
          {password && <PasswordStrength password={password} />}
        </div>
        <Field label="Confirm password" testid="admin-reset-confirm" type="password" value={confirm} onChange={setConfirm} placeholder="Repeat new password" autoComplete="new-password" />
        <ErrorMessage text={err} />
        <PrimaryButton type="submit" disabled={busy || !token || !password || !confirm} testid="admin-reset-submit">
          {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Reset password & sign in'}
        </PrimaryButton>
      </form>
    </AdminAuthShell>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import AdminAuthShell, { Field, PrimaryButton, ErrorMessage } from '../components/admin/AdminAuthShell';

const DEMO_PASSWORD = 'outpass-demo-123';

const DEMO_ACCOUNTS = [
  { role: 'Student',      email: 'student@outpass.dev',  note: 'Active outpass pending, 2 parcels, overdue bus-fee badge' },
  { role: 'Parent',       email: 'parent@outpass.dev',   note: 'Approval request from Asha waiting, past history' },
  { role: 'Warden',       email: 'warden@outpass.dev',   note: '30 requests in queue, overdue alert, SOS banner' },
  { role: 'Guard',        email: 'guard@outpass.dev',    note: 'Gate log, parcel management, walk-in visitors' },
  { role: 'Admin',        email: 'admin@outpass.dev',    note: 'Full campus dashboard, 190+ students, fee queue' },
  { role: 'Faculty / HOD',email: 'faculty@outpass.dev',  note: 'Approval queue for CSE students, campus events' },
];

const DEMO_STUDENTS = [
  { name: 'Karthik Menon',  email: 'karthik@outpass.dev',  note: 'Currently OUT and overdue, extension request pending' },
  { name: 'Priya Shah',     email: 'priya@outpass.dev',    note: 'Pass approved, leaving in 2 h; SOS alert raised' },
  { name: 'Diya Rao',       email: 'diya@outpass.dev',     note: 'Pass at warden step (under-18, needs consent)' },
  { name: 'Meghana Iyer',   email: 'meghana@outpass.dev',  note: 'Day scholar, pass waiting for faculty' },
  { name: 'Rahul Verma',    email: 'rahul@outpass.dev',    note: 'Bulk history, various states' },
];

function DemoPanel({ onPick }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5 rounded-xl border border-[#E8EDF8] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#F0F4FF] hover:bg-[#E5EBFF] transition-colors text-left"
      >
        <span className="text-[13px] font-bold text-[#1B2B5E]">Demo login accounts</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 bg-white space-y-3">
          <p className="text-[11px] text-gray-500 mb-2">
            Password for all accounts: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-[#1B2B5E]">{DEMO_PASSWORD}</code>
            <span className="ml-2 text-gray-400">— click a row to auto-fill</span>
          </p>

          <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Roles</div>
          <div className="divide-y divide-[#F0F4FF] rounded-lg border border-[#E8EDF8] overflow-hidden">
            {DEMO_ACCOUNTS.map(a => (
              <button
                key={a.email}
                type="button"
                onClick={() => onPick(a.email)}
                className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-[#F5F7FF] transition-colors text-left"
              >
                <span className="shrink-0 min-w-[90px] text-[12px] font-bold text-[#011CB5]">{a.role}</span>
                <div className="min-w-0">
                  <div className="text-[12px] text-[#1B2B5E] font-medium truncate">{a.email}</div>
                  <div className="text-[11px] text-gray-400 truncate">{a.note}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-3 mb-1">Additional students</div>
          <div className="divide-y divide-[#F0F4FF] rounded-lg border border-[#E8EDF8] overflow-hidden">
            {DEMO_STUDENTS.map(a => (
              <button
                key={a.email}
                type="button"
                onClick={() => onPick(a.email)}
                className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-[#F5F7FF] transition-colors text-left"
              >
                <span className="shrink-0 min-w-[90px] text-[12px] font-bold text-[#1B2B5E]">{a.name}</span>
                <div className="min-w-0">
                  <div className="text-[12px] text-[#1B2B5E] truncate">{a.email}</div>
                  <div className="text-[11px] text-gray-400 truncate">{a.note}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDetail(d) {
  if (d == null) return 'Something went wrong. Please try again.';
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((e) => e?.msg || JSON.stringify(e)).join(' ');
  return String(d.msg || d);
}

export default function AdminLogin() {
  const { login, verifyTwoFactor, isAuthed } = useAdminAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const raw = params.get('next') || '';
  // Only follow in-app admin paths (no open redirect).
  const next = raw.startsWith('/admin') && !raw.startsWith('/admin/login') ? raw : '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [mfaToken, setMfaToken] = useState(null);
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);

  useEffect(() => {
    if (isAuthed) navigate(next, { replace: true });
  }, [isAuthed, navigate, next]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const data = await login({ email: email.trim(), password });
      if (data?.mfa_required) {
        setMfaToken(data.mfa_token);
        setCode('');
        return;
      }
      navigate(next, { replace: true });
    } catch (ex) {
      setErr(formatDetail(ex?.response?.data?.detail) || ex.message);
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await verifyTwoFactor({ mfaToken, code: code.trim() });
      navigate(next, { replace: true });
    } catch (ex) {
      const status = ex?.response?.status;
      setErr(formatDetail(ex?.response?.data?.detail) || ex.message);
      // The ticket expired or was rejected: start over from the password.
      if (status === 401 && /password again/i.test(String(ex?.response?.data?.detail))) setMfaToken(null);
    } finally {
      setBusy(false);
    }
  };

  if (mfaToken) {
    return (
      <AdminAuthShell title="Two-factor check" subtitle={useRecovery ? 'Enter one of your saved recovery codes. Each works once.' : 'Enter the 6-digit code from your authenticator app.'}>
        <form onSubmit={onVerify} className="space-y-5" data-testid="admin-2fa-form">
          {useRecovery ? (
            <Field label="Recovery code" testid="admin-2fa-code" value={code} onChange={setCode} placeholder="xxxxx-xxxxx" autoComplete="off" />
          ) : (
            <Field label="Authentication code" testid="admin-2fa-code" value={code} onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} placeholder="123456" autoComplete="one-time-code" />
          )}
          <ErrorMessage text={err} />
          <PrimaryButton type="submit" disabled={busy || (useRecovery ? code.trim().length < 10 : code.length !== 6)} testid="admin-2fa-submit">
            {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Verify and sign in'}
          </PrimaryButton>
          <div className="flex justify-between text-[14px]">
            <button type="button" onClick={() => { setUseRecovery((r) => !r); setCode(''); setErr(''); }} className="font-medium text-[hsl(var(--blue-700))] hover:underline">
              {useRecovery ? 'Use authenticator code' : 'Use a recovery code'}
            </button>
            <button type="button" onClick={() => { setMfaToken(null); setErr(''); }} className="text-slate-600 hover:underline">Back</button>
          </div>
        </form>
      </AdminAuthShell>
    );
  }

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
      <DemoPanel onPick={(e) => { setEmail(e); setPassword(DEMO_PASSWORD); }} />
    </AdminAuthShell>
  );
}

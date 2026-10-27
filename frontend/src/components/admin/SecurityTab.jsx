import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Loader2, ShieldCheck, ShieldOff, KeyRound, Copy, Download } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { apiClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

const errMsg = (e) => e?.response?.data?.detail || e.message;
const inputCls = 'w-full h-11 px-4 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[hsl(var(--blue-700))]';
const btn = 'inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl text-[13px] font-semibold disabled:opacity-50';
const auth = (token) => apiClient(token);

function CodeInput({ id, value, onChange, label = 'Code from your app' }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1">{label}</label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="123456"
        className={`${inputCls} tracking-[0.3em] font-mono max-w-[200px]`}
      />
    </div>
  );
}

function RecoveryCodes({ codes, onDone }) {
  const { toast } = useToast();
  const text = codes.join('\n');
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([`We Hive admin recovery codes\n\n${text}\n`], { type: 'text/plain' }));
    a.download = 'wehive-admin-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <Panel className="mt-4 border-amber-500/30" >
      <div data-testid="recovery-codes">
        <div className="text-[var(--text-primary)] font-semibold text-[15px]">Save your recovery codes</div>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          If you lose your phone, each code signs you in once. They won't be shown again — store them in a password manager.
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[14px] text-amber-200 max-w-sm">
          {codes.map((c) => <li key={c}>{c}</li>)}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={`${btn} bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)] text-[var(--text-primary)]`} onClick={() => navigator.clipboard?.writeText(text).then(() => toast({ title: 'Copied' }))}>
            <Copy className="w-4 h-4" /> Copy
          </button>
          <button className={`${btn} bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)] text-[var(--text-primary)]`} onClick={download}><Download className="w-4 h-4" /> Download</button>
          <button className={`${btn} bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white`} onClick={onDone} data-testid="recovery-codes-done">
            I've saved them
          </button>
        </div>
      </div>
    </Panel>
  );
}

export default function SecurityTab() {
  const { token, admin, adopt, refresh } = useAdminAuth();
  const { toast } = useToast();
  const [setup, setSetup] = useState(null); // { secret, otpauth_uri, qr }
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState(null);
  const [disabling, setDisabling] = useState(false);
  const [password, setPassword] = useState('');

  const enabled = !!admin?.totp_enabled;

  useEffect(() => {
    if (!setup?.otpauth_uri || setup.qr) return;
    QRCode.toDataURL(setup.otpauth_uri, { margin: 1, width: 200 })
      .then((qr) => setSetup((s) => ({ ...s, qr })))
      .catch(() => {});
  }, [setup]);

  const run = async (fn) => {
    setBusy(true);
    try { await fn(); } catch (e) { toast({ title: 'Failed', description: errMsg(e), variant: 'destructive' }); } finally { setBusy(false); }
  };

  const start = () => run(async () => {
    const { data } = await auth(token).post('/admin-auth/2fa/setup');
    setSetup(data);
    setCode('');
  });

  const enable = () => run(async () => {
    const { data } = await auth(token).post('/admin-auth/2fa/enable', { code });
    adopt({ access_token: data.access_token, user: data.user });
    setSetup(null);
    setCodes(data.recovery_codes);
    toast({ title: 'Two-factor is on' });
  });

  const disable = () => run(async () => {
    const { data } = await auth(token).post('/admin-auth/2fa/disable', { password, code });
    adopt({ access_token: data.access_token });
    await refresh();
    setDisabling(false); setPassword(''); setCode('');
    toast({ title: 'Two-factor turned off' });
  });

  const regenerate = () => run(async () => {
    const { data } = await auth(token).post('/admin-auth/2fa/recovery-codes', { code });
    setCodes(data.recovery_codes);
    setCode('');
    await refresh();
  });

  return (
    <div data-testid="admin-security-tab">
      <AdminHeader title="My security" subtitle="Protect your admin account with a second step at sign-in." />

      <Panel>
        <div className="flex items-start gap-3">
          {enabled ? <ShieldCheck className="w-6 h-6 text-emerald-300 shrink-0" /> : <ShieldOff className="w-6 h-6 text-amber-300 shrink-0" />}
          <div className="flex-1">
            <div className="text-[var(--text-primary)] font-semibold text-[15px]" data-testid="2fa-status">
              Two-factor authentication is {enabled ? 'on' : 'off'}
            </div>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              {enabled
                ? `You'll be asked for a code from your authenticator app at every sign-in. ${admin?.recovery_codes_left ?? 0} recovery code(s) left.`
                : 'Use Google Authenticator, Microsoft Authenticator, Authy or 1Password. Without it, a leaked password is enough to get into the admin panel.'}
            </p>
          </div>
        </div>

        {!enabled && !setup && (
          <button onClick={start} disabled={busy} data-testid="2fa-start" className={`${btn} mt-4 bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white`}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Turn on two-factor
          </button>
        )}

        {setup && (
          <div className="mt-5 grid sm:grid-cols-[auto_1fr] gap-5 items-start" data-testid="2fa-setup">
            <div className="rounded-xl bg-white p-2 w-[216px] h-[216px] flex items-center justify-center">
              {setup.qr ? <img src={setup.qr} alt="QR code for your authenticator app" width={200} height={200} /> : <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />}
            </div>
            <div className="space-y-3">
              <ol className="list-decimal pl-5 text-[13px] text-[var(--text-secondary)] space-y-1">
                <li>Open your authenticator app and scan the QR code.</li>
                <li>Can't scan? Add an account manually with this key:</li>
              </ol>
              <code className="block font-mono text-[13px] text-amber-200 break-all bg-[var(--glass)] rounded-lg px-3 py-2" data-testid="2fa-secret">{setup.secret}</code>
              <CodeInput id="2fa-enable-code" value={code} onChange={setCode} label="3. Enter the 6-digit code it shows" />
              <div className="flex gap-2">
                <button onClick={enable} disabled={busy || code.length !== 6} data-testid="2fa-enable" className={`${btn} bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white`}>
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} Verify and turn on
                </button>
                <button onClick={() => setSetup(null)} className={`${btn} bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)] text-[var(--text-primary)]`}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {enabled && !codes && (
          <div className="mt-5 grid md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <div className="text-[13px] font-semibold text-[var(--text-primary)]">New recovery codes</div>
              <p className="text-[12px] text-[var(--text-secondary)]">Replaces all your old codes.</p>
              <CodeInput id="2fa-regen-code" value={disabling ? '' : code} onChange={setCode} />
              <button onClick={regenerate} disabled={busy || disabling || code.length !== 6} className={`${btn} bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)] text-[var(--text-primary)]`}>Generate</button>
            </div>
            <div className="space-y-2">
              <div className="text-[13px] font-semibold text-[var(--text-primary)]">Turn off two-factor</div>
              {!disabling ? (
                <button onClick={() => { setDisabling(true); setCode(''); }} className={`${btn} bg-red-500/15 hover:bg-red-500/25 text-red-200`} data-testid="2fa-disable-start">Turn off…</button>
              ) : (
                <>
                  <label htmlFor="2fa-disable-pw" className="block text-[12px] font-semibold text-[var(--text-secondary)]">Password</label>
                  <input id="2fa-disable-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} autoComplete="current-password" />
                  <CodeInput id="2fa-disable-code" value={code} onChange={setCode} />
                  <div className="flex gap-2">
                    <button onClick={disable} disabled={busy || !password || code.length !== 6} className={`${btn} bg-red-600 hover:bg-red-700 text-[var(--text-primary)]`} data-testid="2fa-disable">Turn off</button>
                    <button onClick={() => { setDisabling(false); setCode(''); }} className={`${btn} bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)] text-[var(--text-primary)]`}>Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Panel>

      {codes && <RecoveryCodes codes={codes} onDone={() => { setCodes(null); refresh(); }} />}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Mail, Phone, Loader2, Check, ArrowLeft, ShieldCheck, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { useAuth, API } from '../context/AuthContext';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { useToast } from '../hooks/use-toast';

const INPUT_CLS = 'w-full h-12 rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-[16px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/45 outline-none transition-colors duration-200 hover:border-[hsl(var(--blue-200))] focus:border-[hsl(var(--blue-700))] focus:ring-[3px] focus:ring-[hsl(var(--blue-700))]/20';
const LABEL_CLS = 'block text-[14px] font-semibold text-[hsl(var(--blue-900))] mb-1.5';
const ALT_LINK_CLS = 'font-semibold text-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-800))] hover:underline underline-offset-2';

function TabsInline({ value, onChange, tabs }) {
  return (
    <div className="grid grid-flow-col auto-cols-fr w-full p-1 rounded-xl bg-[hsl(var(--soft-bg))] border border-[hsl(var(--border))]">
      {tabs.filter(t => t.enabled !== false).map((opt) => {
        const Icon = opt.Icon;
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            aria-pressed={active}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg h-10 px-3 text-[14px] font-semibold transition-colors duration-200 ${
              active
                ? 'bg-white shadow-sm text-[hsl(var(--blue-700))] ring-1 ring-[hsl(var(--border))]'
                : 'text-muted-foreground hover:text-[hsl(var(--blue-900))]'
            }`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function OtpDigits({ value, onChange, length = 6 }) {
  const refs = useRef([]);
  const handle = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = value.split('');
    next[idx] = val;
    const joined = next.join('').slice(0, length);
    onChange(joined);
    if (val && idx < length - 1) refs.current[idx + 1]?.focus();
  };
  const handleKey = (idx, e) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };
  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      e.preventDefault();
      onChange(pasted);
    }
  };
  return (
    <div className="flex justify-center gap-1.5 sm:gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={`otp-${i}`}
          ref={(el) => (refs.current[i] = el)}
          value={value[i] || ''}
          onChange={(e) => handle(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          className="w-11 h-14 sm:w-12 rounded-xl border border-[hsl(var(--border))] bg-white focus:border-[hsl(var(--blue-700))] focus:ring-[3px] focus:ring-[hsl(var(--blue-700))]/20 outline-none text-center text-[22px] font-semibold text-[hsl(var(--blue-900))] transition-colors duration-200"
        />
      ))}
    </div>
  );
}

const ALL_TABS = [
  { id: 'emailpwd', label: 'Email', Icon: Mail, configKey: 'email_password_enabled' },
  { id: 'otp', label: 'OTP', Icon: MessageSquare, configKey: 'otp_enabled' },
];

export default function AuthCard({ mode, referralCode }) {
  const { sendOtp, verifyOtp, isAuthed } = useAuth();
  const { loginWithEmail, signupWithEmail, verificationSent, phoneOtp, verifyPhoneOtpCode, sendPasswordReset } = useFirebaseAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get('next');
  const isValidRedirect = (url) => url && url.startsWith('/') && !url.startsWith('//');
  const nextUrl = isValidRedirect(rawNext) ? rawNext : '/account';
  const [tab, setTab] = useState('emailpwd');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [otpChannel, setOtpChannel] = useState('email');
  const [step, setStep] = useState('input');
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpInfo, setOtpInfo] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [emailPwdLoading, setEmailPwdLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const timerRef = useRef(null);

  const isSignup = mode === 'signup';

  const [authConfig, setAuthConfig] = useState(null);
  const allowedTabs = ALL_TABS.map((t) => ({
    ...t,
    enabled: authConfig ? authConfig[t.configKey] !== false : true,
  }));

  useEffect(() => {
    axios.get(`${API}/public/auth-config`).then((r) => {
      setAuthConfig(r.data);
      const firstEnabled = ALL_TABS.find((t) => {
        if (t.configKey === 'email_password_enabled') return r.data.email_password_enabled !== false;
        if (t.configKey === 'otp_enabled') return r.data.otp_enabled !== false;
        return true;
      });
      if (firstEnabled) setTab(firstEnabled.id);
    // Auth config is optional: on failure all tabs stay enabled (the default).
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthed) navigate(nextUrl, { replace: true });
  }, [isAuthed, navigate, nextUrl]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown]);

  const onEmailPwdSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast({ title: 'Enter email and password' });
      return;
    }
    if (isSignup && !name.trim()) {
      toast({ title: 'Enter your name' });
      return;
    }
    setEmailPwdLoading(true);
    try {
      if (isSignup) {
        await signupWithEmail(identifier, password, name);
        toast({ title: 'Verification email sent', description: 'Check your email to verify your account.' });
      } else {
        const user = await loginWithEmail(identifier, password);
        if (!user.emailVerified) {
          toast({ title: 'Verify your email', description: 'Please verify your email address.' });
        } else {
          toast({ title: 'Our Ambition. Our Guidance. No Frontiers', description: 'Signed in with email.' });
          navigate(nextUrl, { replace: true });
        }
      }
    } catch (e) {
      const code = e.code;
      const messages = {
        'auth/email-already-in-use': 'An account with this email already exists. Please sign in instead.',
        'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/user-not-found': 'No account found with this email. Please sign up first.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/invalid-credential': 'Invalid email or password. Please try again.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
      };
      toast({ title: messages[code] || 'Auth failed', description: messages[code] ? '' : (e.response?.data?.detail || e.message) });
    } finally {
      setEmailPwdLoading(false);
    }
  };

  const onForgotPassword = async () => {
    if (!identifier.trim()) {
      toast({ title: 'Enter your email first', description: 'We need your email address to send the reset link.' });
      return;
    }
    setForgotSending(true);
    try {
      await sendPasswordReset(identifier);
      toast({ title: 'Reset link sent', description: `Check ${identifier} for a link to reset your password.` });
    } catch (e) {
      const messages = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/invalid-email': 'Please enter a valid email address.',
      };
      toast({ title: messages[e.code] || 'Could not send reset link', description: messages[e.code] ? '' : e.message });
    } finally {
      setForgotSending(false);
    }
  };

  const onSendOtp = async () => {
    if (!identifier.trim()) {
      toast({ title: otpChannel === 'email' ? 'Enter your email' : 'Enter your WhatsApp number' });
      return;
    }
    setSending(true);
    try {
      if (otpChannel === 'phone') {
        const info = await phoneOtp(identifier);
        setOtpInfo(info);
        setStep('otp');
        setCountdown(60);
        toast({ title: 'Code sent', description: `via Firebase to ${info.masked}` });
      } else {
        const channel = otpChannel === 'whatsapp' ? 'whatsapp' : 'email';
        const data = await sendOtp({ identifier, channel, purpose: isSignup ? 'signup' : 'login' });
        setOtpInfo(data);
        setStep('otp');
        setCountdown(60);
        toast({ title: 'Code sent', description: `via ${data.channel} to ${data.masked}` });
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Could not send code. Try again.';
      toast({ title: 'Failed to send', description: msg });
    } finally {
      setSending(false);
    }
  };

  const onVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({ title: 'Enter the 6-digit code' });
      return;
    }
    setVerifying(true);
    try {
      if (otpChannel === 'phone') {
        await verifyPhoneOtpCode(otp, { name: isSignup ? name : undefined, referralCode });
      } else {
        const channel = otpChannel === 'whatsapp' ? 'whatsapp' : 'email';
        await verifyOtp({
          identifier,
          code: otp,
          channel: channel,
          name: isSignup ? name : undefined,
          referral_code: referralCode,
        });
      }
      toast({ title: 'Our Ambition. Our Guidance. No Frontiers', description: 'You are signed in.' });
      navigate(nextUrl, { replace: true });
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Invalid code. Try again.';
      toast({ title: 'Verification failed', description: msg });
    } finally {
      setVerifying(false);
    }
  };

  const onResend = async () => {
    if (countdown > 0 || sending) return;
    await onSendOtp();
  };

  const placeholder = otpChannel === 'email' ? 'you@example.com' : '+91 98765 43210';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="relative rounded-2xl bg-white border border-[hsl(var(--border))] shadow-sm p-6 sm:p-8"
    >
      <div className="eyebrow flex items-center gap-1.5">
        <ShieldCheck className="w-4 h-4" aria-hidden="true" /> Secure access
      </div>
      <h1 className="mt-3 font-display font-bold text-[28px] sm:text-[32px] leading-tight tracking-[-0.02em] text-[hsl(var(--blue-900))]">
        {step === 'otp'
          ? 'Enter the verification code'
          : isSignup
            ? 'Create your account'
            : 'Sign in to We Hive'}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        {step === 'otp'
          ? `Code sent to ${otpInfo?.masked || identifier}`
          : tab === 'emailpwd'
            ? isSignup ? 'Create account with email and password.' : 'Sign in with your email and password.'
            : `We'll send a code via ${otpChannel === 'email' ? 'email' : otpChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}.`}
      </p>

      {step === 'input' ? (
        <div className="mt-6 space-y-5">
          <div>
            <TabsInline value={tab} onChange={setTab} tabs={allowedTabs} />
          </div>

          {tab === 'emailpwd' ? (
            <form onSubmit={onEmailPwdSubmit} className="space-y-4">
              {isSignup && (
                <div>
                  <label htmlFor="authcard-your-name" className={LABEL_CLS}>Your name</label>
                  <input id="authcard-your-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma"
                    className={INPUT_CLS} />
                </div>
              )}
              <div>
                <label htmlFor="authcard-email-address" className={LABEL_CLS}>Email address</label>
                <input id="authcard-email-address" type="email" data-testid="email-input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com"
                  className={INPUT_CLS} />
              </div>
              <div>
                <label htmlFor="authcard-password" className={LABEL_CLS}>Password</label>
                <div className="relative">
                  <input id="authcard-password" type={showPassword ? 'text' : 'password'} data-testid="password-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters"
                    className={`${INPUT_CLS} pr-12`} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-[hsl(var(--blue-700))] transition-colors duration-200">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {!isSignup && (
                  <button type="button" onClick={onForgotPassword} disabled={forgotSending}
                    className="mt-2 text-[13px] font-semibold text-[hsl(var(--blue-700))] hover:underline underline-offset-2 disabled:opacity-50">
                    {forgotSending ? 'Sending reset link…' : 'Forgot password?'}
                  </button>
                )}
              </div>
              <Button variant="accent" type="submit" data-testid={isSignup ? "signup-submit" : "login-submit"} disabled={emailPwdLoading}
                className="w-full h-12 rounded-xl text-white font-semibold text-[15px]">
                {emailPwdLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isSignup ? 'Create account' : 'Sign in'}
              </Button>
              {verificationSent && (
                <p className="text-center text-[13px] text-emerald-700 font-semibold">Verification email sent! Check your inbox.</p>
              )}
              <div className="text-center text-[14px] text-muted-foreground">
                {isSignup ? 'Already have an account? ' : 'New to We Hive? '}
                <Link to={isSignup ? '/login' : '/signup'} className={ALT_LINK_CLS}>
                  {isSignup ? 'Sign in' : 'Create account'}
                </Link>
              </div>
            </form>
          ) : (
            <>
              {isSignup && (
                <div>
                  <label htmlFor="authcard-otp-name" className={LABEL_CLS}>Your name</label>
                  <input id="authcard-otp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma"
                    className={INPUT_CLS} />
                </div>
              )}
              <div>
                <label className={LABEL_CLS} htmlFor="authcard-identifier">
                  {otpChannel === 'email' ? 'Email address' : otpChannel === 'whatsapp' ? 'WhatsApp number' : 'Mobile number'}
                </label>
                <input id="authcard-identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={placeholder} inputMode={otpChannel === 'email' ? 'email' : 'tel'}
                  className={INPUT_CLS} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setOtpChannel('email')}
                  aria-pressed={otpChannel === 'email'}
                  className={`flex-1 h-11 rounded-xl border text-[14px] font-semibold transition-colors duration-200 ${
                    otpChannel === 'email'
                      ? 'border-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))]'
                      : 'border-[hsl(var(--border))] bg-white text-muted-foreground hover:text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-200))]'
                  }`}>
                  <Mail className="w-4 h-4 inline-block mr-1.5 -mt-0.5" aria-hidden="true" /> Email
                </button>
                <button type="button" onClick={() => setOtpChannel('whatsapp')}
                  aria-pressed={otpChannel === 'whatsapp'}
                  className={`flex-1 h-11 rounded-xl border text-[14px] font-semibold transition-colors duration-200 ${
                    otpChannel === 'whatsapp'
                      ? 'border-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))]'
                      : 'border-[hsl(var(--border))] bg-white text-muted-foreground hover:text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-200))]'
                  }`}>
                  <MessageSquare className="w-4 h-4 inline-block mr-1.5 -mt-0.5" aria-hidden="true" /> WhatsApp
                </button>

              </div>
              <Button variant="accent" disabled={sending} onClick={onSendOtp}
                className="w-full h-12 rounded-xl text-white font-semibold text-[15px]">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send code'}
              </Button>
              <div className="text-center text-[14px] text-muted-foreground">
                {isSignup ? 'Already have an account? ' : 'New to We Hive? '}
                <Link to={isSignup ? '/login' : '/signup'} className={ALT_LINK_CLS}>
                  {isSignup ? 'Sign in' : 'Create account'}
                </Link>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mt-7 space-y-5">
          <OtpDigits value={otp} onChange={setOtp} />
          <Button variant="accent" disabled={verifying || otp.length !== 6} onClick={onVerifyOtp}
            className="w-full h-12 rounded-xl text-white font-semibold text-[15px]">
            {verifying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="inline-flex items-center gap-1"><Check className="w-4 h-4" /> Verify & continue</span>
            )}
          </Button>
          <div className="flex items-center justify-between text-[13px]">
            <button type="button" onClick={() => setStep('input')}
              className="inline-flex items-center gap-1 h-11 text-[hsl(var(--blue-700))] font-semibold hover:underline underline-offset-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Edit
            </button>
            <button type="button" disabled={sending || countdown > 0} onClick={onResend}
              className="h-11 text-muted-foreground hover:text-[hsl(var(--blue-700))] font-semibold disabled:opacity-60">
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
            </button>
          </div>
        </div>
      )}
      <div id="recaptcha-container" />
      <div className="mt-6 pt-5 border-t border-[hsl(var(--border))] text-center">
        <Link to="/admin/login" className="text-[13px] font-semibold text-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-800))] hover:underline underline-offset-2 transition-colors duration-200">
          Agent? Sign in to your dashboard →
        </Link>
      </div>
      <p className="mt-3 text-[12px] text-muted-foreground text-center leading-relaxed">
        By continuing you agree to our Terms and Privacy Policy.
      </p>
    </motion.div>
  );
}

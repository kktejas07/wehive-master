import { useEffect, useRef, useState } from 'react';
import { Mail, Phone, Loader2, Check, ArrowLeft, ShieldCheck, Chrome, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { useToast } from '../hooks/use-toast';

function TabsInline({ value, onChange }) {
  return (
    <div className="inline-flex p-1 rounded-full bg-[hsl(var(--soft-bg))] border border-black/5">
      {[
        { id: 'google', label: 'Google', Icon: Chrome },
        { id: 'emailpwd', label: 'Email', Icon: Mail },
        { id: 'otp', label: 'OTP', Icon: MessageSquare },
      ].map((opt) => {
        const Icon = opt.Icon;
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-bold transition ${
              active
                ? 'bg-white shadow-sm text-[hsl(var(--blue-700))]'
                : 'text-[hsl(var(--blue-900))]/60 hover:text-[hsl(var(--blue-900))]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
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
    <div className="flex justify-center gap-2">
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
          className="w-12 h-14 rounded-xl border-2 border-black/10 focus:border-[hsl(var(--blue-700))] outline-none text-center text-[22px] font-bold text-[hsl(var(--blue-900))] transition"
        />
      ))}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function AuthCard({ mode, referralCode }) {
  const { sendOtp, verifyOtp, isAuthed } = useAuth();
  const { loginWithGoogle, loginWithEmail, signupWithEmail, firebaseUser, verificationSent, phoneOtp, verifyPhoneOtpCode } = useFirebaseAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('google');
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailPwdLoading, setEmailPwdLoading] = useState(false);
  const timerRef = useRef(null);

  const isSignup = mode === 'signup';

  useEffect(() => {
    if (isAuthed) navigate('/account', { replace: true });
  }, [isAuthed, navigate]);

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

  const onGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast({ title: 'Welcome to We Hive', description: 'Signed in with Google.' });
      navigate('/account', { replace: true });
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        toast({ title: 'Google sign-in failed', description: e.message });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

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
        await loginWithEmail(identifier, password);
        if (firebaseUser && !firebaseUser.emailVerified) {
          toast({ title: 'Verify your email', description: 'Please verify your email address.' });
        } else {
          toast({ title: 'Welcome to We Hive', description: 'Signed in with email.' });
          navigate('/account', { replace: true });
        }
      }
    } catch (e) {
      toast({ title: 'Auth failed', description: e.message });
    } finally {
      setEmailPwdLoading(false);
    }
  };

  const onSendOtp = async () => {
    if (!identifier.trim()) {
      toast({ title: otpChannel === 'email' ? 'Enter your email' : 'Enter your mobile number' });
      return;
    }
    setSending(true);
    try {
      if (otpChannel === 'phone') {
        const info = await phoneOtp(identifier);
        setOtpInfo(info);
        setStep('otp');
        setCountdown(60);
        toast({ title: 'Code sent', description: `via WhatsApp to ${info.masked}` });
      } else {
        const data = await sendOtp({ identifier, channel: 'email', purpose: isSignup ? 'signup' : 'login' });
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
        await verifyPhoneOtpCode(otp);
      } else {
        await verifyOtp({
          identifier,
          code: otp,
          channel: 'email',
          name: isSignup ? name : undefined,
          referral_code: referralCode,
        });
      }
      toast({ title: 'Welcome to We Hive', description: 'You are signed in.' });
      navigate('/account', { replace: true });
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
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative rounded-3xl bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_30px_70px_-30px_rgba(10,44,138,0.45)] p-7 sm:p-9 overflow-hidden"
    >
      <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none">
        <motion.div
          animate={{ x: [0, 20, -10, 0], y: [0, -10, 15, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -right-20 h-[280px] w-[280px] rounded-full bg-[hsl(var(--blue-50))] blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -15, 10, 0], y: [0, 10, -15, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-24 -left-24 h-[260px] w-[260px] rounded-full bg-[#FEE5E7] blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]"
      >
        <ShieldCheck className="w-3.5 h-3.5" /> Secure access
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="mt-2 font-display font-extrabold text-[30px] tracking-[-0.025em] text-[hsl(var(--blue-900))]"
      >
        {step === 'otp'
          ? 'Enter the verification code'
          : isSignup
            ? 'Create your account'
            : 'Sign in to We Hive'}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.22 }}
        className="mt-1.5 text-[14px] text-[hsl(var(--blue-900))]/60"
      >
        {step === 'otp'
          ? `Code sent to ${otpInfo?.masked || identifier}`
          : tab === 'google'
            ? 'Quick one-click sign in with your Google account.'
            : tab === 'emailpwd'
              ? isSignup ? 'Create account with email and password.' : 'Sign in with your email and password.'
              : `We'll send a code via ${otpChannel === 'email' ? 'email' : 'WhatsApp'}.`}
      </motion.p>

      {step === 'input' ? (
        <div className="mt-6 space-y-5">
          <div className="flex justify-center">
            <TabsInline value={tab} onChange={setTab} />
          </div>

          {tab === 'google' ? (
            <div className="space-y-4">
              <Button disabled={googleLoading} onClick={onGoogleLogin} variant="outline"
                className="w-full h-12 rounded-full border-2 border-black/10 font-bold text-[15px] flex items-center gap-3 hover:bg-[hsl(var(--soft-bg))]">
                {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
                Continue with Google
              </Button>
              <div className="text-center text-[13px] text-[hsl(var(--blue-900))]/60">
                {isSignup ? 'Already have an account? ' : 'New to We Hive? '}
                <Link to={isSignup ? '/login' : '/signup'} className="font-bold text-[hsl(var(--blue-700))] hover:underline">
                  {isSignup ? 'Sign in' : 'Create account'}
                </Link>
              </div>
            </div>
          ) : tab === 'emailpwd' ? (
            <form onSubmit={onEmailPwdSubmit} className="space-y-4">
              {isSignup && (
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/60 mb-1.5">Your name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma"
                    className="w-full h-12 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[15px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/40 transition bg-white" />
                </div>
              )}
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/60 mb-1.5">Email address</label>
                <input type="email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com"
                  className="w-full h-12 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[15px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/40 transition bg-white" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/60 mb-1.5">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters"
                  className="w-full h-12 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[15px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/40 transition bg-white" />
              </div>
              <Button type="submit" disabled={emailPwdLoading}
                className="w-full h-12 rounded-full btn-accent text-white font-bold text-[15px]">
                {emailPwdLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isSignup ? 'Create account' : 'Sign in'}
              </Button>
              {verificationSent && (
                <p className="text-center text-[13px] text-green-600 font-semibold">Verification email sent! Check your inbox.</p>
              )}
              <div className="text-center text-[13px] text-[hsl(var(--blue-900))]/60">
                {isSignup ? 'Already have an account? ' : 'New to We Hive? '}
                <Link to={isSignup ? '/login' : '/signup'} className="font-bold text-[hsl(var(--blue-700))] hover:underline">
                  {isSignup ? 'Sign in' : 'Create account'}
                </Link>
              </div>
            </form>
          ) : (
            <>
              {isSignup && (
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/60 mb-1.5">Your name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma"
                    className="w-full h-12 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[15px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/40 transition bg-white" />
                </div>
              )}
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/60 mb-1.5">
                  {otpChannel === 'email' ? 'Email address' : 'Mobile number'}
                </label>
                <input value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={placeholder} inputMode={otpChannel === 'email' ? 'email' : 'tel'}
                  className="w-full h-12 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[15px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/40 transition bg-white" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setOtpChannel('email')}
                  className={`flex-1 h-10 rounded-full text-[12px] font-bold transition ${
                    otpChannel === 'email'
                      ? 'bg-[hsl(var(--blue-700))] text-white'
                      : 'bg-black/5 text-[hsl(var(--blue-900))]/60 hover:bg-black/10'
                  }`}>
                  <Mail className="w-3.5 h-3.5 inline-block mr-1" /> Email
                </button>
                <button type="button" onClick={() => setOtpChannel('phone')}
                  className={`flex-1 h-10 rounded-full text-[12px] font-bold transition ${
                    otpChannel === 'phone'
                      ? 'bg-[hsl(var(--blue-700))] text-white'
                      : 'bg-black/5 text-[hsl(var(--blue-900))]/60 hover:bg-black/10'
                  }`}>
                  <Phone className="w-3.5 h-3.5 inline-block mr-1" /> WhatsApp
                </button>
              </div>
              <Button disabled={sending} onClick={onSendOtp}
                className="w-full h-12 rounded-full btn-accent text-white font-bold text-[15px]">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send code'}
              </Button>
              <div className="text-center text-[13px] text-[hsl(var(--blue-900))]/60">
                {isSignup ? 'Already have an account? ' : 'New to We Hive? '}
                <Link to={isSignup ? '/login' : '/signup'} className="font-bold text-[hsl(var(--blue-700))] hover:underline">
                  {isSignup ? 'Sign in' : 'Create account'}
                </Link>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mt-7 space-y-5">
          <OtpDigits value={otp} onChange={setOtp} />
          <Button disabled={verifying || otp.length !== 6} onClick={onVerifyOtp}
            className="w-full h-12 rounded-full btn-primary text-white font-bold text-[15px]">
            {verifying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="inline-flex items-center gap-1"><Check className="w-4 h-4" /> Verify & continue</span>
            )}
          </Button>
          <div className="flex items-center justify-between text-[13px]">
            <button onClick={() => setStep('input')}
              className="inline-flex items-center gap-1 text-[hsl(var(--blue-700))] font-bold hover:underline">
              <ArrowLeft className="w-3.5 h-3.5" /> Edit
            </button>
            <button disabled={sending || countdown > 0} onClick={onResend}
              className="text-[hsl(var(--blue-900))]/65 hover:text-[hsl(var(--blue-700))] font-semibold disabled:opacity-50">
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
            </button>
          </div>
        </div>
      )}
      <div id="recaptcha-container" />
      <div className="mt-5 pt-4 border-t border-black/5 text-center">
        <Link to="/admin/login" className="text-[12px] font-bold text-[hsl(var(--blue-700))]/60 hover:text-[hsl(var(--blue-700))] transition-colors">
          Agent? Sign in to your dashboard →
        </Link>
      </div>
      <p className="mt-4 text-[11px] text-[hsl(var(--blue-900))]/45 text-center leading-relaxed">
        By continuing you agree to our Terms and Privacy Policy.
      </p>
    </motion.div>
  );
}

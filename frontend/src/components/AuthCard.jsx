import { useEffect, useRef, useState } from 'react';
import { Mail, Loader2, Check, ArrowLeft, ShieldCheck, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const INPUT_CLS = 'w-full h-12 rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-[16px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/45 outline-none transition-colors duration-200 hover:border-[hsl(var(--blue-200))] focus:border-[hsl(var(--blue-700))] focus:ring-[3px] focus:ring-[hsl(var(--blue-700))]/20';
const LABEL_CLS = 'block text-[14px] font-semibold text-[hsl(var(--blue-900))] mb-1.5';
const ALT_LINK_CLS = 'font-semibold text-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-800))] hover:underline underline-offset-2';

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

export default function AuthCard({ mode, referralCode }) {
  const { sendOtp, verifyOtp, isAuthed } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get('next');
  const isValidRedirect = (url) => url && url.startsWith('/') && !url.startsWith('//');
  const nextUrl = isValidRedirect(rawNext) ? rawNext : '/account';
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [otpChannel, setOtpChannel] = useState('email');
  const [step, setStep] = useState('input');
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpInfo, setOtpInfo] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  const isSignup = mode === 'signup';

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

  const onSendOtp = async () => {
    if (!identifier.trim()) {
      toast({ title: otpChannel === 'email' ? 'Enter your email' : 'Enter your WhatsApp number' });
      return;
    }
    setSending(true);
    try {
      const data = await sendOtp({ identifier, channel: otpChannel, purpose: isSignup ? 'signup' : 'login' });
      setOtpInfo(data);
      setStep('otp');
      setCountdown(60);
      toast({ title: 'Code sent', description: `via ${data.channel} to ${data.masked}` });
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
      await verifyOtp({
        identifier,
        code: otp,
        channel: otpChannel,
        name: isSignup ? name : undefined,
        referral_code: referralCode,
      });
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
          : `We'll send a code via ${otpChannel === 'email' ? 'email' : 'WhatsApp'}.`}
      </p>

      {step === 'input' ? (
        <div className="mt-6 space-y-5">
          {isSignup && (
            <div>
              <label htmlFor="authcard-otp-name" className={LABEL_CLS}>Your name</label>
              <input id="authcard-otp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma"
                className={INPUT_CLS} />
            </div>
          )}
          <div>
            <label className={LABEL_CLS} htmlFor="authcard-identifier">
              {otpChannel === 'email' ? 'Email address' : 'WhatsApp number'}
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

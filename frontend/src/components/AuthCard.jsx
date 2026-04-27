import { useEffect, useRef, useState } from 'react';
import { Mail, Phone, Loader2, Check, ArrowLeft, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

function TabsInline({ value, onChange }) {
  return (
    <div className="inline-flex p-1 rounded-full bg-[hsl(var(--soft-bg))] border border-black/5">
      {[
        { id: 'phone', label: 'Mobile', Icon: Phone },
        { id: 'email', label: 'Email', Icon: Mail },
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
  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={`otp-${i}`}
          ref={(el) => (refs.current[i] = el)}
          value={value[i] || ''}
          onChange={(e) => handle(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          inputMode="numeric"
          maxLength={1}
          className="w-12 h-14 rounded-xl border-2 border-black/10 focus:border-[hsl(var(--blue-700))] outline-none text-center text-[22px] font-bold text-[hsl(var(--blue-900))] transition"
        />
      ))}
    </div>
  );
}

export default function AuthCard({ mode }) {
  const { sendOtp, verifyOtp, isAuthed } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('phone');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState('input');
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpInfo, setOtpInfo] = useState(null);

  const isSignup = mode === 'signup';

  useEffect(() => {
    if (isAuthed) navigate('/account', { replace: true });
  }, [isAuthed, navigate]);

  const onSend = async () => {
    if (!identifier.trim()) {
      toast({ title: 'Enter your ' + (tab === 'phone' ? 'mobile number' : 'email') });
      return;
    }
    setSending(true);
    try {
      const data = await sendOtp({ identifier, purpose: isSignup ? 'signup' : 'login' });
      setOtpInfo(data);
      setStep('otp');
      if (data.dev_code) toast({ title: 'Dev OTP', description: `Mock code: ${data.dev_code}` });
      else toast({ title: 'Code sent', description: `via ${data.channel} to ${data.masked}` });
    } catch (e) {
      toast({ title: 'Could not send code', description: e?.response?.data?.detail || 'Try again' });
    } finally {
      setSending(false);
    }
  };

  const onVerify = async () => {
    if (otp.length !== 6) {
      toast({ title: 'Enter the 6\u2011digit code' });
      return;
    }
    setVerifying(true);
    try {
      await verifyOtp({ identifier, code: otp, name: isSignup ? name : undefined });
      toast({ title: 'Welcome to We Hive', description: 'You are signed in.' });
      navigate('/account', { replace: true });
    } catch (e) {
      toast({ title: 'Verification failed', description: e?.response?.data?.detail || 'Invalid code' });
    } finally {
      setVerifying(false);
    }
  };

  const placeholder = tab === 'phone' ? '+91 9XXXX XXXXX' : 'you@example.com';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative rounded-3xl bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_30px_70px_-30px_rgba(10,44,138,0.45)] p-7 sm:p-9 overflow-hidden"
    >
      {/* Animated gradient backdrop */}
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
        {step === 'input'
          ? isSignup
            ? 'Create your account'
            : 'Sign in to We Hive'
          : 'Enter the verification code'}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.22 }}
        className="mt-1.5 text-[14px] text-[hsl(var(--blue-900))]/60"
      >
        {step === 'input'
          ? 'We will send a 6\u2011digit code by ' + (tab === 'phone' ? 'WhatsApp / SMS' : 'email') + '.'
          : `Code sent to ${otpInfo?.masked || identifier}`}
      </motion.p>
      {step === 'input' ? (
        <div className="mt-6 space-y-5">
          <div className="flex justify-center">
            <TabsInline value={tab} onChange={setTab} />
          </div>
          {isSignup && (
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/60 mb-1.5">
                Your name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                className="w-full h-12 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[15px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/40 transition"
              />
            </div>
          )}
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/60 mb-1.5">
              {tab === 'phone' ? 'Mobile number' : 'Email address'}
            </label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={placeholder}
              inputMode={tab === 'phone' ? 'tel' : 'email'}
              className="w-full h-12 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[15px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/40 transition"
            />
          </div>
          <Button
            disabled={sending}
            onClick={onSend}
            className="w-full h-12 rounded-full btn-accent text-white font-bold text-[15px]"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send code'}
          </Button>
          <div className="text-center text-[13px] text-[hsl(var(--blue-900))]/60">
            {isSignup ? 'Already have an account? ' : 'New to We Hive? '}
            <Link
              to={isSignup ? '/login' : '/signup'}
              className="font-bold text-[hsl(var(--blue-700))] hover:underline"
            >
              {isSignup ? 'Sign in' : 'Create account'}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-7 space-y-5">
          <OtpDigits value={otp} onChange={setOtp} />
          <Button
            disabled={verifying || otp.length !== 6}
            onClick={onVerify}
            className="w-full h-12 rounded-full btn-primary text-white font-bold text-[15px]"
          >
            {verifying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="inline-flex items-center gap-1">
                <Check className="w-4 h-4" /> Verify & continue
              </span>
            )}
          </Button>
          <div className="flex items-center justify-between text-[13px]">
            <button
              onClick={() => setStep('input')}
              className="inline-flex items-center gap-1 text-[hsl(var(--blue-700))] font-bold hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              disabled={sending}
              onClick={onSend}
              className="text-[hsl(var(--blue-900))]/65 hover:text-[hsl(var(--blue-700))] font-semibold disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        </div>
      )}
      <p className="mt-6 text-[11px] text-[hsl(var(--blue-900))]/45 text-center leading-relaxed">
        By continuing you agree to our Terms and Privacy Policy.
      </p>
    </motion.div>
  );
}

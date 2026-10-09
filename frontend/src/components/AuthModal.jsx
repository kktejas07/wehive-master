import { useEffect, useRef, useState, useMemo } from 'react';
import { X, Mail, Phone, ArrowLeft, Loader2, Check, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { useToast } from '../hooks/use-toast';
import { getAuthSchema } from '../lib/schemas';

function useCountdown(seconds, restartKey) {
  const [t, setT] = useState(seconds);
  useEffect(() => { setT(seconds); }, [seconds, restartKey]);
  useEffect(() => {
    if (t <= 0) return;
    const id = setInterval(() => setT((v) => v - 1), 1000);
    return () => clearInterval(id);
  }, [t]);
  return t;
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
    if (pasted) { e.preventDefault(); onChange(pasted); }
  };
  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length }).map((_, i) => (
        <input key={`d-${i}`} ref={(el) => (refs.current[i] = el)} value={value[i] || ''}
          onChange={(e) => handle(i, e.target.value)} onKeyDown={(e) => handleKey(i, e)}
          onPaste={i === 0 ? handlePaste : undefined} inputMode="numeric" autoComplete="one-time-code" maxLength={1}
          className="w-12 h-14 sm:w-12 sm:h-14 rounded-xl border-2 border-black/10 focus:border-[hsl(var(--blue-700))] outline-none text-center text-[22px] font-bold text-[hsl(var(--blue-900))] transition" />
      ))}
    </div>
  );
}

export default function AuthModal() {
  const navigate = useNavigate();
  const { authOpen, authMode, closeAuth, sendOtp, verifyOtp, setAuthMode } = useAuth();
  const { phoneOtp, verifyPhoneOtpCode } = useFirebaseAuth();
  const { toast } = useToast();
  const [channel, setChannel] = useState('email');
  const [step, setStep] = useState('input');
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpInfo, setOtpInfo] = useState(null);
  const [resendKey, setResendKey] = useState(0);
  const cd = useCountdown(60, resendKey);

  const isSignup = authMode === 'signup';
  const schema = useMemo(() => getAuthSchema(isSignup, channel), [isSignup, channel]);

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', identifier: '' } });
  const { register, handleSubmit, formState: { errors }, watch } = form;
  const identifierValue = watch('identifier');

  useEffect(() => {
    if (authOpen) {
      setStep('input'); setOtp(''); setChannel('email'); setOtpInfo(null);
      form.reset({ name: '', identifier: '' });
    }
  }, [authOpen, authMode]);

  if (!authOpen) return null;

  const onSend = handleSubmit(async (data) => {
    setSending(true);
    try {
      if (channel === 'phone') {
        const info = await phoneOtp(data.identifier);
        setOtpInfo(info);
        setStep('otp');
        setResendKey((k) => k + 1);
        toast({ title: 'Code sent', description: `via WhatsApp to ${info.masked}` });
      } else {
        const result = await sendOtp({
          identifier: data.identifier,
          channel: 'email',
          purpose: isSignup ? 'signup' : 'login',
        });
        setOtpInfo(result);
        setStep('otp');
        setResendKey((k) => k + 1);
        toast({ title: 'Code sent', description: `via ${result.channel} to ${result.masked}` });
      }
    } catch (e) {
      toast({ title: 'Could not send code', description: e?.response?.data?.detail || e?.message || 'Try again' });
    } finally {
      setSending(false);
    }
  });

  const onVerify = async () => {
    if (otp.length !== 6) { toast({ title: 'Enter the 6-digit code' }); return; }
    setVerifying(true);
    try {
      const formData = form.getValues();
      if (channel === 'phone') {
        await verifyPhoneOtpCode(otp, { name: isSignup ? formData.name : undefined });
      } else {
        await verifyOtp({
          identifier: formData.identifier,
          code: otp,
          channel: 'email',
          name: isSignup ? formData.name : undefined,
        });
      }
      toast({ title: 'Our Ambition. Our Guidance. No Frontiers', description: 'You are signed in.' });
      closeAuth();
      navigate('/account');
    } catch (e) {
      toast({ title: 'Verification failed', description: e?.response?.data?.detail || e?.message || 'Invalid code' });
    } finally {
      setVerifying(false);
    }
  };

  const onResend = async () => {
    if (cd > 0 || sending) return;
    const data = form.getValues();
    await onSend(data);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[hsl(var(--blue-900))]/45 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeAuth}>
      <div onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl bg-white shadow-[0_30px_70px_-30px_rgba(10,44,138,0.6)] overflow-hidden">
        <button onClick={closeAuth}
          className="absolute top-4 right-4 h-9 w-9 rounded-full hover:bg-black/5 inline-flex items-center justify-center text-[hsl(var(--blue-900))]/55">
          <X className="w-4 h-4" />
        </button>
        <div className="p-7 sm:p-9">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure access
          </div>
          <h2 className="mt-2 font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
            {step === 'input' ? (isSignup ? 'Create your account' : 'Sign in to We Hive') : 'Enter the verification code'}
          </h2>
          <p className="mt-1.5 text-[14px] text-[hsl(var(--blue-900))]/60">
            {step === 'input' ? `We'll send a code via ${channel === 'email' ? 'email' : 'WhatsApp'}.`
              : `Code sent to ${otpInfo?.masked || identifierValue}`}
          </p>

          {step === 'input' ? (
            <form onSubmit={onSend} className="mt-6 space-y-5">
              {isSignup && (
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/60 mb-1.5">Your name</label>
                  <input {...register('name')} placeholder="e.g. Priya Sharma"
                    className="w-full h-12 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[15px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/40 transition bg-white" />
                  {errors.name && <p className="mt-1 text-[12px] text-red-500">{errors.name.message}</p>}
                </div>
              )}
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/60 mb-1.5">
                  {channel === 'email' ? 'Email address' : 'Mobile number'}
                </label>
                <input {...register('identifier')} placeholder={channel === 'email' ? 'you@example.com' : '+91 98765 43210'}
                  inputMode={channel === 'email' ? 'email' : 'tel'}
                  className={`w-full h-12 rounded-xl border ${errors.identifier ? 'border-red-500' : 'border-black/10'} focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[15px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/40 transition bg-white`} />
                {errors.identifier && <p className="mt-1 text-[12px] text-red-500">{errors.identifier.message}</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setChannel('email')}
                  className={`flex-1 h-10 rounded-full text-[12px] font-bold transition ${
                    channel === 'email' ? 'bg-[hsl(var(--blue-700))] text-white' : 'bg-black/5 text-[hsl(var(--blue-900))]/60 hover:bg-black/10'}`}>
                  <Mail className="w-3.5 h-3.5 inline-block mr-1" /> Email
                </button>
                <button type="button" onClick={() => setChannel('phone')}
                  className={`flex-1 h-10 rounded-full text-[12px] font-bold transition ${
                    channel === 'phone' ? 'bg-[hsl(var(--blue-700))] text-white' : 'bg-black/5 text-[hsl(var(--blue-900))]/60 hover:bg-black/10'}`}>
                  <Phone className="w-3.5 h-3.5 inline-block mr-1" /> WhatsApp
                </button>
              </div>
              <Button type="submit" disabled={sending}
                className="w-full h-12 rounded-full btn-accent text-white font-bold text-[15px]">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send code'}
              </Button>
              <div className="text-center text-[13px] text-[hsl(var(--blue-900))]/60">
                {isSignup ? 'Already have an account? ' : 'New to We Hive? '}
                <button type="button" onClick={() => setAuthMode(isSignup ? 'login' : 'signup')}
                  className="font-bold text-[hsl(var(--blue-700))] hover:underline">
                  {isSignup ? 'Sign in' : 'Create account'}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-7 space-y-5">
              <OtpDigits value={otp} onChange={setOtp} />
              <Button disabled={verifying || otp.length !== 6} onClick={onVerify}
                className="w-full h-12 rounded-full btn-primary text-white font-bold text-[15px]">
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> :
                  <span className="inline-flex items-center gap-1"><Check className="w-4 h-4" /> Verify & continue</span>}
              </Button>
              <div className="flex items-center justify-between text-[13px]">
                <button type="button" onClick={() => setStep('input')}
                  className="inline-flex items-center gap-1 text-[hsl(var(--blue-700))] font-bold hover:underline">
                  <ArrowLeft className="w-3.5 h-3.5" /> Edit
                </button>
                <button type="button" disabled={cd > 0 || sending} onClick={onResend}
                  className="text-[hsl(var(--blue-900))]/65 hover:text-[hsl(var(--blue-700))] font-semibold disabled:opacity-50">
                  {cd > 0 ? `Resend in ${cd}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}
          <div id="recaptcha-container" />
          <div className="mt-4 pt-3 border-t border-black/5 text-center">
            <Link to="/admin/login" onClick={closeAuth} className="text-[12px] font-bold text-[hsl(var(--blue-700))]/60 hover:text-[hsl(var(--blue-700))] transition-colors">
              Agent? Sign in to your dashboard →
            </Link>
          </div>
          <p className="mt-4 text-[11px] text-[hsl(var(--blue-900))]/45 text-center leading-relaxed">
            By continuing you agree to our Terms and acknowledge our Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

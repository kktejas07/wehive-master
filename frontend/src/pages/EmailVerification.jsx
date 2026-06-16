import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, Check, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { applyActionCode } from 'firebase/auth';
import { initFirebase } from '../lib/firebase';

export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');

  useEffect(() => {
    if (!oobCode || mode !== 'verifyEmail') {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    (async () => {
      try {
        const { auth } = await initFirebase();
        await applyActionCode(auth, oobCode);
        setStatus('success');
      } catch (e) {
        setStatus('error');
        if (e.code === 'auth/invalid-action-code') {
          setMessage('This link has expired or already been used.');
        } else {
          setMessage(e.message || 'Verification failed.');
        }
      }
    })();
  }, [oobCode, mode]);

  return (
    <div className="bg-white min-h-screen">
      <main className="min-h-[calc(100vh-72px)] pt-32 pb-20 bg-[hsl(var(--soft-bg))] flex items-center justify-center">
        <div className="max-w-md mx-auto px-5 w-full">
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
              <ShieldCheck className="w-3.5 h-3.5" /> Account verification
            </motion.div>

            <div className="mt-8 text-center">
              {status === 'verifying' && (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--blue-700))] flex items-center justify-center mx-auto shadow-lg shadow-[hsl(var(--blue-700))]/20">
                    <Loader2 className="w-7 h-7 text-white animate-spin" />
                  </div>
                  <h2 className="mt-5 font-display font-extrabold text-[22px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
                    Verifying your email
                  </h2>
                  <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60">
                    Please wait while we verify your email address...
                  </p>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <Check className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="mt-5 font-display font-extrabold text-[22px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
                    Email verified
                  </h2>
                  <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60">
                    Your email has been verified. You can now sign in.
                  </p>
                  <Link to="/login" className="mt-6 inline-flex items-center gap-2 rounded-full btn-primary text-white h-12 px-8 font-bold">
                    Sign in <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-red-500 flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
                    <X className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="mt-5 font-display font-extrabold text-[22px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
                    Verification failed
                  </h2>
                  <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60">
                    {message || 'Something went wrong.'}
                  </p>
                  <div className="mt-6 flex flex-col gap-3">
                    <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-full btn-primary text-white h-12 px-8 font-bold">
                      Try signing in <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-black/5 text-center">
              <Link to="/" className="text-[13px] font-bold text-[hsl(var(--blue-700))]/60 hover:text-[hsl(var(--blue-700))]">
                Back to home
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

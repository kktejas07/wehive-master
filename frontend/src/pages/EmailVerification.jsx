import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Check, ShieldCheck, Mail, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { applyActionCode } from 'firebase/auth';
import { initFirebase } from '../lib/firebase';

export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

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

  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (status === 'success' && countdown === 0) {
      navigate('/login', { replace: true });
    }
  }, [status, countdown, navigate]);

  const H2 = 'mt-6 font-display font-bold text-[24px] leading-tight tracking-[-0.02em] text-[hsl(var(--blue-900))]';
  const fade = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, transition: { duration: 0.25, ease: 'easeOut' } };

  return (
    <div className="bg-white min-h-screen">
      <main className="min-h-screen flex items-center justify-center bg-[hsl(var(--soft-bg))] px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative rounded-2xl bg-white border border-[hsl(var(--border))] shadow-sm p-6 sm:p-10 max-w-md w-full"
        >
          <div className="eyebrow flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" /> Account verification
          </div>

          <div aria-live="polite">
          <AnimatePresence mode="wait">
            {status === 'verifying' && (
              <motion.div key="verifying" {...fade} className="mt-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--blue-50))] flex items-center justify-center mx-auto">
                  <Loader2 className="w-7 h-7 text-[hsl(var(--blue-700))] animate-spin" aria-hidden="true" />
                </div>
                <h1 className={H2}>Verifying your email</h1>
                <p className="mt-2 text-[15px] text-muted-foreground">
                  Please wait while we verify your email address...
                </p>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div key="success" {...fade} className="mt-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-emerald-700" aria-hidden="true" />
                </div>
                <h1 className={H2}>Email verified</h1>
                <p className="mt-2 text-[15px] text-muted-foreground">
                  Your email has been verified successfully.
                </p>
                <p className="mt-3 text-[13px] text-muted-foreground">
                  Redirecting to sign in{countdown > 0 ? ` in ${countdown}s...` : '...'}
                </p>
                <div className="mt-6">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 rounded-xl btn-accent h-12 px-6 font-semibold"
                  >
                    Sign in now <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div key="error" {...fade} className="mt-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
                  <RefreshCw className="w-7 h-7 text-amber-700" aria-hidden="true" />
                </div>
                <h1 className={H2}>Link expired or used</h1>
                <p className="mt-2 text-[15px] text-muted-foreground">
                  {message || 'This verification link has expired or was already used.'}
                </p>
                <p className="mt-3 text-[14px] text-muted-foreground">
                  Sign in with your email and password to receive a new verification link automatically.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-xl btn-accent h-12 px-6 font-semibold">
                    <Mail className="w-4 h-4" aria-hidden="true" /> Sign in to get new link
                  </Link>
                  <Link to="/signup" className="text-[14px] link-primary">
                    Don't have an account? Sign up
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>

          <div className="mt-8 pt-5 border-t border-[hsl(var(--border))] text-center">
            <Link to="/" className="text-[14px] font-semibold text-muted-foreground hover:text-[hsl(var(--blue-700))] transition-colors duration-200">
              Back to home
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

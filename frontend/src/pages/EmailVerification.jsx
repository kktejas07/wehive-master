import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Check, X, ShieldCheck, Sparkles, Mail, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { applyActionCode } from 'firebase/auth';
import { initFirebase } from '../lib/firebase';

const CONFETTI_COLORS = [
  '#e0212c', '#2563eb', '#16a34a', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

function ConfettiBurst() {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 8 + 4,
    delay: Math.random() * 0.5,
    duration: Math.random() * 1 + 1.5,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, scale: 0, x: '50%', y: '50%' }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], x: `${p.x - 50}%`, y: `${p.y - 50}%`, rotate: p.rotation }}
          transition={{ delay: p.delay, duration: p.duration, ease: 'easeOut' }}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            left: '50%',
            top: '50%',
          }}
        />
      ))}
    </div>
  );
}

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

  return (
    <div className="bg-white min-h-screen">
      <main className="min-h-screen flex items-center justify-center bg-[hsl(var(--soft-bg))] px-5 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative rounded-3xl bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_30px_70px_-30px_rgba(10,44,138,0.45)] p-8 sm:p-10 overflow-hidden max-w-md w-full"
        >
          {status === 'success' && <ConfettiBurst />}

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

          <AnimatePresence mode="wait">
            {status === 'verifying' && (
              <motion.div
                key="verifying"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-8 text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-20 h-20 rounded-2xl bg-[hsl(var(--blue-700))] flex items-center justify-center mx-auto shadow-lg shadow-[hsl(var(--blue-700))]/20"
                >
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </motion.div>
                <h2 className="mt-6 font-display font-extrabold text-[24px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
                  Verifying your email
                </h2>
                <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60">
                  Please wait while we verify your email address...
                </p>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="mt-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
                  className="w-20 h-20 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20"
                >
                  <Check className="w-9 h-9 text-white" />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 font-display font-extrabold text-[24px] tracking-[-0.025em] text-[hsl(var(--blue-900))]"
                >
                  Email verified
                </motion.h2>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-2 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-[14px] text-[hsl(var(--blue-900))]/60">
                    Your email has been verified successfully
                  </span>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-3 text-[13px] text-[hsl(var(--blue-900))]/45"
                >
                  Redirecting to sign in{countdown > 0 ? ` in ${countdown}s...` : '...'}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="mt-5"
                >
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 rounded-full btn-primary text-white h-12 px-8 font-bold hover:shadow-lg hover:shadow-[hsl(var(--blue-700))]/25 transition-shadow"
                  >
                    Sign in now
                    <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      →
                    </motion.span>
                  </Link>
                </motion.div>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
                  <RefreshCw className="w-9 h-9 text-white" />
                </div>
                <h2 className="mt-6 font-display font-extrabold text-[22px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
                  Link expired or used
                </h2>
                <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60">
                  {message || 'This verification link has expired or was already used.'}
                </p>
                <p className="mt-4 text-[13px] text-[hsl(var(--blue-900))]/45">
                  Sign in with your email and password to receive a new verification link automatically.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-full btn-primary text-white h-12 px-8 font-bold">
                    <Mail className="w-4 h-4" /> Sign in to get new link
                  </Link>
                  <Link to="/signup" className="text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline">
                    Don't have an account? Sign up
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 pt-5 border-t border-black/5 text-center">
            <Link to="/" className="text-[13px] font-bold text-[hsl(var(--blue-700))]/60 hover:text-[hsl(var(--blue-700))]">
              Back to home
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

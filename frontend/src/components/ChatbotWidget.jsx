import { useEffect, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';

const Hive = lazy(() => import('../pages/Hive'));

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-chatbot', handler);
    return () => window.removeEventListener('open-chatbot', handler);
  }, []);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[80] inline-flex items-center justify-center h-14 w-14 rounded-full text-white shadow-[0_15px_40px_-10px_rgba(10,44,138,0.55)]"
        style={{ background: 'linear-gradient(135deg, hsl(var(--blue-700)) 0%, hsl(var(--accent)) 130%)' }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open Hive assistant"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }}>
              <X className="w-5 h-5" />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }}>
              <MessageCircle className="w-6 h-6" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />
        )}
      </motion.button>

      {/* Full-screen Hive overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="hive-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] flex flex-col bg-white"
          >
            {/* Close bar */}
            <div className="flex items-center justify-end px-4 py-2 border-b border-black/5 bg-white/80 backdrop-blur-md shrink-0">
              <button
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-50))] transition"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>

            {/* Hive content */}
            <div className="flex-1 overflow-y-auto">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full text-[hsl(var(--blue-900))]/60">
                  Loading Hive…
                </div>
              }>
                <Hive />
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

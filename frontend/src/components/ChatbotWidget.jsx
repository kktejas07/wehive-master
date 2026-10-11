import { useEffect, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useDialogA11y } from '../hooks/use-dialog-a11y';

const Hive = lazy(() => import('../pages/Hive'));

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const dialogProps = useDialogA11y(open, () => setOpen(false));

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

  // The customer concierge doesn't belong inside the admin console.
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) return null;

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[80] inline-flex items-center justify-center h-14 w-14 rounded-full bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white shadow-lg ring-1 ring-black/5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--blue-700))] focus-visible:ring-offset-2"
        aria-label={open ? 'Close Hive assistant' : 'Open Hive assistant'}
        aria-expanded={open}
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
          <span aria-hidden="true" className="absolute top-0.5 right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
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
            {...dialogProps} className="fixed inset-0 z-[90] flex flex-col bg-white"
          >
            {/* Close bar */}
            <div className="flex items-center justify-end px-4 py-2 border-b border-[hsl(var(--border))] bg-white shrink-0">
              <button
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 h-11 rounded-xl px-4 text-[14px] font-semibold text-[hsl(var(--blue-900))] hover:text-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-50))] transition-colors duration-200"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>

            {/* Hive content */}
            <div className="flex-1 overflow-y-auto">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full text-muted-foreground">
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

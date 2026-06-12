import { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../context/AuthContext';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const DISMISSED_KEY = 'wehive_dismissed_banners';

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); }
  catch { return []; }
}

function dismiss(id) {
  const list = getDismissed();
  if (!list.includes(id)) {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...list, id]));
  }
}

export default function PromoBanner({ className = '' }) {
  const [banners, setBanners] = useState([]);
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    axios.get(`${API}/promotions?promo_type=banner`)
      .then((r) => {
        const dismissed = getDismissed();
        const active = (r.data || []).filter((b) => !dismissed.includes(b.id));
        setBanners(active);
        setVisible(active.map((b) => b.id));
      })
      .catch(() => {});
  }, []);

  const handleDismiss = (id) => {
    dismiss(id);
    setVisible((v) => v.filter((x) => x !== id));
  };

  const shown = banners.filter((b) => visible.includes(b.id));

  if (!shown.length) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <AnimatePresence>
        {shown.map((banner) => (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.25 }}
            className="relative rounded-2xl overflow-hidden"
            style={{ background: banner.bg_color || '#0a2c8a' }}
          >
            {/* Decorative blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20" style={{ background: banner.accent_color || '#e1212c' }} />
              <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full opacity-10" style={{ background: banner.accent_color || '#e1212c' }} />
            </div>

            <div className="relative z-10 flex items-center gap-4 px-5 py-4 flex-wrap">
              {/* Badge */}
              {banner.badge && (
                <span
                  className="shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em]"
                  style={{ background: banner.accent_color || '#e1212c', color: '#fff' }}
                >
                  <Sparkles className="w-3 h-3" />
                  {banner.badge}
                </span>
              )}

              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-white leading-snug">{banner.title}</div>
                {banner.subtitle && (
                  <div className="text-[12.5px] text-white/70 mt-0.5">{banner.subtitle}</div>
                )}
              </div>

              {banner.cta_text && banner.cta_link && (
                <Link
                  to={banner.cta_link}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/20 hover:bg-white/30 px-4 py-2 text-[13px] font-bold text-white transition"
                >
                  {banner.cta_text} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}

              <button
                onClick={() => handleDismiss(banner.id)}
                className="shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

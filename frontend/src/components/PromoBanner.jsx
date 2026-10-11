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
            style={{ background: banner.bg_color || '#2563EB' }}
          >
            <div className="relative flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 flex-wrap">
              {/* Badge */}
              {banner.badge && (
                <span
                  className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold uppercase tracking-[0.14em]"
                  style={{ background: banner.accent_color || '#047857', color: '#fff' }}
                >
                  <Sparkles className="w-3 h-3" />
                  {banner.badge}
                </span>
              )}

              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-white leading-snug">{banner.title}</div>
                {banner.subtitle && (
                  <div className="text-[13px] text-white/85 mt-0.5">{banner.subtitle}</div>
                )}
              </div>

              {banner.cta_text && banner.cta_link && (
                <Link
                  to={banner.cta_link}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-white/90 h-10 px-4 text-[14px] font-semibold text-[hsl(var(--blue-900))] transition-colors"
                >
                  {banner.cta_text} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}

              <button
                onClick={() => handleDismiss(banner.id)}
                className="shrink-0 w-10 h-10 rounded-xl hover:bg-white/15 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

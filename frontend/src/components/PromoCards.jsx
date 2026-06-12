import { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';

// Fallback cards shown when no promotions are live yet
const FALLBACK_CARDS = [
  {
    id: 'fallback-1',
    title: 'Study in Canada — Get ₹5,000 Off',
    subtitle: 'Limited-time offer on Canadian student visa applications. Ends this month.',
    badge: 'Student Offer',
    cta_text: 'Apply Now',
    cta_link: '/universities',
    bg_color: '#0a2c8a',
    accent_color: '#e1212c',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=70',
  },
  {
    id: 'fallback-2',
    title: 'Premium Plan — 50% Off This Week',
    subtitle: 'Unlock AI tools, priority processing, and expert consultant access.',
    badge: 'Flash Sale',
    cta_text: 'Upgrade Now',
    cta_link: '/pricing',
    bg_color: '#7c3aed',
    accent_color: '#f59e0b',
    image_url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=70',
  },
  {
    id: 'fallback-3',
    title: 'Schengen Visa — Express Processing',
    subtitle: 'Get your visa in 5 business days. Germany, France, Italy and more.',
    badge: 'Express',
    cta_text: 'Learn More',
    cta_link: '/',
    bg_color: '#065f46',
    accent_color: '#34d399',
    image_url: 'https://images.unsplash.com/photo-1488085061387-4b4d2b2a5a5a?auto=format&fit=crop&w=600&q=70',
  },
];

function PromoCard({ card, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.45 }}
      className="relative rounded-3xl overflow-hidden flex flex-col min-h-[280px] group"
      style={{ background: card.bg_color || '#0a2c8a' }}
    >
      {/* Background image overlay */}
      {card.image_url && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-25 transition-opacity duration-500"
          style={{ backgroundImage: `url(${card.image_url})` }}
        />
      )}

      {/* Decorative shape */}
      <div
        className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full opacity-15 transition-transform duration-500 group-hover:scale-110"
        style={{ background: card.accent_color || '#e1212c' }}
      />
      <div
        className="absolute -top-6 -left-6 w-28 h-28 rounded-full opacity-10"
        style={{ background: card.accent_color || '#e1212c' }}
      />

      <div className="relative z-10 flex flex-col flex-1 p-7">
        {card.badge && (
          <span
            className="self-start inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] mb-4"
            style={{ background: card.accent_color || '#e1212c', color: '#fff' }}
          >
            <Tag className="w-3 h-3" />
            {card.badge}
          </span>
        )}

        <div className="flex-1">
          <h3 className="font-display font-extrabold text-[22px] sm:text-[26px] tracking-[-0.025em] text-white leading-snug">
            {card.title}
          </h3>
          {card.subtitle && (
            <p className="mt-2 text-[13.5px] text-white/70 leading-relaxed max-w-xs">
              {card.subtitle}
            </p>
          )}
        </div>

        {card.cta_text && card.cta_link && (
          <Link
            to={card.cta_link}
            className="mt-6 self-start inline-flex items-center gap-2 rounded-full bg-white/20 hover:bg-white/30 px-5 py-2.5 text-[13px] font-bold text-white transition group-hover:gap-2.5"
          >
            {card.cta_text}
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </motion.div>
  );
}

export default function PromoCards() {
  const [cards, setCards] = useState(null);

  useEffect(() => {
    axios.get(`${API}/promotions?promo_type=card`)
      .then((r) => setCards(r.data?.length ? r.data : FALLBACK_CARDS))
      .catch(() => setCards(FALLBACK_CARDS));
  }, []);

  const display = cards || FALLBACK_CARDS;

  return (
    <section className="py-16 sm:py-20 bg-[hsl(var(--soft-bg))]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between flex-wrap gap-4 mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Special Offers
            </div>
            <h2 className="font-display font-extrabold text-[26px] sm:text-[38px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
              Exclusive Deals & Promotions
            </h2>
            <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60 max-w-lg">
              Limited-time offers on visa applications, student packages, and premium upgrades.
            </p>
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {display.map((card, i) => (
            <PromoCard key={card.id} card={card} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

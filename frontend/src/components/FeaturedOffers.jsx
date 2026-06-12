'use client';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Sparkles, Sun, Briefcase, GraduationCap, Palmtree, ArrowRight, Star, Clock, CheckCircle2, ShieldCheck, Users, Timer, Zap, Percent, MapPin, Eye } from 'lucide-react';
import { API } from '../context/AuthContext';
import { BRAND } from '../data/mock';

const CATEGORY_MAP = {
  holiday: { label: 'Holiday', icon: Palmtree, gradient: 'from-rose-500 to-pink-600', bgGradient: 'from-rose-50 to-pink-50', borderColor: 'border-rose-200', accent: 'text-rose-600', badge: 'Popular', badgeIcon: Star },
  business: { label: 'Business', icon: Briefcase, gradient: 'from-blue-600 to-indigo-700', bgGradient: 'from-blue-50 to-indigo-50', borderColor: 'border-blue-200', accent: 'text-blue-600', badge: 'Priority', badgeIcon: Zap },
  student: { label: 'Student', icon: GraduationCap, gradient: 'from-emerald-600 to-teal-700', bgGradient: 'from-emerald-50 to-teal-50', borderColor: 'border-emerald-200', accent: 'text-emerald-600', badge: 'Scholarship', badgeIcon: Star },
  tourist: { label: 'Limited Offer', icon: Sparkles, gradient: 'from-amber-500 to-orange-600', bgGradient: 'from-amber-50 to-orange-50', borderColor: 'border-amber-200', accent: 'text-amber-600', badge: '40% OFF', badgeIcon: Percent },
  promo: { label: 'Limited Offer', icon: Sparkles, gradient: 'from-amber-500 to-orange-600', bgGradient: 'from-amber-50 to-orange-50', borderColor: 'border-amber-200', accent: 'text-amber-600', badge: '40% OFF', badgeIcon: Percent },
};

const FALLBACK_COUNTRIES = {
  holiday: [
    { name: 'Maldives', flag: '🇲🇻', price: '₹5,999' },
    { name: 'Bali', flag: '🇮🇩', price: '₹3,999' },
    { name: 'Dubai', flag: '🇦🇪', price: '₹4,999' },
    { name: 'Seychelles', flag: '🇸🇨', price: '₹8,999' },
    { name: 'Mauritius', flag: '🇲🇺', price: '₹7,499' },
  ],
  business: [
    { name: 'USA', flag: '🇺🇸', price: '₹15,999' },
    { name: 'UK', flag: '🇬🇧', price: '₹12,499' },
    { name: 'UAE', flag: '🇦🇪', price: '₹6,999' },
    { name: 'Singapore', flag: '🇸🇬', price: '₹4,999' },
    { name: 'Germany', flag: '🇩🇪', price: '₹11,999' },
  ],
  student: [
    { name: 'USA', flag: '🇺🇸', price: '₹12,999' },
    { name: 'Canada', flag: '🇨🇦', price: '₹10,999' },
    { name: 'UK', flag: '🇬🇧', price: '₹11,499' },
    { name: 'Australia', flag: '🇦🇺', price: '₹13,999' },
    { name: 'Germany', flag: '🇩🇪', price: '₹7,999' },
  ],
  tourist: [
    { name: 'Japan', flag: '🇯🇵', price: '₹6,999' },
    { name: 'Thailand', flag: '🇹🇭', price: '₹4,999' },
    { name: 'Singapore', flag: '🇸🇬', price: '₹4,999' },
    { name: 'UAE', flag: '🇦🇪', price: '₹5,999' },
    { name: 'Spain', flag: '🇪🇸', price: '₹9,999' },
  ],
};

const FEATURED_OFFERS_FALLBACK = [
  {
    category: 'Limited Offer',
    icon: Sparkles,
    title: 'Summer Getaway Deals',
    description: 'Explore visa packages for top summer destinations with up to 40% off',
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-50 to-orange-50',
    borderColor: 'border-amber-200',
    accent: 'text-amber-600',
    badge: '40% OFF',
    badgeIcon: Percent,
    countries: [
      { name: 'Greece', flag: '🇬🇷', price: '₹8,999' },
      { name: 'Spain', flag: '🇪🇸', price: '₹9,499' },
      { name: 'Italy', flag: '🇮🇹', price: '₹9,999' },
      { name: 'Portugal', flag: '🇵🇹', price: '₹7,999' },
      { name: 'Thailand', flag: '🇹🇭', price: '₹4,999' },
    ],
    validUntil: '2026-08-31',
    daysLeft: 82,
    perks: [
      { icon: Timer, text: 'Express 3-5 days' },
      { icon: ShieldCheck, text: 'Free insurance' },
      { icon: Zap, text: 'Multi-city option' },
    ],
    rating: 4.8,
    reviews: 2847,
    bookings: '1.2K+',
    priceFrom: '₹4,999',
    processing: '3-5 days',
    highlight: true,
    testimonial: '"Best summer deal I got!"',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&auto=format',
  },
  {
    category: 'Business',
    icon: Briefcase,
    title: 'Business Travel Made Easy',
    description: 'Fast-track visas for frequent travellers with priority processing',
    gradient: 'from-blue-600 to-indigo-700',
    bgGradient: 'from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200',
    accent: 'text-blue-600',
    badge: 'Priority',
    badgeIcon: Zap,
    countries: [
      { name: 'USA', flag: '🇺🇸', price: '₹15,999' },
      { name: 'UK', flag: '🇬🇧', price: '₹12,499' },
      { name: 'UAE', flag: '🇦🇪', price: '₹6,999' },
      { name: 'Singapore', flag: '🇸🇬', price: '₹4,999' },
      { name: 'Germany', flag: '🇩🇪', price: '₹11,999' },
    ],
    validUntil: 'Ongoing',
    daysLeft: null,
    perks: [
      { icon: Clock, text: '3-day processing' },
      { icon: CheckCircle2, text: 'Multiple entry' },
      { icon: Users, text: 'Dedicated support' },
    ],
    rating: 4.9,
    reviews: 1923,
    bookings: '890+',
    priceFrom: '₹4,999',
    processing: '2-3 days',
    highlight: false,
    testimonial: '"Express business visa!"',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&auto=format',
  },
  {
    category: 'Student',
    icon: GraduationCap,
    title: 'Student Visa Offers',
    description: 'Study abroad with dedicated visa support and scholarship benefits',
    gradient: 'from-emerald-600 to-teal-700',
    bgGradient: 'from-emerald-50 to-teal-50',
    borderColor: 'border-emerald-200',
    accent: 'text-emerald-600',
    badge: 'Scholarship',
    badgeIcon: Star,
    countries: [
      { name: 'USA', flag: '🇺🇸', price: '₹12,999' },
      { name: 'Canada', flag: '🇨🇦', price: '₹10,999' },
      { name: 'UK', flag: '🇬🇧', price: '₹11,499' },
      { name: 'Australia', flag: '🇦🇺', price: '₹13,999' },
      { name: 'Germany', flag: '🇩🇪', price: '₹7,999' },
    ],
    validUntil: '2026-09-30',
    daysLeft: 112,
    perks: [
      { icon: Percent, text: 'Low processing fees' },
      { icon: Users, text: 'Parent accommodation' },
      { icon: Sparkles, text: 'Part-time work guide' },
    ],
    rating: 4.7,
    reviews: 3102,
    bookings: '2.1K+',
    priceFrom: '₹7,999',
    processing: '5-10 days',
    highlight: false,
    testimonial: '"Perfect for students!"',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&auto=format',
  },
  {
    category: 'Holiday',
    icon: Palmtree,
    title: 'Holiday Visa Deals',
    description: 'Plan your perfect getaway with visa-on-arrival destinations',
    gradient: 'from-rose-500 to-pink-600',
    bgGradient: 'from-rose-50 to-pink-50',
    borderColor: 'border-rose-200',
    accent: 'text-rose-600',
    badge: 'Popular',
    badgeIcon: Star,
    countries: [
      { name: 'Maldives', flag: '🇲🇻', price: '₹5,999' },
      { name: 'Bali', flag: '🇮🇩', price: '₹3,999' },
      { name: 'Dubai', flag: '🇦🇪', price: '₹4,999' },
      { name: 'Seychelles', flag: '🇸🇨', price: '₹8,999' },
      { name: 'Mauritius', flag: '🇲🇺', price: '₹7,499' },
    ],
    validUntil: '2026-12-31',
    daysLeft: 204,
    perks: [
      { icon: MapPin, text: 'Visa on arrival' },
      { icon: Eye, text: 'Airport pickup' },
      { icon: Sparkles, text: 'Hotel deals' },
    ],
    rating: 4.9,
    reviews: 4521,
    bookings: '3.5K+',
    priceFrom: '₹3,999',
    processing: '1-3 days',
    highlight: false,
    testimonial: '"Hassle-free holiday!"',
    image: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=400&auto=format',
  },
];

function CountdownTimer({ daysLeft, accent }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!daysLeft) return;

    const endDate = new Date('2026-08-31');
    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = endDate - now;

      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [daysLeft]);

  if (!daysLeft) return null;

  return (
    <div className="flex items-center gap-1">
      {[
        { value: timeLeft.days, label: 'D' },
        { value: timeLeft.hours, label: 'H' },
        { value: timeLeft.minutes, label: 'M' },
        { value: timeLeft.seconds, label: 'S' },
      ].map((unit, i) => (
        <div key={i} className="bg-white/90 rounded-lg px-2 py-1 text-center min-w-[36px]">
          <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{String(unit.value).padStart(2, '0')}</div>
          <div className="text-[8px] text-[hsl(var(--blue-900))]/50 font-semibold">{unit.label}</div>
        </div>
      ))}
    </div>
  );
}

function CountryPreview({ countries, accent }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <div className="flex flex-wrap gap-2">
      {countries.map((country, i) => (
        <motion.div
          key={country.name}
          className="relative"
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
          whileHover={{ scale: 1.1 }}
        >
          <div className={`flex items-center gap-1.5 bg-white/80 rounded-full px-2.5 py-1.5 border border-black/5 ${hoveredIndex === i ? 'ring-2 ring-offset-1' : ''}`}
            style={{ ringColor: accent.includes('amber') ? '#F59E0B' : accent.includes('blue') ? '#3B82F6' : accent.includes('emerald') ? '#10B981' : '#EC4899' }}
          >
            <span className="text-base">{country.flag}</span>
            <span className="text-[10px] font-semibold text-[hsl(var(--blue-900))]">{country.name}</span>
          </div>

          <AnimatePresence>
            {hoveredIndex === i && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-xl shadow-xl px-3 py-2 whitespace-nowrap z-20 border border-black/5"
              >
                <div className="text-[11px] font-bold text-[hsl(var(--blue-900))]">{country.name}</div>
                <div className="text-[10px] text-[hsl(var(--blue-900))]/60">From {country.price}</div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-white transform rotate-45 border-r border-b border-black/5" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

function TiltCard({ children, offer }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-50, 50], [8, -8]);
  const rotateY = useTransform(x, [-50, 50], [-8, 8]);

  const handleMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.div>
  );
}

function OfferCard({ offer, index, isActive, onSelect }) {
  const Icon = offer.icon;
  const BadgeIcon = offer.badgeIcon;
  const isLeft = index % 2 === 0;

  return (
    <TiltCard offer={offer}>
      <motion.div
        initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ y: -6, scale: 1.02, z: 50 }}
        onClick={() => onSelect(offer)}
        className={`relative rounded-2xl border-2 ${offer.borderColor} ${offer.bgGradient} p-5 sm:p-6 cursor-pointer transition-all duration-300 ${
          isActive ? 'ring-2 ring-offset-2 ring-[hsl(var(--accent))]' : ''
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {offer.highlight && (
          <div className="absolute -top-2.5 -right-2.5 z-10">
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r ${offer.gradient} text-white text-[10px] font-bold shadow-lg`}>
              <BadgeIcon className="w-3 h-3" /> {offer.badge}
            </span>
          </div>
        )}

        {offer.daysLeft && (
          <div className="absolute -top-2.5 -left-2.5 z-10">
            <CountdownTimer daysLeft={offer.daysLeft} accent={offer.accent} />
          </div>
        )}

        <div className="flex items-start justify-between mb-4">
          <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${offer.gradient} text-white shadow-lg`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${offer.accent}`}>
              {offer.category}
            </span>
            <div className="flex items-center gap-1 bg-white/80 rounded-full px-2 py-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-[10px] font-bold text-[hsl(var(--blue-900))]">{offer.rating}</span>
            </div>
          </div>
        </div>

        <div className="relative mb-4 rounded-xl overflow-hidden">
          <img
            src={offer.image}
            alt={offer.title}
            className="w-full h-28 object-cover"
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${offer.bgGradient} opacity-60`} />
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1">
              <MapPin className={`w-3 h-3 ${offer.accent}`} />
              <span className="text-[10px] font-bold text-[hsl(var(--blue-900))]">From {offer.priceFrom}</span>
            </div>
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1">
              <Clock className="w-3 h-3 text-[hsl(var(--blue-900))]/60" />
              <span className="text-[10px] font-semibold text-[hsl(var(--blue-900))]">{offer.processing}</span>
            </div>
          </div>
        </div>

        <h3 className="font-display font-extrabold text-[18px] text-[hsl(var(--blue-900))] mb-1">
          {offer.title}
        </h3>
        <p className="text-[12px] text-[hsl(var(--blue-900))]/60 mb-3">
          {offer.description}
        </p>

        <div className="mb-4">
          <CountryPreview countries={offer.countries} accent={offer.accent} />
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {offer.perks.map((perk, i) => {
            const PerkIcon = perk.icon;
            return (
              <div key={i} className="flex items-center gap-1.5 bg-white/80 rounded-lg px-2.5 py-1.5">
                <PerkIcon className={`w-3.5 h-3.5 ${offer.accent}`} />
                <span className="text-[10px] font-semibold text-[hsl(var(--blue-900))]">{perk.text}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-black/5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[hsl(var(--blue-900))]/40" />
              <span className="text-[10px] font-semibold text-[hsl(var(--blue-900))]/60">{offer.bookings} booked</span>
            </div>
            <span className="text-[10px] text-[hsl(var(--blue-900))]/40">·</span>
            <span className="text-[10px] text-[hsl(var(--blue-900))]/60">{offer.reviews.toLocaleString()} reviews</span>
          </div>
          <div className={`flex items-center gap-1 text-[10px] font-bold ${offer.accent}`}>
            View Details <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {offer.testimonial && (
          <div className="mt-3 flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg px-3 py-2 border border-amber-100">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[10px] italic text-[hsl(var(--blue-900))]/70">{offer.testimonial}</span>
          </div>
        )}
      </motion.div>
    </TiltCard>
  );
}

function OfferDetailPanel({ offer, onClose }) {
  if (!offer) return null;

  const Icon = offer.icon;
  const BadgeIcon = offer.badgeIcon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className={`rounded-2xl border-2 ${offer.borderColor} bg-gradient-to-br ${offer.bgGradient} p-6`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${offer.gradient} text-white shadow-lg`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${offer.accent}`}>{offer.category}</span>
            <h3 className="font-display font-extrabold text-[22px] text-[hsl(var(--blue-900))]">{offer.title}</h3>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-[hsl(var(--blue-900))]/60 hover:text-[hsl(var(--blue-900))] hover:bg-white transition-colors">
          ✕
        </button>
      </div>

      <p className="text-[14px] text-[hsl(var(--blue-900))]/70 mb-6">{offer.description}</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/80 rounded-xl p-4 text-center">
          <div className="text-[18px] font-bold text-[hsl(var(--blue-900))]">{offer.priceFrom}</div>
          <div className="text-[10px] text-[hsl(var(--blue-900))]/60">Starting price</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 text-center">
          <div className="text-[18px] font-bold text-[hsl(var(--blue-900))]">{offer.processing}</div>
          <div className="text-[10px] text-[hsl(var(--blue-900))]/60">Processing time</div>
        </div>
        <div className="bg-white/80 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-[18px] font-bold text-[hsl(var(--blue-900))]">{offer.rating}</span>
          </div>
          <div className="text-[10px] text-[hsl(var(--blue-900))]/60">{offer.reviews.toLocaleString()} reviews</div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-[11px] uppercase tracking-wider font-bold text-[hsl(var(--blue-900))]/50 mb-3">Included Perks</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {offer.perks.map((perk, i) => {
            const PerkIcon = perk.icon;
            return (
              <div key={i} className="flex items-center gap-2 bg-white/80 rounded-xl px-4 py-3">
                <PerkIcon className={`w-4 h-4 ${offer.accent}`} />
                <span className="text-[12px] font-semibold text-[hsl(var(--blue-900))]">{perk.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-[11px] uppercase tracking-wider font-bold text-[hsl(var(--blue-900))]/50 mb-3">Top Countries</h4>
        <div className="flex flex-wrap gap-3">
          {offer.countries.map((country) => (
            <div key={country.name} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r ${offer.gradient} text-white`}>
              <span className="text-lg">{country.flag}</span>
              <div>
                <div className="text-[12px] font-bold">{country.name}</div>
                <div className="text-[10px] opacity-80">From {country.price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-black/10">
        <div className="flex items-center gap-2 text-[11px] text-[hsl(var(--blue-900))]/50">
          <Clock className="w-4 h-4" />
          <span>Offer valid until {offer.validUntil}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--blue-900))]/50 mr-3">
            <Users className="w-4 h-4" />
            <span>{offer.bookings} booked</span>
          </div>
          <a
            href={`tel:${BRAND.phoneRaw}`}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r ${offer.gradient} text-white text-[13px] font-bold hover:shadow-lg transition-all`}
          >
            Book Now <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

export default function FeaturedOffers() {
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [offers, setOffers] = useState(FEATURED_OFFERS_FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchOffers = async () => {
      try {
        const res = await axios.get(`${API}/public/events`, { params: { limit: 4 } });
        if (mounted && res.data?.items?.length) {
          const mapped = res.data.items.map((item) => {
            const cat = CATEGORY_MAP[item.tag] || CATEGORY_MAP.promo;
            return {
              category: cat.label,
              icon: cat.icon,
              title: item.title,
              description: item.subtitle || '',
              gradient: cat.gradient,
              bgGradient: cat.bgGradient,
              borderColor: cat.borderColor,
              accent: cat.accent,
              badge: cat.badge,
              badgeIcon: cat.badgeIcon,
              countries: item.countries || FALLBACK_COUNTRIES[item.tag] || FALLBACK_COUNTRIES.tourist,
              validUntil: item.validUntil || (item.ends_at ? new Date(item.ends_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Ongoing'),
              daysLeft: item.daysLeft || (item.ends_at ? Math.ceil((new Date(item.ends_at) - new Date()) / (1000 * 60 * 60 * 24)) : null),
              perks: item.perks || [
                { icon: Timer, text: 'Express 3-5 days' },
                { icon: ShieldCheck, text: 'Free insurance' },
                { icon: Zap, text: 'Priority support' },
              ],
              rating: item.rating || 4.8,
              reviews: item.reviews || 0,
              bookings: item.bookings || '0+',
              priceFrom: item.priceFrom || '₹4,999',
              processing: item.processing || '3-5 days',
              highlight: item.highlight || item.sort_order === 1,
              testimonial: item.testimonial || null,
              image: item.image_url || 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=400&auto=format',
              cta_url: item.cta_url,
            };
          });
          setOffers(mapped);
        }
      } catch (err) {
        if (mounted) console.warn('Failed to fetch offers, using fallback');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchOffers();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <section className="py-12 sm:py-16 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Featured Offers
            </div>
            <h2 className="font-display font-extrabold text-[26px] sm:text-[38px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
              Curated Promotions & Seasonal Picks
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 rounded-2xl bg-[hsl(var(--soft-bg))] animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-12 sm:py-16 bg-white overflow-hidden">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, rgba(10,44,138,0.05) 0%, transparent 20%),
              radial-gradient(circle at 80% 80%, rgba(225,33,44,0.03) 0%, transparent 20%)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Featured Offers
          </div>
          <h2 className="font-display font-extrabold text-[26px] sm:text-[38px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
            Curated Promotions & Seasonal Picks
          </h2>
          <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60 max-w-xl mx-auto">
            Handpicked travel deals and visa offers from the We Hive team for every type of traveller
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {offers.map((offer, i) => (
            <OfferCard
              key={offer.category}
              offer={offer}
              index={i}
              isActive={selectedOffer?.category === offer.category}
              onSelect={setSelectedOffer}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {selectedOffer && (
            <OfferDetailPanel offer={selectedOffer} onClose={() => setSelectedOffer(null)} />
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <a
            href={`tel:${BRAND.phoneRaw}`}
            className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--blue-700))] text-white px-6 py-3 text-[14px] font-bold hover:bg-[hsl(var(--blue-800))] transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            View All Offers · Call Now
          </a>
        </motion.div>
      </div>
    </section>
  );
}
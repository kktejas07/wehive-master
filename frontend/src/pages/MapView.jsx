'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe3D } from '../components/ui/3d-globe';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Plane,
  Clock,
  ShieldCheck,
  ArrowRight,
  Star,
  CheckCircle2,
  Visa,
  Sparkles,
} from 'lucide-react';

const POPULAR_VISAS = [
  {
    country: 'USA',
    flag: '🇺🇸',
    visaType: 'B1/B2 Tourist',
    processing: '3-5 days',
    price: '₹15,999',
    rating: 4.8,
    reviews: 2847,
    gradient: 'from-blue-500 to-blue-700',
    popular: true,
  },
  {
    country: 'UK',
    flag: '🇬🇧',
    visaType: 'Standard Visitor',
    processing: '5-10 days',
    price: '₹12,499',
    rating: 4.7,
    reviews: 1923,
    gradient: 'from-purple-500 to-purple-700',
    popular: true,
  },
  {
    country: 'Australia',
    flag: '🇦🇺',
    visaType: 'Subclass 600',
    processing: '5-7 days',
    price: '₹18,999',
    rating: 4.6,
    reviews: 1456,
    gradient: 'from-emerald-500 to-emerald-700',
    popular: false,
  },
  {
    country: 'Japan',
    flag: '🇯🇵',
    visaType: 'Tourist Visa',
    processing: '4-6 days',
    price: '₹8,999',
    rating: 4.9,
    reviews: 3102,
    gradient: 'from-red-500 to-pink-600',
    popular: true,
  },
  {
    country: 'Canada',
    flag: '🇨🇦',
    visaType: 'Visitor Visa',
    processing: '7-14 days',
    price: '₹14,999',
    rating: 4.5,
    reviews: 1678,
    gradient: 'from-amber-500 to-orange-600',
    popular: false,
  },
  {
    country: 'UAE',
    flag: '🇦🇪',
    visaType: 'Tourist/Transit',
    processing: '2-4 days',
    price: '₹6,999',
    rating: 4.8,
    reviews: 4521,
    gradient: 'from-teal-500 to-teal-700',
    popular: true,
  },
  {
    country: 'Germany',
    flag: '🇩🇪',
    visaType: 'Schengen Visa',
    processing: '5-8 days',
    price: '₹11,999',
    rating: 4.6,
    reviews: 1234,
    gradient: 'from-yellow-500 to-amber-600',
    popular: false,
  },
  {
    country: 'Singapore',
    flag: '🇸🇬',
    visaType: 'Tourist Visa',
    processing: '1-3 days',
    price: '₹4,999',
    rating: 4.9,
    reviews: 3876,
    gradient: 'from-rose-500 to-red-600',
    popular: true,
  },
];

function VisaCard({ visa, index, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileHover={{ y: -4, scale: 1.02 }}
      onClick={onClick}
      className="relative rounded-2xl bg-white border border-black/8 shadow-sm overflow-hidden cursor-pointer group"
    >
      {visa.popular && (
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(var(--accent))] text-white text-[10px] font-bold">
            <Star className="w-3 h-3" /> Popular
          </span>
        </div>
      )}
      <div className={`h-20 bg-gradient-to-br ${visa.gradient} flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/10" />
        <span className="text-5xl">{visa.flag}</span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-extrabold text-[16px] text-[hsl(var(--blue-900))]">{visa.country}</h3>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-[11px] font-bold text-[hsl(var(--blue-900))]">{visa.rating}</span>
          </div>
        </div>
        <p className="text-[11px] text-[hsl(var(--blue-900))]/60 mt-1">{visa.visaType}</p>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[hsl(var(--blue-900))]/50">From</span>
            <div className="text-[18px] font-display font-extrabold text-[hsl(var(--blue-900))]">{visa.price}</div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-[10px] text-[hsl(var(--blue-900))]/60">
              <Clock className="w-3 h-3" />
              {visa.processing}
            </div>
            <div className="text-[10px] text-[hsl(var(--blue-900))]/40">{visa.reviews.toLocaleString()} reviews</div>
          </div>
        </div>
        <Link
          to={`/visa/${visa.country.toLowerCase()}`}
          className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-[hsl(var(--blue-700))] text-white text-[12px] font-bold group-hover:bg-[hsl(var(--blue-800))] transition-colors"
        >
          Apply Now
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}

export default function MapView() {
  const [selectedVisa, setSelectedVisa] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);

  return (
    <div className="min-h-screen bg-[hsl(var(--soft-bg))]">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-3">
              <Globe className="w-3.5 h-3.5" />
              Interactive Map
            </div>
            <h1 className="font-display font-extrabold text-[32px] sm:text-[44px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
              Explore Visa Destinations
            </h1>
            <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60 max-w-xl mx-auto">
              Click on countries in the 3D globe or browse visa cards below to explore destinations
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="rounded-[28px] bg-white border border-black/8 shadow-lg overflow-hidden mb-10"
          >
            <div className="relative h-[400px] sm:h-[500px] bg-gradient-to-br from-[hsl(var(--blue-900))] via-[hsl(var(--blue-700))] to-[hsl(var(--blue-900))]">
              <div className="absolute inset-0">
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `
                      radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 25%),
                      radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 25%)
                    `,
                    backgroundSize: '60px 60px',
                  }}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Globe3D
                  markers={POPULAR_VISAS.map((v) => ({
                    lat: Math.random() * 180 - 90,
                    lng: Math.random() * 360 - 180,
                    label: v.country,
                    flag: v.flag,
                    visaType: v.visaType,
                  }))}
                  autoRotateSpeed={0.4}
                  onMarkerHover={(marker) => setHoveredCountry(marker)}
                  onMarkerClick={(marker) => {
                    const visa = POPULAR_VISAS.find((v) => v.country === marker.label);
                    if (visa) setSelectedVisa(visa);
                  }}
                />
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-white/80 text-[11px] font-semibold">Live Tracking</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
                  <Plane className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-white/80 text-[11px] font-semibold">250+ Countries</span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[hsl(var(--accent))]" />
              <h2 className="font-display font-extrabold text-[22px] text-[hsl(var(--blue-900))]">
                Popular Visa Destinations
              </h2>
            </div>
            <Link
              to="/universities"
              className="flex items-center gap-1 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {POPULAR_VISAS.map((visa, i) => (
              <VisaCard key={visa.country} visa={visa} index={i} onClick={() => setSelectedVisa(visa)} />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 rounded-[24px] bg-gradient-to-r from-[hsl(var(--blue-900))] to-[hsl(var(--blue-700))] p-8 text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-4">
              <Visa className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-display font-extrabold text-[24px] text-white">
              Need Help Choosing a Visa?
            </h3>
            <p className="mt-2 text-white/70 text-[14px] max-w-md mx-auto">
              Our experts can help you find the perfect visa for your travel needs
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/student-visa"
                className="inline-flex items-center gap-2 rounded-full bg-white text-[hsl(var(--blue-900))] px-6 py-3 text-[14px] font-bold hover:bg-white/90 transition"
              >
                <Sparkles className="w-4 h-4" />
                AI Visa Finder
              </Link>
              <a
                href="tel:+919113256726"
                className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] text-white px-6 py-3 text-[14px] font-bold hover:bg-[hsl(var(--red-600))] transition"
              >
                Call Now
              </a>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
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
  FileText,
  Sparkles,
  Globe,
} from 'lucide-react';
import { BRAND } from '../data/mock';

const POPULAR_VISAS = [
  {
    id: 'us',
    country: 'USA',
    flag: '',
    visaType: 'B1/B2 Tourist',
    processing: '3-5 days',
    price: '₹15,999',
    rating: 4.8,
    reviews: 2847,
    popular: true,
  },
  {
    id: 'uk',
    country: 'UK',
    flag: '',
    visaType: 'Standard Visitor',
    processing: '5-10 days',
    price: '₹12,499',
    rating: 4.7,
    reviews: 1923,
    popular: true,
  },
  {
    id: 'au',
    country: 'Australia',
    flag: '',
    visaType: 'Subclass 600',
    processing: '5-7 days',
    price: '₹18,999',
    rating: 4.6,
    reviews: 1456,
    popular: false,
  },
  {
    id: 'jp',
    country: 'Japan',
    flag: '',
    visaType: 'Tourist Visa',
    processing: '4-6 days',
    price: '₹8,999',
    rating: 4.9,
    reviews: 3102,
    popular: true,
  },
  {
    id: 'ca',
    country: 'Canada',
    flag: '',
    visaType: 'Visitor Visa',
    processing: '7-14 days',
    price: '₹14,999',
    rating: 4.5,
    reviews: 1678,
    popular: false,
  },
  {
    id: 'ae',
    country: 'UAE',
    flag: '',
    visaType: 'Tourist/Transit',
    processing: '2-4 days',
    price: '₹6,999',
    rating: 4.8,
    reviews: 4521,
    popular: true,
  },
  {
    id: 'de',
    country: 'Germany',
    flag: '',
    visaType: 'Schengen Visa',
    processing: '5-8 days',
    price: '₹11,999',
    rating: 4.6,
    reviews: 1234,
    popular: false,
  },
  {
    id: 'sg',
    country: 'Singapore',
    flag: '',
    visaType: 'Tourist Visa',
    processing: '1-3 days',
    price: '₹4,999',
    rating: 4.9,
    reviews: 3876,
    popular: true,
  },
];

function VisaCard({ visa, index, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="relative rounded-2xl bg-white border border-[hsl(var(--border))] shadow-sm overflow-hidden cursor-pointer group"
    >
      {visa.popular && (
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[hsl(var(--border))] text-[hsl(var(--blue-700))] text-[12px] font-semibold">
            <Star className="w-3 h-3" /> Popular
          </span>
        </div>
      )}
      <div className="h-20 bg-[hsl(var(--blue-50))] border-b border-[hsl(var(--border))] flex items-center justify-center relative overflow-hidden">
        {visa.flag ? <span className="text-5xl">{visa.flag}</span> : <Globe className="w-10 h-10 text-[hsl(var(--blue-700))]" />}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-[16px] text-[hsl(var(--blue-900))]">{visa.country}</h3>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-[12px] font-bold text-[hsl(var(--blue-900))]">{visa.rating}</span>
          </div>
        </div>
        <p className="text-[12px] text-muted-foreground mt-1">{visa.visaType}</p>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <span className="text-[12px] text-muted-foreground">From</span>
            <div className="text-[18px] font-display font-bold text-[hsl(var(--blue-900))]">{visa.price}</div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {visa.processing}
            </div>
            <div className="text-[12px] text-muted-foreground">{visa.reviews.toLocaleString()} reviews</div>
          </div>
        </div>
        <Link
          to={`/visa/${visa.id}`}
          className="mt-3 flex items-center justify-center gap-1.5 w-full h-11 rounded-xl bg-[hsl(var(--blue-700))] text-white text-[14px] font-semibold hover:bg-[hsl(var(--blue-800))] transition-colors"
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-3">
              <Globe className="w-3.5 h-3.5" />
              Interactive Map
            </div>
            <h1 className="font-display font-bold text-[32px] sm:text-[44px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-tight">
              Explore Visa Destinations
            </h1>
            <p className="mt-2 text-[16px] text-muted-foreground max-w-xl mx-auto">
              Click on countries in the 3D globe or browse visa cards below to explore destinations
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl bg-white border border-[hsl(var(--border))] shadow-sm overflow-hidden mb-10"
          >
            <div className="relative h-[400px] sm:h-[500px] bg-[hsl(var(--blue-900))]">
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
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-white/80 text-[12px] font-semibold">Live Tracking</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                  <Plane className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-white/80 text-[12px] font-semibold">250+ Countries</span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[hsl(var(--blue-700))]" />
              <h2 className="font-display font-bold text-[22px] text-[hsl(var(--blue-900))] leading-tight">
                Popular Visa Destinations
              </h2>
            </div>
            <Link
              to="/universities"
              className="flex items-center gap-1 min-h-[44px] text-[14px] font-semibold text-[hsl(var(--blue-700))] hover:underline"
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
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 rounded-2xl bg-white border border-[hsl(var(--border))] shadow-sm p-6 sm:p-8 text-center"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[hsl(var(--blue-50))] mb-4">
              <FileText className="w-7 h-7 text-[hsl(var(--blue-700))]" />
            </div>
            <h3 className="font-display font-bold text-[24px] text-[hsl(var(--blue-900))]">
              Need Help Choosing a Visa?
            </h3>
            <p className="mt-2 text-muted-foreground text-[16px] max-w-md mx-auto">
              Our experts can help you find the perfect visa for your travel needs
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/student-visa"
                className="inline-flex items-center gap-2 rounded-xl bg-white border border-[hsl(var(--border))] text-[hsl(var(--blue-900))] h-12 px-6 text-[15px] font-semibold hover:border-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-700))] transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                AI Visa Finder
              </Link>
              <a
                href={`tel:${BRAND.consultantPhoneRaw}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--accent))] text-white h-12 px-6 text-[15px] font-semibold hover:bg-[hsl(var(--accent-hover))] transition-colors"
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
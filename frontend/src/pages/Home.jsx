import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Hero from '../components/Hero';
import CountryGrid from '../components/CountryGrid';
import HowItWorks from '../components/HowItWorks';
import Testimonials from '../components/Testimonials';
import AnimatedTestimonials from '../components/ui/animated-testimonials';
import Faq from '../components/Faq';
import CtaBanner from '../components/CtaBanner';
import DealsSection from '../components/DealsSection';
import FeaturedOffers from '../components/FeaturedOffers';
import EventsBanner from '../components/EventsBanner';
import StatsStrip from '../components/StatsStrip';
import AIServices from '../components/AIServices';
import OnTimeGuarantee from '../components/OnTimeGuarantee';
import WorldMap from '../components/WorldMap';
import Marquee3DGrid from '../components/Marquee3DGrid';
import LiveTickerMarquee from '../components/LiveTickerMarquee';
import { DEFAULT_FILTERS } from '../components/FilterBar';
import { motion } from 'framer-motion';
import { Globe, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function GlobalReachSection() {
  return (
    <section className="relative py-12 sm:py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-3">
            <Globe className="w-3.5 h-3.5" />
            Global Network
          </div>
          <h2 className="font-display font-extrabold text-[26px] sm:text-[36px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
            Our Visa Routes Worldwide
          </h2>
          <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60 max-w-xl mx-auto">
            Connecting you to 250+ destinations across 6 continents with real-time flight path animations
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-[24px] overflow-hidden border border-black/5 shadow-lg"
        >
          <WorldMap className="h-[400px] sm:h-[450px]" animated showConnections />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-6 flex flex-wrap items-center justify-center gap-4"
        >
          <div className="flex items-center gap-2 bg-[hsl(var(--soft-bg))] rounded-full px-4 py-2">
            <span className="text-2xl">🛫</span>
            <div>
              <div className="text-[12px] font-bold text-[hsl(var(--blue-900))]">500+ Daily Bookings</div>
              <div className="text-[10px] text-[hsl(var(--blue-900))]/60">Across all routes</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[hsl(var(--soft-bg))] rounded-full px-4 py-2">
            <span className="text-2xl">🌍</span>
            <div>
              <div className="text-[12px] font-bold text-[hsl(var(--blue-900))]">250+ Countries</div>
              <div className="text-[10px] text-[hsl(var(--blue-900))]/60">Visa destinations</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[hsl(var(--soft-bg))] rounded-full px-4 py-2">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="text-[12px] font-bold text-[hsl(var(--blue-900))]">Real-time Tracking</div>
              <div className="text-[10px] text-[hsl(var(--blue-900))]/60">Application status</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Home() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  return (
    <div>
      <Navbar />
      <Hero filters={filters} onFilters={setFilters} />
      <LiveTickerMarquee />
      <CountryGrid filters={filters} />
      <GlobalReachSection />
      <Marquee3DGrid />
      <OnTimeGuarantee />
      <StatsStrip />
      <DealsSection />
      <FeaturedOffers />
      <EventsBanner />
      <AIServices />
      <HowItWorks />
      <Testimonials />
      <AnimatedTestimonials />
      <Faq />
      <CtaBanner />
      <Footer />
    </div>
  );
}

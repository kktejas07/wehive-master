import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Hero from '../components/Hero';
import CountryGrid from '../components/CountryGrid';
import HowItWorks from '../components/HowItWorks';
import Faq from '../components/Faq';
import CtaBanner from '../components/CtaBanner';
import DealsSection from '../components/DealsSection';
import Newsroom from '../components/Newsroom';
import StatsStrip from '../components/StatsStrip';
import AIServices from '../components/ai/AIServices';
import OnTimeGuarantee from '../components/OnTimeGuarantee';
import WorldMap from '../components/world-map/WorldMap';

import LiveTickerMarquee from '../components/LiveTickerMarquee';
import { DEFAULT_FILTERS } from '../components/FilterBar';
import SchengenCarousel from '../components/SchengenCarousel';
import { motion } from 'framer-motion';
import { Globe, ArrowRight, Sparkles, Plane, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ContentCard, ContentCardGrid } from '../components/ui/ContentCard';
import { trackPageView } from '../lib/analytics';
import { updateSEO } from '../lib/seo';

export default function Home() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  useEffect(() => {
    // 1. Initialize Page Analytics
    trackPageView('home_page', { section: 'hero_schengen_portal' });

    // 2. Initialize Dynamic SEO
    updateSEO({
      title: 'We Hive — One Visa to Access 29 Schengen Countries | Study Abroad & Visas',
      description: 'Explore 29 Schengen countries on one visa. Compare top European universities, discover AI visa services, and step into wonder with We Hive.',
    });
  }, []);

  return (
    <div>
      <Navbar />
      <Hero filters={filters} onFilters={setFilters} />
      <LiveTickerMarquee />
      <SchengenCarousel />
      <CountryGrid filters={filters} />
      <OnTimeGuarantee />
      <StatsStrip />
      <DealsSection />
      <Newsroom />
      <AIServices />
      <HowItWorks />
      <Faq />
      <CtaBanner />
      <Footer />
    </div>
  );
}

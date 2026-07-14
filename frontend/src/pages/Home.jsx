import { useState } from 'react';
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





export default function Home() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
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

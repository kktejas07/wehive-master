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
import LiveTickerMarquee from '../components/LiveTickerMarquee';
import { DEFAULT_FILTERS } from '../components/FilterBar';
import SchengenCarousel from '../components/SchengenCarousel';
import EnquirySection from '../components/EnquirySection';
import { updateSEO } from '../lib/seo';

export default function Home() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  useEffect(() => {
    // Screen views are tracked centrally in App.js (trackScreen) — don't double-count here.
    updateSEO({
      title: 'We Hive — One Visa to Access 29 Schengen Countries | Study Abroad & Visas',
      description: 'Explore 29 Schengen countries on one visa. Compare top European universities, discover AI visa services, and step into wonder with We Hive.',
    });
  }, []);

  return (
    <div className="bg-white">
      <Navbar />
      {/* Hero → proof → destinations/services → how it works → extras → FAQ → CTA */}
      <Hero filters={filters} onFilters={setFilters} />
      <LiveTickerMarquee />
      <CountryGrid filters={filters} />
      <StatsStrip />
      <SchengenCarousel />
      <AIServices />
      <HowItWorks />
      <EnquirySection />
      <DealsSection />
      <Newsroom />
      <Faq />
      <CtaBanner />
      <Footer />
    </div>
  );
}

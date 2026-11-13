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
import LiveTickerMarquee from '../components/LiveTickerMarquee';
import { DEFAULT_FILTERS } from '../components/FilterBar';
import SchengenCarousel from '../components/SchengenCarousel';
import EnquirySection from '../components/EnquirySection';
import SeasonalBanners from '../components/SeasonalBanners';
import ApplicationBuilder from '../components/ApplicationBuilder';
import ExamPrepSection from '../components/ExamPrepSection';
import FeaturedDestinations from '../components/FeaturedDestinations';

export default function Home() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  return (
    <div className="bg-white">
      <Navbar />
      {/* Hero → proof → destinations/services → how it works → extras → FAQ → CTA */}
      <Hero filters={filters} onFilters={setFilters} />
      <LiveTickerMarquee />
      <FeaturedDestinations />
      <CountryGrid filters={filters} />
      <StatsStrip />
      <SchengenCarousel />
      <SeasonalBanners />
      <AIServices />
      <ExamPrepSection />
      <HowItWorks />
      <EnquirySection />
      <ApplicationBuilder />
      <DealsSection />
      <Newsroom />
      <Faq />
      <CtaBanner />
      <Footer />
    </div>
  );
}

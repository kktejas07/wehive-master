import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Hero from '../components/Hero';
import CountryGrid from '../components/CountryGrid';
import HowItWorks from '../components/HowItWorks';
import Testimonials from '../components/Testimonials';
import Faq from '../components/Faq';
import CtaBanner from '../components/CtaBanner';
import DealsSection from '../components/DealsSection';
import EventsBanner from '../components/EventsBanner';
import StatsStrip from '../components/StatsStrip';
import AIServices from '../components/AIServices';
import { DEFAULT_FILTERS } from '../components/FilterBar';

export default function Home() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  return (
    <div>
      <Navbar />
      <Hero filters={filters} onFilters={setFilters} />
      <CountryGrid filters={filters} />
      <StatsStrip />
      <DealsSection />
      <EventsBanner />
      <AIServices />
      <HowItWorks />
      <Testimonials />
      <Faq />
      <CtaBanner />
      <Footer />
    </div>
  );
}

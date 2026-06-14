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
import AIServices from '../components/ai/AIServices';
import OnTimeGuarantee from '../components/OnTimeGuarantee';
import WorldMap from '../components/world-map/WorldMap';

import LiveTickerMarquee from '../components/LiveTickerMarquee';
import PromoCards from '../components/PromoCards';
import { DEFAULT_FILTERS } from '../components/FilterBar';
import { motion } from 'framer-motion';
import { Globe, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ContentCard, ContentCardGrid } from '../components/ui/ContentCard';

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
          <h2 className="font-display font-extrabold text-[26px] sm:text-[36px] tracking-[-0.03em]">
            <span className="gradient-text-hover">Our Visa Routes</span> Worldwide
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
          className="relative w-full h-[380px] sm:h-[440px] lg:h-[480px] rounded-[24px] overflow-hidden border border-black/5 shadow-lg"
        >
          <WorldMap className="absolute inset-0" showConnections />
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

const TRAVEL_STORIES = [
  {
    id: 1,
    imageUrl: 'https://images.unsplash.com/photo-1488085061387-4b4d2b2a5a5a?auto=format&fit=crop&w=800&q=80',
    title: 'How I got my US tourist visa in 4 days',
    description: 'A complete guide to the DS-160 form and interview preparation that helped me succeed.',
    author: { name: 'Priya Sharma', initials: 'PS' },
    readTime: '5 min read',
    category: 'Visa Guide',
    accentColor: '#0a2c8a',
  },
  {
    id: 2,
    imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
    title: 'Student visa success story: Canada Edition',
    description: 'From acceptance letter to visa approval in 3 weeks. Here is everything I learned.',
    author: { name: 'Rahul Mehta', initials: 'RM' },
    readTime: '7 min read',
    category: 'Student Visa',
    accentColor: '#22c55e',
  },
  {
    id: 3,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    title: 'Maldives visa on arrival: What you need to know',
    description: 'No prior visa required for Indian passport holders. Here is the complete checklist.',
    author: { name: 'Anita Desai', initials: 'AD' },
    readTime: '3 min read',
    category: 'Travel Tips',
    accentColor: '#0a2c8a',
  },
];

function TravelStoriesSection() {
  return (
    <section className="py-16 sm:py-20 bg-white">
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
              From Our Blog
            </div>
            <h2 className="font-display font-extrabold text-[26px] sm:text-[38px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
              Travel Stories & Visa Guides
            </h2>
            <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60 max-w-lg">
              Real experiences from real travellers. Learn from their journeys.
            </p>
          </div>
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[hsl(var(--accent))] hover:gap-2.5 transition-all"
          >
            View all articles <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <ContentCardGrid>
          {TRAVEL_STORIES.map((story, i) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <ContentCard
                imageUrl={story.imageUrl}
                title={story.title}
                description={story.description}
                author={story.author}
                readTime={story.readTime}
                category={story.category}
                accentColor={story.accentColor}
                onClick={() => {}}
              />
            </motion.div>
          ))}
        </ContentCardGrid>
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
      <OnTimeGuarantee />
      <StatsStrip />
      <DealsSection />
      <PromoCards />
      <EventsBanner />
      <AIServices />
      <HowItWorks />
      <Testimonials />
      <TravelStoriesSection />
      <Faq />
      <CtaBanner />
      <Footer />
    </div>
  );
}

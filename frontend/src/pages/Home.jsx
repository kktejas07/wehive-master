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
import EventsBanner from '../components/EventsBanner';
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
          className="relative w-full aspect-[16/9] rounded-[24px] overflow-hidden border border-black/5 shadow-lg"
        >
          <WorldMap className="absolute inset-0" showConnections />
        </motion.div>

      </div>
    </section>
  );
}

import axios from 'axios';
import { API_URL } from '../config';
import { useEffect, useState } from 'react';

function TravelStoriesSection() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/blogs?limit=3`);
        setStories(res.data || []);
      } catch (error) {
        console.error("Failed to fetch blogs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  if (loading) return null;
  if (stories.length === 0) return null;

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
          {stories.map((story, i) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <ContentCard
                imageUrl={story.imageUrl || "https://images.unsplash.com/photo-1488085061387-4b4d2b2a5a5a"}
                title={story.title}
                description={story.description}
                author={story.author}
                readTime={story.readTime || '5 min read'}
                category={story.category}
                accentColor="#0a2c8a"
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
      <SchengenCarousel />
      <CountryGrid filters={filters} />
      <GlobalReachSection />
      <OnTimeGuarantee />
      <StatsStrip />
      <DealsSection />
      <EventsBanner />
      <Newsroom />
      <AIServices />
      <HowItWorks />
      <TravelStoriesSection />
      <Faq />
      <CtaBanner />
      <Footer />
    </div>
  );
}

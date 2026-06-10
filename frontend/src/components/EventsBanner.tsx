'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowRight, Sparkles, Star, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API } from '../context/AuthContext';

const TAG_LABEL: Record<string, string> = {
  tourist: 'Tourist',
  student: 'Student',
  work: 'Work',
  business: 'Business',
  holiday: 'Holiday',
  promo: 'Limited Offer',
};

const TAG_COLOR: Record<string, string> = {
  tourist: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  student: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  work: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  business: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  holiday: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  promo: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

interface Country {
  name: string;
  flag: string;
  price: string;
}

interface EventItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  cta_label?: string;
  cta_url?: string;
  image_url?: string;
  accent_color?: string;
  tag?: string;
  countries?: Country[];
  priceFrom?: string;
  processing?: string;
  rating?: number;
  reviews?: number;
  bookings?: string;
  highlight?: boolean;
}

function EventCard({ ev }: { ev: EventItem }) {
  const accent = ev.accent_color || '#e1212c';
  const tagLabel = TAG_LABEL[ev.tag || ''] || ev.tag || 'Featured';
  const tagColorClass = TAG_COLOR[ev.tag || ''] || TAG_COLOR.promo;

  return (
    <Link
      to={ev.cta_url || '#'}
      data-testid={`event-banner-${ev.id}`}
      className="group relative block aspect-[16/9] sm:aspect-[16/10] rounded-3xl overflow-hidden shadow-[0_30px_70px_-30px_rgba(10,44,138,0.4)] hover:shadow-[0_30px_70px_-20px_rgba(225,33,44,0.4)] transition-all duration-500"
    >
      {/* Background gradient or image */}
      <div
        className="absolute inset-0 z-0"
        style={{ background: `linear-gradient(135deg, ${accent} 0%, #0a2c8a 100%)` }}
      />
      
      {/* Background image if available */}
      {ev.image_url && (
        <img
          src={ev.image_url}
          alt={ev.title}
          className="absolute inset-0 z-0 h-full w-full object-cover opacity-60 mix-blend-overlay transition-transform duration-700 group-hover:scale-105"
        />
      )}
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      
      {/* Content */}
      <div className="relative z-[2] h-full flex flex-col justify-between p-6 sm:p-8">
        {/* Top section - Tag badge and highlight */}
        <div className="flex items-start justify-between">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${tagColorClass} backdrop-blur-sm`}>
            <Sparkles className="w-3 h-3" />
            <span className="text-[10.5px] uppercase tracking-[0.14em] font-bold">{tagLabel}</span>
          </div>
          
          {ev.highlight && (
            <div className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/20">
              <span className="text-[10.5px] font-bold text-white">🔥 Popular</span>
            </div>
          )}
        </div>

        {/* Bottom section - Title, description, CTA */}
        <div className="space-y-3">
          <h3 className="font-display font-extrabold text-[22px] sm:text-[26px] tracking-[-0.025em] leading-[1.15] text-white">
            {ev.title}
          </h3>
          
          {ev.subtitle && (
            <p className="text-[13.5px] sm:text-[14px] text-white/80 max-w-lg line-clamp-2">{ev.subtitle}</p>
          )}

          {/* Countries preview if available */}
          {ev.countries && ev.countries.length > 0 && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-white/60" />
              <div className="flex flex-wrap gap-1.5">
                {ev.countries.slice(0, 3).map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-2 py-0.5 text-[11px] text-white/90">
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                    <span className="text-white/60">·</span>
                    <span>{c.price}</span>
                  </span>
                ))}
                {ev.countries.length > 3 && (
                  <span className="text-[11px] text-white/60">+{ev.countries.length - 3} more</span>
                )}
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 text-[12px] text-white/70">
            {ev.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="font-bold text-white">{ev.rating}</span>
              </div>
            )}
            {ev.reviews && (
              <span>{ev.reviews.toLocaleString()} reviews</span>
            )}
            {ev.processing && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{ev.processing}</span>
              </div>
            )}
          </div>

          {/* CTA Button */}
          <div className="flex items-center gap-4 pt-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white text-[hsl(var(--blue-900))] px-5 py-2.5 text-[13px] font-bold group-hover:gap-3 transition-all">
              {ev.cta_label || 'Explore'}
              <ArrowRight className="w-4 h-4" />
            </span>
            
            {ev.priceFrom && (
              <span className="text-[13px] text-white/70">
                From <span className="font-bold text-white">{ev.priceFrom}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover glow effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 60px -20px ${accent}`,
        }}
      />
    </Link>
  );
}

interface EventsBannerProps {
  limit?: number;
  heading?: string;
}

const FALLBACK_EVENTS: EventItem[] = [
  { id: 'e1', title: 'Summer getaway deals', subtitle: 'Explore visa packages for top summer destinations', tag: 'promo', accent_color: '#f59e0b', cta_label: 'Explore Deals', cta_url: '/visa/sg', highlight: true },
  { id: 'e2', title: 'Business travel made easy', subtitle: 'Fast-track visas for frequent travellers', tag: 'business', accent_color: '#3b82f6', cta_label: 'Get Business Visa', cta_url: '/visa/us' },
  { id: 'e3', title: 'Student visa offers', subtitle: 'Study abroad with dedicated visa support', tag: 'student', accent_color: '#22c55e', cta_label: 'View Student Visa', cta_url: '/visa/ca' },
  { id: 'e4', title: 'Holiday visa deals', subtitle: 'Plan your perfect getaway with visa-on-arrival destinations', tag: 'holiday', accent_color: '#ec4899', cta_label: 'Browse Holidays', cta_url: '/holiday/th' },
];

export default function EventsBanner({
  limit = 4,
  heading = 'Featured offers',
}: EventsBannerProps) {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    axios.get(`${API}/public/events`, { params: { limit } })
      .then((r) => {
        if (mounted && r.data?.items?.length) {
          setItems(r.data.items.slice(0, limit));
        } else {
          setItems(FALLBACK_EVENTS.slice(0, limit));
        }
      })
      .catch(() => {
        if (mounted) setItems(FALLBACK_EVENTS.slice(0, limit));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [limit]);

  if (loading || items.length === 0) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] animate-pulse">
                Live now
              </div>
              <div className="h-8 w-48 bg-[hsl(var(--soft-bg))] rounded mt-1 animate-pulse" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[16/9] rounded-3xl bg-[hsl(var(--soft-bg))] animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white" data-testid="events-banner-section">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
                <span className="relative rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live now
            </div>
            <h2 className="font-display font-extrabold text-[28px] sm:text-[32px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
              {heading}
            </h2>
          </div>
          <p className="text-[13.5px] text-[hsl(var(--blue-900))]/55 max-w-sm">
            Curated promotions and seasonal travel picks from the We Hive team.
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 gap-5">
          {items.map((ev) => (
            <EventCard key={ev.id} ev={ev} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/offers"
            className="inline-flex items-center gap-2 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:text-[hsl(var(--accent))] transition-colors"
          >
            View all offers
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
import { useEffect, useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API } from '../context/AuthContext';

const TAG_LABEL = {
  tourist: 'Tourist',
  student: 'Student',
  work: 'Work',
  business: 'Business',
  holiday: 'Holiday',
  promo: 'Limited offer',
};

function EventCard({ ev }) {
  const accent = ev.accent_color || '#e1212c';
  const Cta = ev.cta_url ? Link : 'div';
  const ctaProps = ev.cta_url ? { to: ev.cta_url } : {};
  const body = (
    <>
      <div
        className="absolute inset-0 z-0 opacity-90"
        style={{ background: `linear-gradient(135deg, ${accent} 0%, #0a2c8a 100%)` }}
      />
      {ev.image_url && (
        <img
          src={ev.image_url}
          alt={ev.title}
          className="absolute inset-0 z-0 h-full w-full object-cover opacity-55 mix-blend-overlay transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
      <div className="relative z-[2] h-full flex flex-col justify-end p-6 text-white">
        <div className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.18em] font-bold text-white/85 mb-2">
          <Sparkles className="w-3 h-3" /> {TAG_LABEL[ev.tag] || ev.tag || 'Featured'}
        </div>
        <h3 className="font-display font-extrabold text-[22px] tracking-[-0.025em] leading-[1.15]">
          {ev.title}
        </h3>
        {ev.subtitle && (
          <p className="mt-1.5 text-[13.5px] text-white/85 max-w-md">{ev.subtitle}</p>
        )}
        {ev.cta_url && (
          <span className="mt-4 inline-flex items-center gap-1 self-start rounded-full bg-white text-[hsl(var(--blue-900))] px-4 py-2 text-[12.5px] font-bold">
            {ev.cta_label || 'Explore'}
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </>
  );

  return (
    <Cta
      {...ctaProps}
      data-testid={`event-banner-${ev.id}`}
      className="group relative block aspect-[16/9] sm:aspect-[16/10] rounded-3xl overflow-hidden shadow-[0_30px_70px_-30px_rgba(10,44,138,0.4)] hover:shadow-[0_30px_70px_-20px_rgba(225,33,44,0.4)] transition-shadow"
    >
      {body}
    </Cta>
  );
}
EventCard.propTypes = {
  ev: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    cta_label: PropTypes.string,
    cta_url: PropTypes.string,
    image_url: PropTypes.string,
    accent_color: PropTypes.string,
    tag: PropTypes.string,
  }).isRequired,
};

export default function EventsBanner({ limit = 4, heading = 'Featured offers' }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/public/events`, { params: { limit } })
      .then((r) => setItems(r.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoaded(true));
  }, [limit]);

  if (!loaded || items.length === 0) return null;

  return (
    <section className="py-16 bg-white" data-testid="events-banner-section">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
              Live now
            </div>
            <h2 className="mt-1 font-display font-extrabold text-[28px] sm:text-[32px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
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
      </div>
    </section>
  );
}
EventsBanner.propTypes = {
  limit: PropTypes.number,
  heading: PropTypes.string,
};

import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Grid2X2, Map as MapIcon, Sparkle, Loader2, Compass } from 'lucide-react';
import { COUNTRIES } from '../data/mock';
import { API } from '../context/AuthContext';
import { landmarkFor } from '../lib/landmarks';
import DeliveryCountdown from './DeliveryCountdown';
import Reveal from './Reveal';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from './ui/pagination';

// Local image lookup by id (frontend has the curated images)
const IMG = COUNTRIES.reduce((m, c) => ({ ...m, [c.id]: c.image }), {});

function CountryCard({ c, index = 0 }) {
  const isNoVisa = c.no_visa;
  const types = c.visa_types || [];
  const cardImage = landmarkFor(c) || IMG[c.id] || c.flag_url;
  const hasRichImage = !!(landmarkFor(c) || IMG[c.id]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.4 }}
    >
      <Link to={isNoVisa ? `/holiday/${c.id}` : `/visa/${c.id}`} className="group block card-lift">
        <motion.article
          whileHover={{ y: -4 }}
          transition={{ duration: 0.25 }}
          className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[hsl(var(--blue-900))]"
        >
          {cardImage ? (
            <img
              src={cardImage}
              alt={c.name}
              loading="lazy"
              className={`absolute inset-0 h-full w-full transition-transform duration-[900ms] group-hover:scale-[1.06] ${
                hasRichImage ? 'object-cover' : 'object-cover scale-150 blur-md opacity-60'
              }`}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-900))]" />
          )}
          {!hasRichImage && (
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--blue-700))]/85 to-[hsl(var(--blue-900))]/85" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Visa type badges - top */}
        {!isNoVisa && types.length > 0 && (
          <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5">
            {types.slice(0, 3).map((t) => (
              <span
                key={`${c.id}-${t}`}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/90 backdrop-blur text-[10px] uppercase tracking-[0.12em] font-bold text-[hsl(var(--blue-900))]"
              >
                {t}
              </span>
            ))}
            {types.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/90 backdrop-blur text-[10px] font-bold text-[hsl(var(--blue-900))]/60">
                +{types.length - 3}
              </span>
            )}
          </div>
        )}
        {isNoVisa && (
          <div className="absolute top-3 left-3 inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] uppercase tracking-[0.14em] font-bold">
            Visa-free
          </div>
        )}

        <div className="absolute bottom-[42%] left-1/2 -translate-x-1/2 h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-white/95 ring-2 ring-white/40 backdrop-blur flex items-center justify-center text-[22px] sm:text-[26px] leading-none shadow-lg">
          <span>{c.flag}</span>
        </div>

        <div className="absolute left-0 right-0 bottom-0 p-3 sm:p-4 text-white">
          <div className="text-center text-[15px] sm:text-[20px] lg:text-[22px] font-display font-extrabold tracking-tight uppercase truncate">
            {c.name}
          </div>
          {isNoVisa ? (
            <div className="mt-3 text-center text-[11px] uppercase tracking-[0.16em] text-white/80 font-bold">
              No Visa Required
            </div>
          ) : (
            <div className="mt-2.5 grid grid-cols-3 gap-1 text-[9px] sm:text-[10px] uppercase tracking-[0.1em] text-white/65 font-bold border-t border-white/15 pt-2.5">
              <div>
                <div>Type</div>
                <div className="text-white text-[10.5px] sm:text-[12px] font-bold mt-0.5 truncate">
                  {types[0] || 'E-VISA'}
                </div>
              </div>
              <div className="text-center">
                <div>Valid</div>
                <div className="text-white text-[10.5px] sm:text-[12px] font-bold mt-0.5 truncate">
                  {c.validity || c.valid}
                </div>
              </div>
              <div className="text-right">
                <div>Fees</div>
                <div className="text-white text-[10.5px] sm:text-[12px] font-bold mt-0.5 truncate">
                  ${c.fees_usd ?? c.fees}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.article>
      <div className="mt-3 px-1 flex items-center justify-between">
        <div>
          <div className="text-[12px] text-[hsl(var(--blue-900))]/55">
            {isNoVisa ? 'Holiday planner' : 'Standard delivery'}
          </div>
          <div className="text-[14px] font-bold text-[hsl(var(--blue-900))] inline-flex items-center gap-2">
            {isNoVisa ? `${c.holiday_default_days} days suggested` : `${c.delivery?.standard_days ?? 7} days`}
            {!isNoVisa && c.delivery?.same_day && (
              <DeliveryCountdown compact deliveryDays={c.delivery?.standard_days ?? 7} />
            )}
          </div>
        </div>
        {!isNoVisa && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = `/holiday/${c.id}`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                window.location.href = `/holiday/${c.id}`;
              }
            }}
            className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--blue-50))] hover:bg-[hsl(var(--blue-100))] text-[hsl(var(--blue-700))] px-3 py-1.5 text-[11.5px] font-bold transition cursor-pointer"
          >
            <Compass className="w-3 h-3" />
            Plan
          </span>
        )}
      </div>
    </Link>
    </motion.div>
  );
}

function MapPlaceholder({ items }) {
  return (
    <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-black/5 bg-[hsl(var(--blue-50))]">
      <img
        src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1600&q=80"
        alt="World map"
        className="absolute inset-0 h-full w-full object-cover opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-[hsl(var(--blue-900))]/30 to-transparent" />
      <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-center gap-2">
        {items.slice(0, 10).map((c) => (
          <Link
            key={c.id}
            to={c.no_visa ? `/holiday/${c.id}` : `/visa/${c.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-[12.5px] font-bold text-[hsl(var(--blue-900))] hover:bg-white shadow-sm"
          >
            <span>{c.flag}</span>
            <span>{c.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function CountryGrid({ filters }) {
  const [view, setView] = useState('grid');
  const [allItems, setAllItems] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const params = useMemo(() => {
    const p = {};
    if (filters?.visaTypeId && filters.visaTypeId !== 'all') {
      const map = {
        tourist: 'Tourist', business: 'Business', student: 'Student',
        work: 'Work', transit: 'Transit', medical: 'Medical',
      };
      p.visa_type = map[filters.visaTypeId];
    }
    if (filters?.deliveryId && filters.deliveryId !== 'any') {
      p.delivery = filters.deliveryId;
    }
    if (filters?.documentsId && filters.documentsId !== 'any') {
      p.documents = filters.documentsId;
    }
    if (filters?.view === 'holidays') {
      p.no_visa = true;
    }
    return p;
  }, [filters]);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      axios
        .get(`${API}/countries`, { params })
        .then((r) => mounted && setAllItems(r.data?.length ? r.data : COUNTRIES))
        .catch(() => mounted && setAllItems(COUNTRIES));
    }, 300);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [params]);

  useEffect(() => {
    setPage(1);
  }, [params]);

  const items = useMemo(() => {
    if (!allItems) return null;
    const sorted = [...allItems].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [allItems, page]);

  const totalPages = useMemo(() => {
    if (!allItems) return 0;
    return Math.ceil(allItems.length / PAGE_SIZE);
  }, [allItems]);

  const showEvents = filters?.view === 'events';
  const showHolidays = filters?.view === 'holidays';

  const renderPageNumbers = () => {
    const pages = [];
    const total = totalPages;
    const current = page;
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  };

  return (
    <section id="countries" className="relative py-16 sm:py-24 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="flex items-end justify-between flex-wrap gap-6 mb-8 sm:mb-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
              <Sparkle className="w-3.5 h-3.5" />
              {showEvents ? 'Events & festivals' : showHolidays ? 'Visa-free holidays' : 'Popular destinations'}
            </div>
            <h2 className="mt-3 text-[28px] sm:text-[40px] lg:text-[48px] leading-[1.08] font-display font-extrabold tracking-[-0.03em] text-[hsl(var(--blue-900))]">
              {showEvents ? (
                <>Travel to the world&rsquo;s{' '}<span className="text-[hsl(var(--accent))]">biggest moments.</span></>
              ) : showHolidays ? (
                <>Pack a bag.{' '}<span className="text-[hsl(var(--accent))]">Skip the visa.</span></>
              ) : (
                <>A world of visas,{' '}<span className="text-[hsl(var(--accent))]">in one place.</span></>
              )}
            </h2>
            <p className="mt-3 text-[14.5px] sm:text-[15.5px] text-[hsl(var(--blue-900))]/65 max-w-xl">
              {showEvents
                ? 'Visa packages timed to coincide with the world\'s great festivals, sporting events and concerts. (Coming soon)'
                : showHolidays
                  ? 'Destinations Indian passport holders can enter visa-free or with a visa-on-arrival. Tap a country to see the holiday plan.'
                  : 'Real ETA. Real fees. No hidden charges. Tap a country to see everything you need before you apply.'}
            </p>
          </div>

          {!showEvents && (
            <div className="inline-flex items-center rounded-full bg-white border border-black/10 p-1">
              <button
                onClick={() => setView('grid')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition ${
                  view === 'grid'
                    ? 'bg-[hsl(var(--blue-700))] text-white'
                    : 'text-[hsl(var(--blue-900))]/65 hover:text-[hsl(var(--blue-900))]'
                }`}
              >
                <Grid2X2 className="w-3.5 h-3.5" /> Grid
              </button>
              <button
                onClick={() => setView('map')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition ${
                  view === 'map'
                    ? 'bg-[hsl(var(--blue-700))] text-white'
                    : 'text-[hsl(var(--blue-900))]/65 hover:text-[hsl(var(--blue-900))]'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" /> Map
              </button>
            </div>
          )}
        </Reveal>

        {showEvents ? (
          <EventsBoard />
        ) : items === null ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" />
          </div>
        ) : items.length === 0 ? (
          <EmptyResults />
        ) : view === 'grid' ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {items.map((c, i) => (
                <CountryCard key={c.id} c={c} index={i} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <span className="text-[13px] text-[hsl(var(--blue-900))]/55">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, allItems.length)} of {allItems.length} countries
                </span>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {renderPageNumbers().map((p, idx) =>
                      p === '...' ? (
                        <PaginationItem key={`ellipsis-${idx}`}>
                          <span className="flex h-9 w-9 items-center justify-center text-[hsl(var(--blue-900))]/40">…</span>
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink
                            isActive={page === p}
                            onClick={() => setPage(p)}
                            className={`cursor-pointer ${page === p ? '' : 'text-[hsl(var(--blue-900))]/65'}`}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        ) : (
          <MapPlaceholder items={items} />
        )}
      </div>
    </section>
  );
}

function EmptyResults() {
  return (
    <div className="rounded-3xl bg-[hsl(var(--soft-bg))] border border-dashed border-black/15 p-14 text-center">
      <div className="font-display font-extrabold text-[24px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
        No countries match these filters
      </div>
      <p className="mt-2 text-[14.5px] text-[hsl(var(--blue-900))]/60 max-w-md mx-auto">
        Try widening your visa type or delivery speed. Most travellers find what they need under <strong>Any Time</strong> + <strong>All Visa Types</strong>.
      </p>
    </div>
  );
}

function EventsBoard() {
  const events = [
    { id: 'e1', city: 'Tokyo', country: 'Japan', flag: '🇯🇵', title: 'Cherry Blossom Festival', date: 'Mar – Apr', img: 'https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=800&q=80' },
    { id: 'e2', city: 'Munich', country: 'Germany', flag: '🇩🇪', title: 'Oktoberfest', date: 'Sep 20 – Oct 5', img: 'https://images.unsplash.com/photo-1557067175-db3159d938ac?w=800&q=80' },
    { id: 'e3', city: 'Rio', country: 'Brazil', flag: '🇧🇷', title: 'Carnival', date: 'Feb 14 – 20', img: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80' },
    { id: 'e4', city: 'Dubai', country: 'UAE', flag: '🇦🇪', title: 'Shopping Festival', date: 'Dec – Jan', img: 'https://images.unsplash.com/photo-1677632227671-cc52e6f7f130?w=800&q=80' },
    { id: 'e5', city: 'Edinburgh', country: 'UK', flag: '🇬🇧', title: 'Fringe Festival', date: 'Aug 1 – 25', img: 'https://images.unsplash.com/photo-1665573456818-67a4c48110c0?w=800&q=80' },
    { id: 'e6', city: 'Paris', country: 'France', flag: '🇫🇷', title: 'Bastille Day', date: 'Jul 14', img: 'https://images.unsplash.com/photo-1570097703229-b195d6dd291f?w=800&q=80' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {events.map((e) => (
        <article key={e.id} className="group rounded-2xl overflow-hidden bg-white border border-black/5 card-lift">
          <div className="relative aspect-[16/10] overflow-hidden">
            <img src={e.img} alt={e.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-[hsl(var(--blue-900))]">
              <span>{e.flag}</span> {e.city}
            </div>
          </div>
          <div className="p-5">
            <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-[hsl(var(--accent))]">{e.date}</div>
            <div className="mt-1 text-[18px] font-display font-extrabold tracking-[-0.02em] text-[hsl(var(--blue-900))]">
              {e.title}
            </div>
            <div className="mt-1 text-[13px] text-[hsl(var(--blue-900))]/55">{e.country}</div>
          </div>
        </article>
      ))}
    </div>
  );
}

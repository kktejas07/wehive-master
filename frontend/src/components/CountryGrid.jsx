import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Grid2X2, Map as MapIcon, Sparkle, Loader2, Compass, Search } from 'lucide-react';
import { COUNTRIES } from '../data/mock';
import { API } from '../context/AuthContext';
import { landmarkFor } from '../lib/landmarks';
import DeliveryCountdown from './DeliveryCountdown';
import Reveal from './Reveal';
import { SkeletonGrid } from './ui/skeleton';
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

const _wikiCache = {};

async function fetchCountryImage(countryName) {
  if (!countryName) return null;
  const key = countryName.toLowerCase().trim();
  if (_wikiCache[key] !== undefined) return _wikiCache[key];
  try {
    const pageRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(countryName)}`
    );
    if (!pageRes.ok) { _wikiCache[key] = null; return null; }
    const pageData = await pageRes.json();
    const title = pageData.title;
    const thumb = pageData?.thumbnail?.source;
    const pageImg = pageData?.originalimage?.source;

    if (pageImg && !pageImg.includes('Flag_of_') && !pageImg.includes('Coat_of_arms') && !pageImg.includes('Emblem')) {
      const largeUrl = pageImg.replace(/\/thumb\//, '/').replace(/\/\d+px-[^\/]+$/, '');
      _wikiCache[key] = largeUrl; return largeUrl;
    }

    const imagesRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&generator=images&gimlimit=50&prop=imageinfo&iiprop=url&format=json&origin=*`
    );
    if (!imagesRes.ok) { _wikiCache[key] = thumb || null; return thumb || null; }
    const imagesData = await imagesRes.json();
    const pages = imagesData?.query?.pages || {};
    const exclude = ['Flag', 'Coat_of_arms', 'Emblem', 'Logo', 'Map', 'Locator', 'Orthographic', 'Commons-logo', 'Decrease', 'Increase', 'blank', 'location'];
    const imageUrls = Object.values(pages)
      .map(p => p?.imageinfo?.[0]?.url)
      .filter(url => url && !exclude.some(ex => url.includes(ex)));

    const result = imageUrls[0] || thumb || null;
    _wikiCache[key] = result;
    return result;
  } catch {
    _wikiCache[key] = null;
    return null;
  }
}

function CountryCard({ c, index = 0 }) {
  const isNoVisa = c.no_visa;
  const types = c.visa_types || [];
  const landmark = landmarkFor(c);
  const imgFromMock = IMG[c.id];
  const [commonsImg, setCommonsImg] = useState(null);
  const cardImage = landmark || imgFromMock || commonsImg;

  useEffect(() => {
    if (!landmark && !imgFromMock) {
      fetchCountryImage(c.name).then(setCommonsImg);
    }
  }, [c.name, landmark, imgFromMock]);
  const categories = c.categories || {};
  const firstCategory = categories.Tourist || categories[Object.keys(categories)[0]] || {};
  const validity = c.validity || firstCategory.validity || '90 DAYS';
  const fees_usd = c.fees_usd ?? firstCategory.fees_usd ?? firstCategory.fees?.usd ?? 0;
  const documents = c.documents || firstCategory.documents || ['Passport'];
  const delivery = c.delivery || {};
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
          className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-[hsl(var(--blue-900))]"
        >
          {cardImage ? (
            <img
              src={cardImage}
              alt={c.name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-[1.06]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-900))]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

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

        <div className="absolute left-0 right-0 bottom-0 p-3 sm:p-4 text-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] sm:text-[14px] font-display font-bold tracking-tight truncate">
              {c.name}
            </span>
            <span className="text-[16px] sm:text-[18px]">{c.flag}</span>
          </div>

          {isNoVisa ? (
            <div className="text-[10px] uppercase tracking-[0.14em] text-white/80 font-bold">
              No Visa Required
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mt-2 text-[9px] sm:text-[10px] uppercase tracking-[0.08em] text-white/60 font-bold">
                <div>
                  <div>Type</div>
                  <div className="text-white text-[11px] sm:text-[12px] font-bold mt-0.5 truncate">
                    {types[0] || 'E-VISA'}
                  </div>
                </div>
                <div className="text-center">
                  <div>Valid</div>
                  <div className="text-white text-[11px] sm:text-[12px] font-bold mt-0.5 truncate">
                    {validity}
                  </div>
                </div>
                <div className="text-right">
                  <div>Fees</div>
                  <div className="text-white text-[11px] sm:text-[12px] font-bold mt-0.5 truncate">
                    ${fees_usd || c.fees}
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-white/10">
                <div className="text-[9px] uppercase tracking-[0.08em] text-white/50 mb-1">Documents:</div>
                <div className="text-[10px] text-white/80 truncate">
                  {Array.isArray(documents) ? documents.slice(0, 3).join(', ') : documents}
                </div>
              </div>
              <div className="mt-2 text-[10px] text-[hsl(var(--accent))] font-bold cursor-pointer hover:underline">
                Get emergency assistance →
              </div>
            </>
          )}
        </div>
      </motion.article>
      <div className="mt-3 px-1 flex items-center justify-between">
        <div>
          <div className="text-[12px] text-[hsl(var(--blue-900))]/55">
            {isNoVisa ? 'Holiday planner' : 'Standard delivery'}
          </div>
          <div className="text-[14px] font-bold text-[hsl(var(--blue-900))] inline-flex items-center gap-2">
            {isNoVisa ? `${c.holiday_default_days || 7} days suggested` : `${delivery.standard_days ?? 7} days`}
            {!isNoVisa && delivery.same_day && (
              <DeliveryCountdown compact deliveryDays={delivery.standard_days ?? 7} />
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
  const [search, setSearch] = useState('');
  const PAGE_SIZE = 20;

  const params = useMemo(() => {
    const p = {};
    if (filters?.visa_type && filters.visa_type !== 'All Visa Types') {
      const map = {
        'Tourist': 'Tourist', 'Business': 'Business', 'Student': 'Student',
        'Work': 'Work', 'Transit': 'Transit', 'Medical': 'Medical',
      };
      p.visa_type = map[filters.visa_type] || filters.visa_type;
    }
    if (filters?.delivery && filters.delivery !== 'Any Time') {
      const deliveryMap = {
        'Same Day': 'same_day', '48–72 hours': 'rush', '5–15 days': 'standard',
      };
      p.delivery = deliveryMap[filters.delivery] || filters.delivery;
    }
    if (filters?.documents && filters.documents !== 'Any Documents') {
      const docsMap = {
        'Minimal (passport only)': 'minimal', 'Standard set': 'standard',
      };
      p.documents = docsMap[filters.documents] || filters.documents;
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
    let filtered = allItems;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = allItems.filter(c => (c.name || '').toLowerCase().includes(q));
    }
    const sorted = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const start = (page - 1) * PAGE_SIZE;
    return { items: sorted.slice(start, start + PAGE_SIZE), total: filtered.length };
  }, [allItems, page, search]);

  const displayedItems = items?.items ?? null;
  const totalCount = items?.total ?? 0;

  const totalPages = useMemo(() => {
    if (!allItems) return 0;
    const count = search.trim() ? totalCount : allItems.length;
    return Math.ceil(count / PAGE_SIZE);
  }, [allItems, totalCount, search]);

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
            <div className="mt-4 relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--blue-900))]/40" />
              <input
                type="text"
                placeholder="Search country..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 bg-white text-[14px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/40 focus:outline-none focus:border-[hsl(var(--blue-700))] focus:ring-2 focus:ring-[hsl(var(--blue-700))]/20 transition"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--blue-900))]/40 hover:text-[hsl(var(--blue-900))] text-[16px]"
                >
                  ×
                </button>
              )}
            </div>
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
        ) : displayedItems === null ? (
          <SkeletonGrid count={20} />
        ) : displayedItems.length === 0 ? (
          <EmptyResults />
        ) : view === 'grid' ? (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {displayedItems.map((c, i) => (
                <CountryCard key={c.id} c={c} index={i} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <span className="text-[13px] text-[hsl(var(--blue-900))]/55">
                  {search.trim() ? `${totalCount} result${totalCount !== 1 ? 's' : ''} for "${search}"` : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, search.trim() ? totalCount : allItems.length)} of ${search.trim() ? totalCount : allItems.length} countries`}
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
          <MapPlaceholder items={displayedItems || items?.items || []} />
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
    { id: 'e1', city: 'Tokyo', country: 'Japan', title: 'Cherry Blossom Festival', date: 'Mar - Apr', img: 'https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=800&q=80' },
    { id: 'e2', city: 'Munich', country: 'Germany', title: 'Oktoberfest', date: 'Sep 20 - Oct 5', img: 'https://images.unsplash.com/photo-1557067175-db3159d938ac?w=800&q=80' },
    { id: 'e3', city: 'Rio', country: 'Brazil', title: 'Carnival', date: 'Feb 14 - 20', img: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80' },
    { id: 'e4', city: 'Dubai', country: 'UAE', title: 'Shopping Festival', date: 'Dec - Jan', img: 'https://images.unsplash.com/photo-1677632227671-cc52e6f7f130?w=800&q=80' },
    { id: 'e5', city: 'Edinburgh', country: 'UK', title: 'Fringe Festival', date: 'Aug 1 - 25', img: 'https://images.unsplash.com/photo-1665573456818-67a4c48110c0?w=800&q=80' },
    { id: 'e6', city: 'Paris', country: 'France', title: 'Bastille Day', date: 'Jul 14', img: 'https://images.unsplash.com/photo-1570097703229-b195d6dd291f?w=800&q=80' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {events.map((e) => (
        <article key={e.id} className="group rounded-2xl overflow-hidden bg-white border border-black/5 card-lift">
          <div className="relative aspect-[16/10] overflow-hidden">
            <img src={e.img} alt={e.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-[hsl(var(--blue-900))]">
              <span>{e.country.slice(0,2).toUpperCase()}</span> {e.city}
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

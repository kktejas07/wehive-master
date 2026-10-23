import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, AlertCircle, RefreshCw, AlertTriangle, X, Sparkles } from 'lucide-react';
import { API } from '../context/AuthContext';
import { useDialogA11y } from '../hooks/use-dialog-a11y';
import { destination } from '../lib/destinations';

const PAGE = 9;

const Newsroom = ({ countryId }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [digest, setDigest] = useState(null);
  const [errorState, setErrorState] = useState(null); // { status, message }
  const [category, setCategory] = useState('All');
  const [selectedNews, setSelectedNews] = useState(null);
  const [visible, setVisible] = useState(PAGE);
  const dialogProps = useDialogA11y(!!selectedNews, () => setSelectedNews(null));

  const CATEGORIES = ["All", "F1", "H1B", "O1", "EB1", "Business", "Travel"];

  const getCategoryColor = (cat) => {
    const c = cat?.toLowerCase() || '';
    // One calm badge style for every category (no rainbow chips).
    return c ? 'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] border-[hsl(var(--blue-100))]' : 'bg-white text-[hsl(var(--blue-700))] border-[hsl(var(--border))]';
  };

  const getCountryInfo = (cid) => {
    if (!cid) return null;
    return { color: 'bg-white text-[hsl(var(--blue-900))] border border-[hsl(var(--border))]', label: destination(cid).label };
  };

  const getItemDate = (item) => {
    if (!item) return new Date();
    const d1 = item.date ? new Date(item.date) : null;
    const d2 = item.created_at ? new Date(item.created_at) : null;
    if (d1 && !isNaN(d1.getTime()) && d1.getFullYear() >= 2026) {
      return d1;
    }
    if (d2 && !isNaN(d2.getTime())) return d2;
    return d1 || new Date();
  };

  const fetchNews = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      let url = `${API}/news?limit=1000`;
      if (countryId) url += `&country_id=${countryId}`;
      if (category && category !== "All") url += `&category=${encodeURIComponent(category)}`;
      
      const response = await axios.get(url);
      setNews(response.data?.items || response.data || []);
      
      // Also try to fetch AI digest (fails silently if missing)
      try {
        const digestRes = await axios.get(`${API}/news/digest`);
        if (digestRes.data?.digest) {
          setDigest(digestRes.data.digest);
        }
      } catch (e) {
        console.warn("No AI digest available yet.");
      }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        if (status === 404) {
          setErrorState({ status: 404, message: "No news available at the moment." });
        } else if (status === 429) {
          setErrorState({ status: 429, message: "Too many requests. Please try again later." });
        } else if (status === 500) {
          setErrorState({ status: 500, message: "Internal server error. Aggregator might be down." });
        } else if (status === 503) {
          setErrorState({ status: 503, message: "Service Unavailable. Vector DB or Scraper offline." });
        } else {
          setErrorState({ status, message: "An unexpected error occurred." });
        }
      } else {
        setErrorState({ status: 0, message: "Network error or server unreachable." });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setVisible(PAGE);
    fetchNews();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchNews is recreated each render; re-run only when the listed inputs change
  }, [countryId, category]);

  return (
    <div className="container-page section">
      {/* AI Digest Hero Banner */}
      {digest && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-10 bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-100))] rounded-2xl p-6 md:p-8"
        >
          <div className="max-w-4xl">
            <div className="eyebrow mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" aria-hidden="true" /> AI Daily Briefing
            </div>
            <h3 className="h-card !text-[22px] mb-3">{digest.title || "Global Immigration Update"}</h3>
            <p className="text-[hsl(var(--blue-900))] text-[16px] md:text-[17px] leading-relaxed mb-5">{digest.summary}</p>
            {digest.key_points && digest.key_points.length > 0 && (
              <ul className="space-y-3">
                {digest.key_points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px] text-[hsl(var(--blue-900))]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--blue-700))] mt-2.5 shrink-0" aria-hidden="true"></span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div className="min-w-0">
          <div className="eyebrow flex items-center gap-2">
            <Newspaper className="w-4 h-4" aria-hidden="true" /> Newsroom
          </div>
          <h2 className="h-section mt-3">Immigration Newsroom</h2>
          <p className="lead mt-2">Real-time policy updates and visa announcements.</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar snap-x -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat || (cat === 'All' && !category)}
              className={`snap-start shrink-0 h-10 px-4 rounded-full border text-[14px] font-semibold whitespace-nowrap transition-colors duration-200 ${category === cat || (cat === 'All' && !category) ? 'bg-[hsl(var(--blue-50))] border-[hsl(var(--blue-700))] text-[hsl(var(--blue-700))]' : 'bg-white border-[hsl(var(--border))] text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-200))]'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="card-surface max-w-lg mx-auto flex flex-col items-center justify-center px-6 py-10 text-center text-[15px] text-muted-foreground"
            >
              <RefreshCw className="w-6 h-6 animate-spin mb-3 text-[hsl(var(--blue-700))]" aria-hidden="true" />
              <p>Fetching latest updates...</p>
            </motion.div>
          ) : errorState ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="card-surface max-w-lg mx-auto flex flex-col items-center justify-center px-6 py-10 text-center"
            >
              {errorState.status === 404 ? (
                <span className="icon-tile mb-3"><AlertCircle className="w-5 h-5" aria-hidden="true" /></span>
              ) : errorState.status === 429 ? (
                <span className="icon-tile mb-3"><RefreshCw className="w-5 h-5" aria-hidden="true" /></span>
              ) : (
                <span className="icon-tile mb-3 !bg-red-50 !text-red-700"><AlertTriangle className="w-5 h-5" aria-hidden="true" /></span>
              )}
              <h3 className="h-card mb-2">
                {errorState.status === 404 ? 'No News Found' : `Error ${errorState.status || ''}`}
              </h3>
              <p className="text-muted-foreground max-w-md">{errorState.message}</p>
              <button 
                onClick={fetchNews}
                className="mt-6 h-11 px-5 rounded-xl btn-outline font-semibold"
              >
                Try Again
              </button>
            </motion.div>
          ) : news.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="card-surface max-w-lg mx-auto flex flex-col items-center justify-center px-6 py-10 text-center text-[15px] text-muted-foreground"
            >
              <span className="icon-tile mb-3"><AlertCircle className="w-5 h-5" aria-hidden="true" /></span>
              <p>No news items found for this category.</p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {news.slice(0, visible).map((item, idx) => (
                <motion.button
                  type="button"
                  key={item.id || idx}
                  onClick={() => setSelectedNews(item)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 6) * 0.05, duration: 0.25, ease: 'easeOut' }}
                  className="group text-left p-6 card-surface card-lift hover:border-[hsl(var(--blue-200))] cursor-pointer flex flex-col h-full"
                >
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold uppercase tracking-[0.08em] border ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </span>
                    {item.country_id && (
                      <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold uppercase tracking-[0.08em] ${getCountryInfo(item.country_id)?.color}`}>
                        {getCountryInfo(item.country_id)?.label || item.country_id.substring(0,3)}
                      </span>
                    )}
                    <span className="text-[12px] font-medium text-muted-foreground ml-auto">
                      {getItemDate(item).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="text-[18px] font-display font-semibold leading-snug text-[hsl(var(--blue-900))] mb-2 group-hover:text-[hsl(var(--blue-700))] transition-colors duration-200 line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-muted-foreground line-clamp-3 mb-5 flex-grow">
                    {item.content}
                  </p>
                  <div className="flex items-center text-[14px] font-semibold text-[hsl(var(--blue-700))] mt-auto">
                    Read full story &rarr;
                  </div>
                </motion.button>
              ))}
              {visible < news.length && (
                <div className="md:col-span-2 lg:col-span-3 flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setVisible(v => v + PAGE)}
                    className="h-11 px-5 rounded-xl btn-outline font-semibold"
                  >
                    Show more ({news.length - visible} left)
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* News Preview Modal */}
      <AnimatePresence>
        {selectedNews && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[hsl(var(--blue-900))]/50"
            onClick={() => setSelectedNews(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              {...dialogProps} className="bg-white rounded-2xl overflow-hidden shadow-xl border border-[hsl(var(--border))] w-full max-w-2xl max-h-[90vh] flex flex-col relative"
            >
              {/* Close button */}
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelectedNews(null)}
                className="absolute top-3 right-3 z-10 h-11 w-11 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:text-[hsl(var(--blue-900))] hover:bg-[hsl(var(--blue-50))] transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="p-6 sm:p-8 overflow-y-auto">
                <div className="flex items-center gap-2 mb-5 flex-wrap pr-10">
                  <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold uppercase tracking-[0.08em] border ${getCategoryColor(selectedNews.category)}`}>
                    {selectedNews.category}
                  </span>
                  {selectedNews.country_id && (
                    <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold uppercase tracking-[0.08em] ${getCountryInfo(selectedNews.country_id)?.color}`}>
                      {getCountryInfo(selectedNews.country_id)?.label || selectedNews.country_id.substring(0,3)}
                    </span>
                  )}
                  <span className="text-sm font-medium text-muted-foreground ml-auto">
                    {getItemDate(selectedNews).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                
                <h2 className="font-display text-[24px] sm:text-[30px] font-bold tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-tight mb-5">
                  {selectedNews.title}
                </h2>

                <div className="max-w-none text-[16px] text-[hsl(var(--blue-900))] leading-relaxed mb-8">
                  {selectedNews.content?.split('\n').map((paragraph, i) => (
                    <p key={i} className="mb-4">{paragraph}</p>
                  ))}
                </div>

                {selectedNews.source_url && !selectedNews.source_url.includes('example.com') && (
                  <div className="pt-4 border-t border-[hsl(var(--border))] flex justify-end">
                    <a
                      href={selectedNews.source_url.startsWith('http') ? selectedNews.source_url : `https://${selectedNews.source_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 h-11 px-5 rounded-xl btn-primary font-semibold text-[14px]"
                    >
                      Read Original Source &rarr;
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Newsroom;

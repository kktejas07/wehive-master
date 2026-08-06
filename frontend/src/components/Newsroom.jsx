import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, AlertCircle, RefreshCw, AlertTriangle, X, Sparkles } from 'lucide-react';
import { API } from '../context/AuthContext';

const Newsroom = ({ countryId }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [digest, setDigest] = useState(null);
  const [errorState, setErrorState] = useState(null); // { status, message }
  const [category, setCategory] = useState('All');
  const [selectedNews, setSelectedNews] = useState(null);

  const CATEGORIES = ["All", "F1", "H1B", "O1", "EB1", "Business", "Travel"];

  const getCategoryColor = (cat) => {
    const c = cat?.toLowerCase() || '';
    if (c.includes('f1') || c.includes('student')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (c.includes('h1b') || c.includes('o1') || c.includes('eb1') || c.includes('work')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (c.includes('business')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (c.includes('travel')) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-white text-primary border-gray-200';
  };

  const getCountryInfo = (cid) => {
    if (!cid) return null;
    const c = cid.toLowerCase();
    if (c.includes('us') || c.includes('united-states')) return { color: 'bg-blue-600 text-white', label: 'USA 🇺🇸' };
    if (c.includes('uk') || c.includes('united-kingdom')) return { color: 'bg-red-600 text-white', label: 'UK 🇬🇧' };
    if (c.includes('australia')) return { color: 'bg-orange-600 text-white', label: 'AUS 🇦🇺' };
    if (c.includes('canada')) return { color: 'bg-red-500 text-white', label: 'CAN 🇨🇦' };
    if (c.includes('germany')) return { color: 'bg-yellow-600 text-white', label: 'GER 🇩🇪' };
    return { color: 'bg-gray-600 text-white', label: cid.toUpperCase().substring(0, 3) };
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
      if (category && category !== "All") url += `&category=${category}`;
      
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
    fetchNews();
  }, [countryId, category]);

  return (
    <div className="my-16 px-4 max-w-7xl mx-auto">
      {/* AI Digest Hero Banner */}
      {digest && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-10 bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100/50 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Sparkles className="w-48 h-48 text-blue-600" />
          </div>
          <div className="relative z-10 max-w-4xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600 mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> AI Daily Briefing
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">{digest.title || "Global Immigration Update"}</h3>
            <p className="text-gray-700 text-lg leading-relaxed mb-6">{digest.summary}</p>
            {digest.key_points && digest.key_points.length > 0 && (
              <ul className="space-y-3">
                {digest.key_points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-800 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Newspaper className="w-8 h-8 text-primary" />
            Immigration Newsroom
          </h2>
          <p className="text-gray-500 mt-2 text-lg">Real-time policy updates and visa announcements.</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${category === cat || (cat === 'All' && !category) ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-gray-400"
            >
              <RefreshCw className="w-8 h-8 animate-spin mb-4" />
              <p>Fetching latest updates...</p>
            </motion.div>
          ) : errorState ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              {errorState.status === 404 ? (
                <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
              ) : errorState.status === 429 ? (
                <RefreshCw className="w-12 h-12 text-yellow-500 mb-4" />
              ) : (
                <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
              )}
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {errorState.status === 404 ? 'No News Found' : `Error ${errorState.status || ''}`}
              </h3>
              <p className="text-gray-500 max-w-md">{errorState.message}</p>
              <button 
                onClick={fetchNews}
                className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
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
              className="flex flex-col items-center justify-center py-20 text-gray-500"
            >
              <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
              <p>No news items found for this category.</p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {news.map((item, idx) => (
                <motion.div
                  key={item.id || idx}
                  onClick={() => setSelectedNews(item)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="group block p-6 bg-white rounded-2xl hover:bg-gray-50 border border-gray-100 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col h-full"
                >
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </span>
                    {item.country_id && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${getCountryInfo(item.country_id)?.color || 'bg-gray-500 text-white'}`}>
                        {getCountryInfo(item.country_id)?.label || item.country_id.substring(0,3)}
                      </span>
                    )}
                    <span className="text-xs font-medium text-gray-400 ml-auto">
                      {getItemDate(item).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-6 flex-grow">
                    {item.content}
                  </p>
                  <div className="flex items-center text-sm font-semibold text-primary group-hover:translate-x-1 transition-transform mt-auto">
                    Read full story &rarr;
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* News Preview Modal */}
      <AnimatePresence>
        {selectedNews && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedNews(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative"
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedNews(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="p-8 overflow-y-auto">
                <div className="flex items-center gap-2 mb-6 flex-wrap pr-8">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getCategoryColor(selectedNews.category)}`}>
                    {selectedNews.category}
                  </span>
                  {selectedNews.country_id && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${getCountryInfo(selectedNews.country_id)?.color || 'bg-gray-500 text-white'}`}>
                      {getCountryInfo(selectedNews.country_id)?.label || selectedNews.country_id.substring(0,3)}
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-400 ml-auto">
                    {getItemDate(selectedNews).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight mb-6">
                  {selectedNews.title}
                </h2>

                <div className="prose prose-lg prose-blue max-w-none text-gray-700 leading-relaxed mb-8">
                  {selectedNews.content?.split('\n').map((paragraph, i) => (
                    <p key={i} className="mb-4">{paragraph}</p>
                  ))}
                </div>

                {selectedNews.source_url && !selectedNews.source_url.includes('example.com') && (
                  <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <a
                      href={selectedNews.source_url.startsWith('http') ? selectedNews.source_url : `https://${selectedNews.source_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-95 transition-opacity shadow-md"
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

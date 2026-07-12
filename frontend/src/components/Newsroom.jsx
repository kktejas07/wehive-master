import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { API } from '../context/AuthContext';

const Newsroom = ({ countryId }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null); // { status, message }
  const [category, setCategory] = useState('');

  const CATEGORIES = ["All", "F1", "H1B", "O1", "EB1", "Business", "Travel"];

  const fetchNews = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      let url = `${API}/news?limit=5`;
      if (countryId) url += `&country_id=${countryId}`;
      if (category && category !== "All") url += `&category=${category}`;
      
      const response = await axios.get(url);
      setNews(response.data || []);
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
                <motion.a
                  key={item.id}
                  href={item.source_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="group block p-6 bg-gray-50 rounded-2xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-white rounded-full text-xs font-bold text-primary shadow-sm uppercase tracking-wider">
                      {item.category}
                    </span>
                    <span className="text-xs font-medium text-gray-400">
                      {new Date(item.date || item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {item.content}
                  </p>
                  <div className="flex items-center text-sm font-semibold text-primary">
                    Read full story &rarr;
                  </div>
                </motion.a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Newsroom;

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, RefreshCw, AlertCircle, X, Calendar, User as UserIcon } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API } from '../context/AuthContext';
import { ContentCard, ContentCardGrid } from '../components/ui/ContentCard';

export default function Blog() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('All');
  const [selectedBlog, setSelectedBlog] = useState(null);

  const CATEGORIES = ["All", "F1", "H1B", "O1", "EB1", "Business", "Travel"];

  const getRelevantImage = (cat) => {
    const c = cat?.toLowerCase() || '';
    if (c.includes('f1') || c.includes('student')) {
      return "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop";
    }
    if (c.includes('h1b') || c.includes('o1') || c.includes('eb1') || c.includes('work')) {
      return "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop";
    }
    if (c.includes('business')) {
      return "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop";
    }
    if (c.includes('travel') || c.includes('tourism')) {
      return "https://images.unsplash.com/photo-1488085061387-4b4d2b2a5a5a?q=80&w=2070&auto=format&fit=crop";
    }
    return "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop";
  };

  useEffect(() => {
    const fetchBlogs = async () => {
      setLoading(true);
      setError(null);
      try {
        let url = `${API}/blogs?limit=30`;
        if (category !== "All") url += `&category=${category}`;
        const response = await axios.get(url);
        setBlogs(response.data?.items || response.data || []);
      } catch (err) {
        setError("Failed to load blog posts. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, [category]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight flex items-center justify-center gap-4">
              <FileText className="w-10 h-10 text-primary" />
              We Hive Blog
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Discover travel stories, visa guides, and expert advice for your international journey.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap mb-12">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-sm border ${
                  category === cat 
                    ? 'bg-primary text-white border-primary' 
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary/30 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 text-gray-400"
              >
                <RefreshCw className="w-8 h-8 animate-spin mb-4 text-primary" />
                <p>Loading latest articles...</p>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">Oops!</h3>
                <p className="text-gray-500 max-w-md">{error}</p>
                <button 
                  onClick={() => setCategory('All')}
                  className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
                >
                  Try Again
                </button>
              </motion.div>
            ) : blogs.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 text-gray-500 text-center"
              >
                <FileText className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Articles Found</h3>
                <p>We haven't published any articles in this category yet.</p>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ContentCardGrid>
                  {blogs.map((story, i) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                    >
                      <ContentCard
                        imageUrl={(story.imageUrl && !story.imageUrl.includes('unsplash')) ? story.imageUrl : getRelevantImage(story.category)}
                        title={story.title}
                        description={story.description}
                        author={story.author}
                        readTime={story.readTime || '5 min read'}
                        category={story.category}
                        countryId={story.country_id}
                        accentColor="#0a2c8a"
                        onClick={() => setSelectedBlog(story)}
                      />
                    </motion.div>
                  ))}
                </ContentCardGrid>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Blog Preview Modal */}
      <AnimatePresence>
        {selectedBlog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col relative"
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedBlog(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Cover Image */}
              <div className="relative h-64 sm:h-80 w-full shrink-0">
                <img 
                  src={(selectedBlog.imageUrl && !selectedBlog.imageUrl.includes('unsplash')) ? selectedBlog.imageUrl : getRelevantImage(selectedBlog.category)} 
                  alt={selectedBlog.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex gap-2 mb-3">
                    <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full uppercase tracking-wider">
                      {selectedBlog.category}
                    </span>
                    {selectedBlog.country_id && (
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-full uppercase tracking-wider border border-white/30">
                        {selectedBlog.country_id.substring(0,3)}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
                    {selectedBlog.title}
                  </h2>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 sm:p-8 overflow-y-auto">
                <div className="flex items-center gap-6 mb-8 text-sm text-gray-500 font-medium pb-6 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    <span>{selectedBlog.author?.name || 'WeHive Editor'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {selectedBlog.created_at ? new Date(selectedBlog.created_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                </div>

                <div className="prose prose-lg prose-blue max-w-none text-gray-700 leading-relaxed">
                  {selectedBlog.description?.split('\\n').map((paragraph, i) => (
                    <p key={i} className="mb-4">{paragraph}</p>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, RefreshCw, AlertCircle, X, Calendar, User as UserIcon, Mic, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API } from '../context/AuthContext';
import { ContentCard, ContentCardGrid } from '../components/ui/ContentCard';
import { useDialogA11y } from '../hooks/use-dialog-a11y';

export default function Blog() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('All');
  const [selectedBlog, setSelectedBlog] = useState(null);
  const dialogProps = useDialogA11y(!!selectedBlog, () => setSelectedBlog(null));
  const [podcastData, setPodcastData] = useState(null);
  const [generatingPodcast, setGeneratingPodcast] = useState(false);

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
      return "https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=2070&auto=format&fit=crop";
    }
    return "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop";
  };

  useEffect(() => {
    const fetchBlogs = async () => {
      setLoading(true);
      setError(null);
      try {
        let url = `${API}/blogs?limit=1000`;
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
    <div className="min-h-screen flex flex-col bg-[hsl(var(--soft-bg))]">
      <Navbar />
      
      <main className="flex-grow pt-28 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-3 inline-flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> Guides &amp; stories</div>
            <h1 className="font-display text-[36px] md:text-[52px] font-bold text-[hsl(var(--blue-900))] tracking-[-0.02em] leading-tight">
              We Hive Blog
            </h1>
            <p className="mt-4 text-[16px] sm:text-[18px] text-muted-foreground max-w-2xl mx-auto">
              Discover travel stories, visa guides, and expert advice for your international journey.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap mb-10">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 min-h-[44px] rounded-full text-[14px] font-semibold transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--blue-700))] focus-visible:ring-offset-2 ${
                  category === cat 
                    ? 'bg-primary text-white border-primary' 
                    : 'bg-white text-muted-foreground border-[hsl(var(--border))] hover:border-[hsl(var(--blue-200))] hover:text-[hsl(var(--blue-900))]'
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
                className="flex flex-col items-center justify-center py-20 text-muted-foreground"
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
                <h3 className="text-xl font-bold text-[hsl(var(--blue-900))] mb-2">Oops!</h3>
                <p className="text-muted-foreground max-w-md">{error}</p>
                <button 
                  onClick={() => setCategory('All')}
                  className="mt-6 px-6 h-11 bg-white border border-[hsl(var(--border))] text-[hsl(var(--blue-900))] rounded-xl font-semibold hover:border-[hsl(var(--blue-700))] transition-colors"
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
                className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center"
              >
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold text-[hsl(var(--blue-900))] mb-2">No Articles Found</h3>
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
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 6) * 0.05, duration: 0.3 }}
                    >
                      <ContentCard
                        imageUrl={(story.imageUrl && !story.imageUrl.includes('unsplash')) ? story.imageUrl : getRelevantImage(story.category)}
                        title={story.title}
                        description={story.description}
                        author={story.author}
                        readTime={story.readTime || '5 min read'}
                        category={story.category}
                        countryId={story.country_id}
                        accentColor="#2563EB"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[hsl(var(--blue-900))]/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              {...dialogProps} className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col relative"
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedBlog(null)}
                aria-label="Close article"
                className="absolute top-3 right-3 z-10 w-11 h-11 inline-flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Cover Image */}
              <div className="relative h-64 sm:h-80 w-full shrink-0">
                <img loading="lazy" decoding="async" 
                  src={(selectedBlog.imageUrl && !selectedBlog.imageUrl.includes('unsplash')) ? selectedBlog.imageUrl : getRelevantImage(selectedBlog.category)} 
                  alt={selectedBlog.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex gap-2 mb-3">
                    <span className="px-3 py-1 bg-primary text-white text-[12px] font-bold rounded-full uppercase tracking-[0.14em]">
                      {selectedBlog.category}
                    </span>
                    {selectedBlog.country_id && (
                      <span className="px-3 py-1 bg-black/40 text-white text-[12px] font-bold rounded-full uppercase tracking-[0.14em] border border-white/30">
                        {selectedBlog.country_id.substring(0,3)}
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-[24px] sm:text-[32px] font-bold text-white leading-tight">
                    {selectedBlog.title}
                  </h2>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 sm:p-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-8 text-sm text-muted-foreground font-medium pb-6 border-b border-[hsl(var(--border))] flex-wrap gap-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      <span>{selectedBlog.author?.name || 'WeHive Editor'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {selectedBlog.date || (selectedBlog.created_at ? new Date(selectedBlog.created_at).toLocaleDateString() : 'Recent')}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={async () => {
                      if (podcastData) return;
                      setGeneratingPodcast(true);
                      try {
                        const res = await axios.get(`${API}/blogs/${selectedBlog.id}/podcast`);
                        setPodcastData(res.data.podcast);
                      } catch (e) {
                        alert("Failed to generate podcast");
                      } finally {
                        setGeneratingPodcast(false);
                      }
                    }}
                    disabled={generatingPodcast || podcastData}
                    className="flex items-center gap-2 bg-[hsl(var(--blue-50))] hover:bg-[hsl(var(--blue-100))] text-[hsl(var(--blue-700))] px-4 min-h-[44px] rounded-xl font-semibold transition-colors disabled:opacity-50"
                  >
                    {generatingPodcast ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                    {podcastData ? 'Podcast Ready' : 'Generate AI Podcast'}
                  </button>
                </div>
                
                {/* Podcast Display */}
                {podcastData && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-8 bg-[hsl(var(--soft-bg))] border border-[hsl(var(--border))] text-[hsl(var(--blue-900))] rounded-2xl p-5 sm:p-6">
                    <h3 className="font-bold text-[18px] mb-4 flex items-center gap-2 text-[hsl(var(--blue-900))]">
                      <Mic className="w-5 h-5 text-[hsl(var(--blue-700))]" /> AI Podcast Transcript
                    </h3>
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2 scrollbar-hide">
                      {podcastData.map((line, idx) => (
                        <div key={idx} className={`p-3 rounded-xl max-w-[85%] ${line.speaker === 'Host' ? 'bg-white border border-[hsl(var(--border))] ml-0 rounded-tl-sm' : 'bg-[hsl(var(--blue-50))] ml-auto rounded-tr-sm text-right'}`}>
                          <div className="text-[12px] uppercase font-bold text-[hsl(var(--blue-700))] mb-1 tracking-[0.14em]">{line.speaker}</div>
                          <div className="text-[14px] leading-relaxed">{line.text}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="max-w-none text-[16px] text-[hsl(var(--blue-900))] leading-relaxed">
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

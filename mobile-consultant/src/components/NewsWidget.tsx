import { useEffect, useState } from "react";
import { Newspaper, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

interface NewsItem {
  id: string;
  title: string;
  date: string;
  category: string;
  source_url?: string;
}

export default function NewsWidget() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Fallback to local dev server if env variable not present
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/api/news?limit=3`);
        if (res.ok) {
          const data = await res.json();
          setNews(data);
        }
      } catch (err) {
        console.error("Failed to fetch mobile news:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  if (loading || news.length === 0) {
    return null; // hide quietly on mobile if failed or loading
  }

  return (
    <div className="mt-4 px-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
          <Newspaper className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Immigration Updates
        </h3>
        <button className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center">
          See All <ChevronRight className="w-3 h-3 ml-0.5" />
        </button>
      </div>

      <div className="flex overflow-x-auto pb-4 -mx-4 px-4 gap-3 snap-x hide-scrollbar">
        {news.map((item, index) => (
          <motion.a
            key={item.id || index}
            href={item.source_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex-shrink-0 w-64 bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-700/50 snap-center flex flex-col justify-between h-28"
          >
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                  {item.category || "News"}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(item.date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                {item.title}
              </p>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Share2, Loader2, GraduationCap, DollarSign, Globe, ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import axios from 'axios';
import { API } from '../context/AuthContext';

export default function SharedShortlist() {
  const { token } = useParams();
  const [unis, setUnis] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API}/users/me/shortlist/share/${token}`)
      .then(r => setUnis(r.data))
      .catch(() => setError('This shortlist link is invalid or has expired.'));
  }, [token]);

  return (
    <div className="min-h-screen bg-[#0b1020] text-slate-100">
      <Navbar />
      <div className="max-w-4xl mx-auto px-5 pt-28 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-[hsl(var(--accent))] mb-3 flex items-center gap-2">
            <Share2 className="w-3.5 h-3.5" /> Shared with you
          </div>
          <h1 className="font-display font-extrabold text-[36px] sm:text-[48px] tracking-[-0.03em] text-white">
            University Shortlist
          </h1>
          <p className="mt-2 text-[15px] text-slate-400">
            Someone shared this university shortlist with you via We Hive.
          </p>
        </motion.div>

        {!unis && !error && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <div className="text-[15px] text-red-400 mb-4">{error}</div>
            <Link to="/universities" className="text-[13px] font-bold text-[hsl(var(--accent))] hover:underline">
              Browse Universities →
            </Link>
          </div>
        )}

        {unis && (
          <div className="space-y-3">
            <div className="text-[13px] text-slate-400 mb-6">{unis.length} universit{unis.length === 1 ? 'y' : 'ies'} in this shortlist</div>
            {unis.map((uni, i) => (
              <motion.div key={uni.university_id || i}
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="flex items-center gap-4 rounded-2xl bg-white/5 border border-white/8 px-5 py-4 hover:bg-white/8 transition">
                {uni.flag ? <span className="text-3xl shrink-0">{uni.flag}</span> : <GraduationCap className="w-8 h-8 shrink-0 text-slate-400" />}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[15px] text-white truncate">{uni.university_name}</div>
                  <div className="text-[12px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{uni.country}</span>
                    {uni.rank && <span>#{uni.rank} world rank</span>}
                    {uni.tuition_usd && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${uni.tuition_usd.toLocaleString()}/yr</span>}
                  </div>
                </div>
                <Link to={`/university/${uni.university_id}`}
                  className="shrink-0 inline-flex items-center gap-1 text-[12px] font-bold text-[hsl(var(--accent))] hover:underline">
                  View <ExternalLink className="w-3 h-3" />
                </Link>
              </motion.div>
            ))}
            <div className="pt-8 text-center">
              <Link to="/universities"
                className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] hover:opacity-90 text-white font-bold text-[14px] px-6 py-3">
                <GraduationCap className="w-4 h-4" /> Build Your Own Shortlist
              </Link>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

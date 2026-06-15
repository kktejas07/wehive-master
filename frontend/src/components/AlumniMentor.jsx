import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Star, MapPin, GraduationCap, MessageCircle,
  ChevronRight, Search, Loader2, Award, Calendar,
  Globe2, BookOpen, Sparkles, ExternalLink, Phone,
  Send,
} from 'lucide-react';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';

const SAMPLE_ALUMNI = [
  { id: 'a1', name: 'Priya Sharma', university: 'MIT', country: 'us', course: 'Computer Science', graduation_year: 2022, current_role: 'Software Engineer at Google', avatar: 'PS', rating: 4.8, reviews: 12, available: true, languages: ['English', 'Hindi'], bio: 'Former international student from India. Happy to help with MIT applications and US F-1 visa process.' },
  { id: 'a2', name: 'Arjun Patel', university: 'Oxford', country: 'uk', course: 'MBA', graduation_year: 2023, current_role: 'Strategy Consultant at McKinsey', avatar: 'AP', rating: 4.9, reviews: 8, available: true, languages: ['English', 'Gujarati'], bio: 'Rhodes Scholar. Can guide you through Oxford applications and UK Tier 4 visa.' },
  { id: 'a3', name: 'Neha Gupta', university: 'TUM', country: 'de', course: 'Mechanical Engineering', graduation_year: 2021, current_role: 'Product Engineer at BMW', avatar: 'NG', rating: 4.7, reviews: 15, available: true, languages: ['English', 'German', 'Hindi'], bio: 'Studied in Germany on a DAAD scholarship. Expert on blocked accounts and student visas.' },
  { id: 'a4', name: 'Rahul Verma', university: 'Polimi', country: 'it', course: 'Architecture', graduation_year: 2023, current_role: 'Architect at Zaha Hadid', avatar: 'RV', rating: 4.6, reviews: 6, available: false, languages: ['English', 'Italian'], bio: 'Italian design enthusiast. Can help with portfolios and Schengen visa applications.' },
  { id: 'a5', name: 'Ananya Singh', university: 'Harvard', country: 'us', course: 'Public Health', graduation_year: 2022, current_role: 'Public Health Researcher at WHO', avatar: 'AS', rating: 4.9, reviews: 20, available: true, languages: ['English', 'French'], bio: 'Fulbright Scholar. Passionate about mentoring first-generation international students.' },
  { id: 'a6', name: 'Vikram Joshi', university: 'Uni Wien', country: 'at', course: 'International Law', graduation_year: 2021, current_role: 'Legal Counsel at UN Office Vienna', avatar: 'VJ', rating: 4.5, reviews: 9, available: true, languages: ['English', 'German'], bio: 'Specialized in international law. Happy to share tips on Austrian student visas.' },
];

const COUNTRY_LABELS = { us: 'United States', uk: 'United Kingdom', de: 'Germany', it: 'Italy', at: 'Austria' };

const WHATSAPP_LINK = process.env.REACT_APP_COMMUNITY_WHATSAPP_LINK || 'https://chat.whatsapp.com/F0R1TYMOr8dLwIbr5jLRau';
const TELEGRAM_LINK = process.env.REACT_APP_COMMUNITY_TELEGRAM_LINK || 'https://t.me/wehivecommunity';
const PHONE_NUMBER = process.env.REACT_APP_COMMUNITY_PHONE_NUMBER || '+919000734326';

export default function AlumniMentor({ compact = false }) {
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('all');

  const countries = [...new Set(SAMPLE_ALUMNI.map(a => a.country))];

  const filtered = SAMPLE_ALUMNI
    .filter(a => filterCountry === 'all' || a.country === filterCountry)
    .filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.university.toLowerCase().includes(search.toLowerCase()) || a.course.toLowerCase().includes(search.toLowerCase()));

  if (compact) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100/50 border border-violet-200 p-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] font-bold text-violet-700 mb-2">
          <Users className="w-3.5 h-3.5" /> Alumni Mentor Network
        </div>
        <p className="text-[13px] text-violet-800/70 mb-3">
          Connect with alumni from your target universities.
        </p>
        <Link to="/account?tab=mentors" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-violet-700 hover:text-violet-800">
          Find mentors <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8"
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-1">
        <Users className="w-3.5 h-3.5" /> Alumni Mentor Network
      </div>
      <h2 className="font-display font-extrabold text-[24px] text-[hsl(var(--blue-900))] mb-2">
        Connect with alumni
      </h2>
      <p className="text-[14px] text-[hsl(var(--blue-900))]/60 mb-6">
        Get guidance from former international students who studied at your target universities.
      </p>

      {/* Contact bar */}
      <div className="rounded-2xl bg-gradient-to-r from-[hsl(var(--blue-50))] to-[hsl(var(--blue-100))] border border-[hsl(var(--blue-200))] p-4 mb-6 flex flex-wrap items-center gap-3">
        <span className="text-[12px] font-bold text-[hsl(var(--blue-700))]">Reach out via:</span>
        <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-600 text-white text-[12px] font-bold hover:bg-green-700 transition">
          <MessageCircle className="w-4 h-4" /> WhatsApp Community
        </a>
        <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-[12px] font-bold hover:bg-blue-700 transition">
          <Send className="w-4 h-4" /> Telegram Group
        </a>
        <a href={`tel:${PHONE_NUMBER}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--blue-700))] text-white text-[12px] font-bold hover:bg-[hsl(var(--blue-500))] transition">
          <Phone className="w-4 h-4" /> Call {PHONE_NUMBER}
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--blue-900))]/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, university, or course..."
            className="w-full h-11 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none pl-10 pr-4 text-[14px] text-[hsl(var(--blue-900))]"
          />
        </div>
        <div className="inline-flex rounded-full bg-[hsl(var(--soft-bg))] p-1 flex-wrap">
          <button
            onClick={() => setFilterCountry('all')}
            className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition ${filterCountry === 'all' ? 'bg-white text-[hsl(var(--blue-900))] shadow-sm' : 'text-[hsl(var(--blue-900))]/50'}`}
          >
            All
          </button>
          {countries.map(c => (
            <button
              key={c}
              onClick={() => setFilterCountry(c)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition ${filterCountry === c ? 'bg-white text-[hsl(var(--blue-900))] shadow-sm' : 'text-[hsl(var(--blue-900))]/50'}`}
            >
              {COUNTRY_LABELS[c] || c.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((alum, i) => (
          <motion.div
            key={alum.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-black/5 bg-white hover:border-[hsl(var(--blue-700))]/20 hover:shadow-lg transition-all overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] p-5 text-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-bold">
                  {alum.avatar}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[16px] truncate">{alum.name}</h3>
                  <div className="text-[12px] text-white/70 inline-flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" /> {alum.university}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px] text-[hsl(var(--blue-900))]/55">
                  <BookOpen className="w-3 h-3" /> {alum.course}
                </div>
                <div className="flex items-center gap-1 text-[12px] font-bold text-amber-600">
                  <Star className="w-3 h-3 fill-current" /> {alum.rating} ({alum.reviews})
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-[hsl(var(--blue-900))]/55">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--soft-bg))]">{COUNTRY_LABELS[alum.country] || alum.country.toUpperCase()}</span>
              </div>
              <div className="mt-2 text-[12.5px] text-[hsl(var(--blue-900))]/65 line-clamp-2">{alum.bio}</div>
              <div className="mt-1 text-[12px] text-[hsl(var(--blue-900))]/55">{alum.current_role}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {alum.languages.map(l => (
                  <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))]/60">{l}</span>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-black/5">
                <div className="text-[11px] font-bold text-[hsl(var(--blue-900))]/50 mb-2">Connect via:</div>
                <div className="flex gap-2">
                  <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-green-600 text-white text-[11px] font-bold h-9 hover:bg-green-700 transition">
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                  <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 text-white text-[11px] font-bold h-9 hover:bg-blue-700 transition">
                    <Send className="w-3.5 h-3.5" /> Telegram
                  </a>
                  <a href={`tel:${PHONE_NUMBER}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[hsl(var(--blue-700))] text-white text-[11px] font-bold h-9 hover:bg-[hsl(var(--blue-500))] transition">
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-black/10 p-8 text-center">
          <Users className="w-10 h-10 text-[hsl(var(--blue-900))]/30 mx-auto" />
          <p className="mt-3 text-[14px] text-[hsl(var(--blue-900))]/60">No mentors match your search.</p>
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-[hsl(var(--soft-bg))] p-5 text-center">
        <p className="text-[13px] text-[hsl(var(--blue-900))]/60">
          Want to connect directly? Join our community on{' '}
          <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="text-green-700 font-bold hover:underline">WhatsApp</a>
          {' '}or{' '}
          <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer" className="text-blue-700 font-bold hover:underline">Telegram</a>
          {' '}to speak with alumni and counsellors instantly. You can also call us at{' '}
          <a href={`tel:${PHONE_NUMBER}`} className="text-[hsl(var(--blue-700))] font-bold hover:underline">{PHONE_NUMBER}</a>.
        </p>
      </div>
    </motion.div>
  );
}

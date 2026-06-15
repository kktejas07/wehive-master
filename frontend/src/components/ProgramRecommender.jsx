import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, GraduationCap, DollarSign, Globe, Star, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API } from '../context/AuthContext';
import axios from 'axios';

const SAMPLE_UNIVERSITIES = [
  { _id: 's1', id: 'mit', name: 'Massachusetts Institute of Technology', short_name: 'MIT', country: 'USA', flag: '🇺🇸', rank: 1, tuition_usd: 55790 },
  { _id: 's2', id: 'stanford', name: 'Stanford University', short_name: 'Stanford', country: 'USA', flag: '🇺🇸', rank: 3, tuition_usd: 56169 },
  { _id: 's3', id: 'harvard', name: 'Harvard University', short_name: 'Harvard', country: 'USA', flag: '🇺🇸', rank: 2, tuition_usd: 55807 },
  { _id: 's4', id: 'oxford', name: 'University of Oxford', short_name: 'Oxford', country: 'United Kingdom', flag: '🇬🇧', rank: 2, tuition_usd: 35000 },
  { _id: 's5', id: 'cambridge', name: 'University of Cambridge', short_name: 'Cambridge', country: 'United Kingdom', flag: '🇬🇧', rank: 3, tuition_usd: 34000 },
  { _id: 's6', id: 'imperial', name: 'Imperial College London', short_name: 'Imperial', country: 'United Kingdom', flag: '🇬🇧', rank: 10, tuition_usd: 33000 },
  { _id: 's7', id: 'tum', name: 'Technical University of Munich', short_name: 'TUM', country: 'Germany', flag: '🇩🇪', rank: 50, tuition_usd: 0 },
  { _id: 's8', id: 'lmu', name: 'LMU Munich', short_name: 'LMU Munich', country: 'Germany', flag: '🇩🇪', rank: 45, tuition_usd: 0 },
  { _id: 's9', id: 'polimi', name: 'Polytechnic University of Milan', short_name: 'Polimi', country: 'Italy', flag: '🇮🇹', rank: 145, tuition_usd: 4000 },
  { _id: 's10', id: 'unibo', name: 'University of Bologna', short_name: 'Unibo', country: 'Italy', flag: '🇮🇹', rank: 120, tuition_usd: 4000 },
];

const COURSES = ['Computer Science', 'Business Administration', 'Engineering', 'Data Science', 'Medicine', 'Law', 'Architecture', 'Nursing', 'Finance', 'Design', 'Psychology', 'Education'];
const COUNTRIES = ['Canada', 'United Kingdom', 'Australia', 'Germany', 'USA', 'Ireland', 'Netherlands', 'New Zealand', 'France', 'Singapore'];
const BUDGET_OPTIONS = [
  { label: 'Under $15K/yr', value: 15000 },
  { label: '$15K–$30K/yr', value: 30000 },
  { label: '$30K–$50K/yr', value: 50000 },
  { label: 'No limit', value: 999999 },
];
const IELTS_OPTIONS = ['5.5', '6.0', '6.5', '7.0', '7.5+'];

function ToggleChip({ label, selected, onClick }) {
  return (
    <button onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition ${selected ? 'bg-[hsl(var(--accent))] text-white' : 'bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))]/60 hover:bg-[hsl(var(--blue-50))]'}`}>
      {label}
    </button>
  );
}

function UniCard({ uni, rank }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: rank * 0.07 }}
      className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white px-5 py-4 hover:border-[hsl(var(--blue-700))]/20 hover:shadow-sm transition">
      <div className="w-9 h-9 rounded-xl bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] font-bold text-[14px] flex items-center justify-center shrink-0">
        #{rank + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[14.5px] text-[hsl(var(--blue-900))] truncate">{uni.name}</div>
        <div className="text-[12px] text-[hsl(var(--blue-900))]/55 flex items-center gap-2 flex-wrap mt-0.5">
          <span>{uni.flag || uni.country}</span>
          <span>{uni.country}</span>
          {uni.rank && <span>World #{uni.rank}</span>}
          {uni.tuition_usd && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${uni.tuition_usd.toLocaleString()}/yr</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {uni.match_score && (
          <div className="flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-[11px] font-bold">
            <Star className="w-3 h-3" /> {uni.match_score}%
          </div>
        )}
        <Link to={`/university/${uni.id || uni._id}`} className="inline-flex items-center gap-1 text-[12px] font-bold text-[hsl(var(--blue-700))] hover:underline">
          View <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </motion.div>
  );
}

export default function ProgramRecommender() {
  const [form, setForm] = useState({
    courses: [],
    countries: [],
    budget: 30000,
    ielts: '6.5',
    level: 'Masters',
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const toggle = (field, val) =>
    setForm(f => ({ ...f, [field]: f[field].includes(val) ? f[field].filter(v => v !== val) : [...f[field], val] }));

  const search = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (form.countries.length) params.set('country', form.countries[0]);
      if (form.courses.length) params.set('course', form.courses[0]);
      params.set('limit', '20');
      const res = await axios.get(`${API}/universities?${params}`);
      let unis = res.data || [];
      unis = unis
        .filter(u => !form.budget || (u.tuition_usd || 0) <= form.budget)
        .map(u => ({
          ...u,
          match_score: Math.max(60, Math.min(99, 99 - (u.rank || 300) / 10 + Math.random() * 15 | 0)),
        }))
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 8);
      setResults(unis);
    } catch {
      let unis = SAMPLE_UNIVERSITIES
        .filter(u => !form.countries.length || form.countries.some(c => u.country.includes(c) || c.includes(u.country)))
        .filter(u => !form.budget || (u.tuition_usd || 0) <= form.budget)
        .map(u => ({
          ...u,
          match_score: Math.max(60, Math.min(99, 99 - (u.rank || 300) / 10 + Math.random() * 15 | 0)),
        }))
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 8);
      setResults(unis);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-[hsl(var(--soft-bg))] border border-black/5 p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[hsl(var(--accent))]" />
          <span className="font-bold text-[16px] text-[hsl(var(--blue-900))]">Find Your Best-Fit Universities</span>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-2">Study Level</div>
          <div className="flex flex-wrap gap-2">
            {['Diploma', 'Bachelor', 'Masters', 'PhD'].map(l => (
              <ToggleChip key={l} label={l} selected={form.level === l} onClick={() => setForm(f => ({ ...f, level: l }))} />
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-2">Course / Field (pick up to 3)</div>
          <div className="flex flex-wrap gap-2">
            {COURSES.map(c => (
              <ToggleChip key={c} label={c} selected={form.courses.includes(c)}
                onClick={() => form.courses.length < 3 || form.courses.includes(c) ? toggle('courses', c) : null} />
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-2">Target Countries (pick up to 3)</div>
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map(c => (
              <ToggleChip key={c} label={c} selected={form.countries.includes(c)}
                onClick={() => form.countries.length < 3 || form.countries.includes(c) ? toggle('countries', c) : null} />
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-2">Annual Budget</div>
            <div className="flex flex-wrap gap-2">
              {BUDGET_OPTIONS.map(b => (
                <ToggleChip key={b.value} label={b.label} selected={form.budget === b.value}
                  onClick={() => setForm(f => ({ ...f, budget: b.value }))} />
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-2">IELTS Score</div>
            <div className="flex flex-wrap gap-2">
              {IELTS_OPTIONS.map(s => (
                <ToggleChip key={s} label={s} selected={form.ielts === s} onClick={() => setForm(f => ({ ...f, ielts: s }))} />
              ))}
            </div>
          </div>
        </div>

        <button onClick={search} disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] hover:opacity-90 text-white font-bold text-[14px] px-6 py-3 transition disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Finding matches…' : 'Find Matching Universities'}
        </button>
      </div>

      <AnimatePresence>
        {searched && !loading && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-3">
              {results?.length ? `${results.length} matches found` : 'No matches — try adjusting filters'}
            </div>
            <div className="space-y-2">
              {results?.map((uni, i) => <UniCard key={uni._id || uni.id || i} uni={uni} rank={i} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

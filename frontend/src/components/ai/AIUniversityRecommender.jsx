import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Loader2, ArrowRight, GraduationCap, DollarSign, Globe, BookOpen, Target, X } from 'lucide-react';
import { useAuth, API } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import axios from 'axios';

const COURSES = [
  { id: 'stem', label: 'STEM' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'business', label: 'Business' },
  { id: 'medicine', label: 'Medicine' },
  { id: 'law', label: 'Law' },
  { id: 'arts', label: 'Arts' },
  { id: 'social', label: 'Social Sciences' },
];

export default function AIUniversityRecommender({ open, onClose }) {
  const { token } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState('form');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);

  const [budget, setBudget] = useState(30000);
  const [country, setCountry] = useState('');
  const [preferredCourses, setPreferredCourses] = useState([]);
  const [ieltsScore, setIeltsScore] = useState('');
  const [scholarshipsOnly, setScholarshipsOnly] = useState(false);
  const [preferences, setPreferences] = useState('');

  const toggleCourse = (id) => {
    setPreferredCourses(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleRecommend = async () => {
    setBusy(true);
    try {
      const body = {
        budget: Number(budget),
        preferred_courses: preferredCourses,
        scholarships_only: scholarshipsOnly,
      };
      if (country.trim()) body.country = country.trim().toLowerCase();
      if (ieltsScore) body.ielts_score = Number(ieltsScore);
      if (preferences.trim()) body.preferences = preferences.trim();

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await axios.post(`${API}/ai/universities/recommend`, body, { headers });
      setResults(data);
      setStep('results');
    } catch (e) {
      toast({ title: 'AI recommendation failed', description: e.response?.data?.detail || e.message });
    }
    setBusy(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="rounded-2xl bg-white border border-black/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b border-black/5">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-[16px] text-[hsl(var(--blue-900))]">AI University Recommender</h3>
              <p className="text-[11px] text-[hsl(var(--blue-900))]/50">Personalized matches powered by AI</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-black/5 hover:bg-black/10 flex items-center justify-center">
            <X className="w-4 h-4 text-[hsl(var(--blue-900))]" />
          </button>
        </div>

        {step === 'form' && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold text-[hsl(var(--blue-900))] mb-1">
                  <DollarSign className="w-3.5 h-3.5 inline mr-1" /> Budget (USD/year)
                </label>
                <input type="number" value={budget} onChange={e => setBudget(e.target.value)} className="w-full h-10 px-4 rounded-xl bg-[hsl(var(--blue-50))] border border-black/10 text-[14px] text-[hsl(var(--blue-900))] outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[hsl(var(--blue-900))] mb-1">
                  <Globe className="w-3.5 h-3.5 inline mr-1" /> Preferred Country
                </label>
                <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="us, gb, de... or leave blank" className="w-full h-10 px-4 rounded-xl bg-[hsl(var(--blue-50))] border border-black/10 text-[14px] text-[hsl(var(--blue-900))] outline-none focus:border-purple-500" />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[hsl(var(--blue-900))] mb-2">
                <BookOpen className="w-3.5 h-3.5 inline mr-1" /> Preferred Courses
              </label>
              <div className="flex flex-wrap gap-2">
                {COURSES.map(c => (
                  <button key={c.id} onClick={() => toggleCourse(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                      preferredCourses.includes(c.id)
                        ? 'bg-purple-600 text-white'
                        : 'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-900))] hover:bg-[hsl(var(--blue-100))]'
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold text-[hsl(var(--blue-900))] mb-1">
                  <Target className="w-3.5 h-3.5 inline mr-1" /> IELTS Score
                </label>
                <input type="number" step="0.5" min="0" max="9" value={ieltsScore} onChange={e => setIeltsScore(e.target.value)} placeholder="e.g. 6.5" className="w-full h-10 px-4 rounded-xl bg-[hsl(var(--blue-50))] border border-black/10 text-[14px] text-[hsl(var(--blue-900))] outline-none focus:border-purple-500" />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-[12px] font-bold text-[hsl(var(--blue-900))] cursor-pointer">
                  <input type="checkbox" checked={scholarshipsOnly} onChange={e => setScholarshipsOnly(e.target.checked)} className="w-4 h-4 accent-purple-600" />
                  <GraduationCap className="w-3.5 h-3.5" /> Scholarships only
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[hsl(var(--blue-900))] mb-1">Additional preferences (optional)</label>
              <textarea value={preferences} onChange={e => setPreferences(e.target.value)} placeholder="e.g. I prefer campuses in big cities, want strong CS programs, need on-campus housing..." rows={2} className="w-full px-4 py-2 rounded-xl bg-[hsl(var(--blue-50))] border border-black/10 text-[13px] text-[hsl(var(--blue-900))] outline-none focus:border-purple-500 resize-none" />
            </div>

            <button onClick={handleRecommend} disabled={busy}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:brightness-110 disabled:opacity-50 text-white font-extrabold text-[14px] flex items-center justify-center gap-2">
              {busy ? <><Loader2 className="w-5 h-5 animate-spin" /> Finding matches...</> : <><Sparkles className="w-5 h-5" /> Get AI Recommendations</>}
            </button>
          </div>
        )}

        {step === 'results' && results && (
          <div className="p-5">
            {results.note && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[13px] text-amber-800">{results.note}</div>
            )}
            {results.recommendations && results.recommendations.length > 0 ? (
              <div className="space-y-3">
                {results.recommendations.map((uni, idx) => (
                  <div key={uni.id} className="rounded-xl bg-[hsl(var(--blue-50))] p-4 border border-black/5 hover:border-purple-300 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">#{idx + 1}</span>
                          <h4 className="font-bold text-[15px] text-[hsl(var(--blue-900))] truncate">{uni.name}</h4>
                        </div>
                        <p className="text-[12px] text-[hsl(var(--blue-900))]/60 mt-0.5">{uni.country} · Rank #{uni.rank} · ${uni.tuition_usd?.toLocaleString()}/yr</p>
                      </div>
                      {uni.fit_score && (
                        <div className="shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-extrabold text-[18px]">
                          {uni.fit_score}
                        </div>
                      )}
                    </div>
                    {uni.reason && <p className="mt-2 text-[13px] text-[hsl(var(--blue-900))]/70 leading-relaxed">{uni.reason}</p>}
                    {uni.strengths && uni.strengths.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {uni.strengths.map((s, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{s}</span>
                        ))}
                      </div>
                    )}
                    <Link to={`/university/${uni.id}`} className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-purple-600 hover:underline">
                      View profile <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[hsl(var(--blue-900))]/50">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-[15px] font-bold">No recommendations found</p>
                <p className="text-[13px] mt-1">Try broadening your criteria.</p>
              </div>
            )}
            <button onClick={() => setStep('form')} className="mt-4 w-full h-10 rounded-xl bg-[hsl(var(--blue-50))] hover:bg-[hsl(var(--blue-100))] text-[hsl(var(--blue-900))] font-bold text-[13px]">
              Refine search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

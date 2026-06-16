import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Award, DollarSign, Star, CheckCircle2, XCircle,
  Loader2, ChevronRight, Sparkles, GraduationCap,
  BookOpen, TrendingUp, Calculator,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';

const CACHE_KEY = 'wehive_universities_cache';

const SCHOLARSHIP_TYPES = [
  {
    id: 'merit',
    label: 'Merit-based',
    description: 'Awarded based on academic excellence',
    icon: Star,
    color: 'bg-amber-500',
  },
  {
    id: 'need',
    label: 'Need-based',
    description: 'Awarded based on financial need',
    icon: DollarSign,
    color: 'bg-emerald-500',
  },
  {
    id: 'sports',
    label: 'Sports',
    description: 'For student-athletes',
    icon: TrendingUp,
    color: 'bg-blue-500',
  },
  {
    id: 'research',
    label: 'Research',
    description: 'For research-oriented students',
    icon: BookOpen,
    color: 'bg-violet-500',
  },
];

function calculateEligibility(uni, profile) {
  if (!uni.scholarships) return null;
  let score = 0;
  const reasons = [];
  if (profile.gpa >= 3.5) { score += 25; reasons.push('High GPA'); }
  if (profile.gpa >= 3.0) { score += 15; reasons.push('Good GPA'); }
  if (profile.ielts >= uni.ielts_min) { score += 20; reasons.push('Meets IELTS requirement'); }
  if ((profile.gre || profile.gmat) && uni.gre_required) { score += 15; reasons.push('Test scores ready'); }
  if (profile.extracurriculars) { score += 10; reasons.push('Extracurricular involvement'); }
  if (profile.work_experience_years >= 2) { score += 10; reasons.push('Work experience'); }
  if (profile.research_experience) { score += 10; reasons.push('Research experience'); }
  return { score: Math.min(100, score), reasons, eligible: score >= 50 };
}

export default function ScholarshipMatcher({ universities, compact = false }) {
  const [profile, setProfile] = useState({
    gpa: 3.0,
    ielts: 6.5,
    gre: false,
    gmat: false,
    extracurriculars: false,
    work_experience_years: 0,
    research_experience: false,
    budget: 30000,
  });
  const [showForm, setShowForm] = useState(false);
  const [allUniversities, setAllUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (compact) return;
    if (universities && universities.length > 0) {
      setAllUniversities(universities);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      setAllUniversities(JSON.parse(cached));
      setLoading(false);
    }
    axios.get(`${API}/universities?scholarships=true&limit=15000`)
      .then(res => {
        if (!cancelled) {
          const data = res.data || [];
          setAllUniversities(data);
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
          setFetchError(false);
        }
      })
      .catch(() => { if (!cancelled) setFetchError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [compact, universities]);

  const stats = useMemo(() => {
    const countries = new Set(allUniversities.map(u => u.country).filter(Boolean));
    return { total: allUniversities.length, countries: countries.size };
  }, [allUniversities]);

  const filtered = useMemo(() => {
    return allUniversities
      .filter(u => u.scholarships)
      .map(u => ({ ...u, eligibility: calculateEligibility(u, profile) }))
      .filter(u => u.eligibility !== null && u.eligibility.eligible)
      .sort((a, b) => (b.eligibility?.score || 0) - (a.eligibility?.score || 0));
  }, [allUniversities, profile]);

  if (compact) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 p-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] font-bold text-amber-700 mb-2">
          <Sparkles className="w-3.5 h-3.5" /> Scholarship Matcher
        </div>
        <p className="text-[13px] text-amber-800/70 mb-3">
          Find universities offering scholarships that match your profile.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-amber-700 hover:text-amber-800"
        >
          Check eligibility <ChevronRight className="w-3.5 h-3.5" />
        </button>
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
        <Award className="w-3.5 h-3.5" /> Scholarship Matcher
      </div>
      <h2 className="font-display font-extrabold text-[24px] text-[hsl(var(--blue-900))] mb-2">
        Am I eligible?
      </h2>
      <p className="text-[14px] text-[hsl(var(--blue-900))]/60 mb-6">
        Enter your profile to see which universities match you for scholarships.
      </p>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-[hsl(var(--soft-bg))] p-5 space-y-4">
            <h3 className="text-[13px] font-bold text-[hsl(var(--blue-900))]">Your Profile</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">GPA (4.0 scale)</label>
                <input
                  type="range"
                  min="0"
                  max="4.0"
                  step="0.1"
                  value={profile.gpa}
                  onChange={(e) => setProfile(p => ({ ...p, gpa: parseFloat(e.target.value) }))}
                  className="w-full accent-[hsl(var(--accent))]"
                />
                <div className="text-[13px] font-bold text-[hsl(var(--blue-900))] mt-1">{profile.gpa.toFixed(1)}</div>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">IELTS Score</label>
                <input
                  type="range"
                  min="0"
                  max="9"
                  step="0.5"
                  value={profile.ielts}
                  onChange={(e) => setProfile(p => ({ ...p, ielts: parseFloat(e.target.value) }))}
                  className="w-full accent-[hsl(var(--accent))]"
                />
                <div className="text-[13px] font-bold text-[hsl(var(--blue-900))] mt-1">{profile.ielts.toFixed(1)}</div>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">Work Experience</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={profile.work_experience_years}
                  onChange={(e) => setProfile(p => ({ ...p, work_experience_years: parseInt(e.target.value) }))}
                  className="w-full accent-[hsl(var(--accent))]"
                />
                <div className="text-[13px] font-bold text-[hsl(var(--blue-900))] mt-1">{profile.work_experience_years} years</div>
              </div>
              <div className="space-y-2">
                {[
                  { key: 'extracurriculars', label: 'Extracurriculars' },
                  { key: 'research_experience', label: 'Research Experience' },
                  { key: 'gre', label: 'GRE Score Ready' },
                  { key: 'gmat', label: 'GMAT Score Ready' },
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile[item.key]}
                      onChange={(e) => setProfile(p => ({ ...p, [item.key]: e.target.checked }))}
                      className="w-4 h-4 accent-[hsl(var(--accent))]"
                    />
                    <span className="text-[13px] text-[hsl(var(--blue-900))]/70">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 p-4">
            <div className="flex items-center gap-2 text-[12px] font-bold text-amber-800">
              <Calculator className="w-4 h-4" />
              {loading ? 'Loading universities...' : fetchError === true ? `Showing cached data (${stats.total} universities, ${stats.countries} countries)` : `${filtered.length} of ${stats.total} universities match your profile · ${stats.countries} countries`}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {loading ? (
            <div className="rounded-2xl border-2 border-dashed border-black/10 p-8 text-center">
              <Loader2 className="w-10 h-10 text-[hsl(var(--blue-900))]/30 mx-auto animate-spin" />
              <p className="mt-3 text-[14px] text-[hsl(var(--blue-900))]/60">
                Loading universities...
              </p>
            </div>
          ) : fetchError && allUniversities.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-red-200 p-8 text-center">
              <XCircle className="w-10 h-10 text-red-300 mx-auto" />
              <p className="mt-3 text-[14px] text-red-600 font-medium">
                Unable to load university data. Please try again later.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-black/10 p-8 text-center">
              <Award className="w-10 h-10 text-[hsl(var(--blue-900))]/30 mx-auto" />
              <p className="mt-3 text-[14px] text-[hsl(var(--blue-900))]/60">
                No scholarship matches yet. Try adjusting your profile.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.slice(0, 10).map((uni) => (
                <div key={uni.id} className="rounded-2xl border border-black/5 p-4 hover:border-[hsl(var(--blue-700))]/20 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {uni.short_name?.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <Link to={`/university/${uni.id}`} className="font-bold text-[14px] text-[hsl(var(--blue-900))] hover:underline block truncate">
                          {uni.short_name}
                        </Link>
                        <div className="text-[12px] text-[hsl(var(--blue-900))]/55">{uni.name}</div>
                      </div>
                    </div>
                    <div className="shrink-0 text-center">
                      <div className={`text-[20px] font-display font-extrabold ${uni.eligibility?.score >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {uni.eligibility?.score}%
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/40">Match</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(uni.eligibility?.reasons || []).slice(0, 3).map(r => (
                      <span key={r} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" />
                        {r}
                      </span>
                    ))}
                  </div>
                  {Array.isArray(uni.scholarships) && uni.scholarships.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {uni.scholarships.slice(0, 2).map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[12px] text-[hsl(var(--blue-900))]/70">
                          <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">{s.name || 'Scholarship'}</span>
                          {s.amount && <span className="font-bold text-emerald-600 shrink-0">${s.amount.toLocaleString()}</span>}
                        </div>
                      ))}
                      {uni.scholarships.length > 2 && (
                        <div className="text-[11px] text-[hsl(var(--blue-900))]/40 pl-5">+{uni.scholarships.length - 2} more</div>
                      )}
                    </div>
                  )}
                  {!Array.isArray(uni.scholarships) && uni.scholarships === true && (
                    <div className="mt-2 flex items-center gap-1.5 text-[12px] text-amber-700">
                      <Award className="w-3.5 h-3.5 shrink-0" />
                      Scholarships available
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[12px] text-[hsl(var(--blue-900))]/55">
                      Tuition: {uni.tuition_usd === 0 ? 'Free' : `$${uni.tuition_usd?.toLocaleString()}`}
                      {uni.living_cost_usd ? ` · Living: $${uni.living_cost_usd?.toLocaleString()}` : ''}
                    </span>
                    <Link
                      to={`/university/${uni.id}`}
                      className="inline-flex items-center gap-1 text-[12px] font-bold text-[hsl(var(--blue-700))] hover:underline"
                    >
                      View <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

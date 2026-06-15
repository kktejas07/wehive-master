import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Award, DollarSign, Star, CheckCircle2, XCircle,
  Loader2, ChevronRight, Sparkles, GraduationCap,
  BookOpen, TrendingUp, Calculator,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SAMPLE_UNIVERSITIES = [
  { id: 'mit', short_name: 'MIT', name: 'Massachusetts Institute of Technology', country: 'US', flag: '🇺🇸', rank: 1, tuition_usd: 55790, living_cost_usd: 18000, scholarships: true, ielts_min: 7.0, gre_required: true },
  { id: 'stanford', short_name: 'Stanford', name: 'Stanford University', country: 'US', flag: '🇺🇸', rank: 3, tuition_usd: 56169, living_cost_usd: 22000, scholarships: true, ielts_min: 7.0, gre_required: true },
  { id: 'harvard', short_name: 'Harvard', name: 'Harvard University', country: 'US', flag: '🇺🇸', rank: 2, tuition_usd: 55807, living_cost_usd: 20000, scholarships: true, ielts_min: 7.5, gre_required: false },
  { id: 'oxford', short_name: 'Oxford', name: 'University of Oxford', country: 'UK', flag: '🇬🇧', rank: 2, tuition_usd: 35000, living_cost_usd: 15000, scholarships: true, ielts_min: 7.0, gre_required: false },
  { id: 'cambridge', short_name: 'Cambridge', name: 'University of Cambridge', country: 'UK', flag: '🇬🇧', rank: 3, tuition_usd: 34000, living_cost_usd: 14000, scholarships: true, ielts_min: 7.0, gre_required: false },
  { id: 'imperial', short_name: 'Imperial', name: 'Imperial College London', country: 'UK', flag: '🇬🇧', rank: 10, tuition_usd: 33000, living_cost_usd: 15000, scholarships: true, ielts_min: 6.5, gre_required: false },
  { id: 'tum', short_name: 'TUM', name: 'Technical University of Munich', country: 'DE', flag: '🇩🇪', rank: 50, tuition_usd: 0, living_cost_usd: 12000, scholarships: true, ielts_min: 6.5, gre_required: false },
  { id: 'lmu', short_name: 'LMU Munich', name: 'Ludwig Maximilian University of Munich', country: 'DE', flag: '🇩🇪', rank: 45, tuition_usd: 0, living_cost_usd: 12000, scholarships: true, ielts_min: 6.5, gre_required: false },
  { id: 'polimi', short_name: 'Polimi', name: 'Polytechnic University of Milan', country: 'IT', flag: '🇮🇹', rank: 145, tuition_usd: 4000, living_cost_usd: 10000, scholarships: true, ielts_min: 6.0, gre_required: false },
  { id: 'unibo', short_name: 'Unibo', name: 'University of Bologna', country: 'IT', flag: '🇮🇹', rank: 120, tuition_usd: 4000, living_cost_usd: 9000, scholarships: true, ielts_min: 6.0, gre_required: false },
  { id: 'tuwien', short_name: 'TU Vienna', name: 'TU Wien', country: 'AT', flag: '🇦🇹', rank: 180, tuition_usd: 0, living_cost_usd: 11000, scholarships: true, ielts_min: 6.5, gre_required: false },
  { id: 'uniwien', short_name: 'Uni Wien', name: 'University of Vienna', country: 'AT', flag: '🇦🇹', rank: 150, tuition_usd: 0, living_cost_usd: 11000, scholarships: true, ielts_min: 6.5, gre_required: false },
  { id: 'uw', short_name: 'UW', name: 'University of Warsaw', country: 'PL', flag: '🇵🇱', rank: 260, tuition_usd: 5000, living_cost_usd: 8000, scholarships: true, ielts_min: 6.5, gre_required: false },
  { id: 'jagiellonian', short_name: 'JU', name: 'Jagiellonian University', country: 'PL', flag: '🇵🇱', rank: 240, tuition_usd: 4500, living_cost_usd: 7500, scholarships: true, ielts_min: 6.5, gre_required: false },
  { id: 'nova', short_name: 'NOVA', name: 'NOVA University Lisbon', country: 'PT', flag: '🇵🇹', rank: 300, tuition_usd: 6000, living_cost_usd: 9000, scholarships: true, ielts_min: 6.5, gre_required: false },
];

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
  const data = universities && universities.length > 0 ? universities : SAMPLE_UNIVERSITIES;
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

  const filtered = useMemo(() => {
    return data
      .filter(u => u.scholarships)
      .map(u => ({ ...u, eligibility: calculateEligibility(u, profile) }))
      .filter(u => u.eligibility !== null && u.eligibility.eligible)
      .sort((a, b) => (b.eligibility?.score || 0) - (a.eligibility?.score || 0));
  }, [data, profile]);

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
              {filtered.length} universities match your profile
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {filtered.length === 0 ? (
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
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] flex items-center justify-center text-2xl shrink-0">
                        {uni.flag}
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
                  <div className="mt-3 flex items-center justify-between">
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

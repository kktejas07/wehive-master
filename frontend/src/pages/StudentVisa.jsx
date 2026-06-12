import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { inr } from '../lib/utils';
import {
  GraduationCap, Clock, Briefcase, Globe2, Calendar, Award,
  ChevronRight, Loader2, Check, BookOpen, Users, Star, ArrowRight,
  Globe, MapPin, Visa, FileText, Shield, Zap, Search, Filter,
  Atom, Cog, Heart, Scale, Palette, BookMarked, MessageCircle,
  Sparkles, Target, Calculator, Home, DollarSign, TrendingUp,
  BarChart3, Info, ExternalLink,
} from 'lucide-react';
import axios from 'axios';

const STUDENT_COUNTRIES = [
  { id: 'us', name: 'United States', flag: '🇺🇸', code: 'US' },
  { id: 'uk', name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  { id: 'de', name: 'Germany', flag: '🇩🇪', code: 'DE' },
  { id: 'it', name: 'Italy', flag: '🇮🇹', code: 'IT' },
  { id: 'es', name: 'Spain', flag: '🇪🇸', code: 'ES' },
  { id: 'pl', name: 'Poland', flag: '🇵🇱', code: 'PL' },
  { id: 'at', name: 'Austria', flag: '🇦🇹', code: 'AT' },
  { id: 'pt', name: 'Portugal', flag: '🇵🇹', code: 'PT' },
  { id: 'gr', name: 'Greece', flag: '🇬🇷', code: 'GR' },
  { id: 'hr', name: 'Croatia', flag: '🇭🇷', code: 'HR' },
];

const INTAKE_TIMES = [
  {
    season: 'Fall Intake',
    months: 'Aug – Sep',
    applyBy: 'Apr – May',
    description: 'The biggest intake worldwide. Slot pressure peaks in June-July.',
    countries: 'US, UK, Germany, Italy, Spain & more',
    color: 'bg-amber-500',
  },
  {
    season: 'Spring Intake',
    months: 'Jan – Feb',
    applyBy: 'Sep – Oct',
    description: 'Smaller cohorts, faster decisions. Great backup if Fall slipped.',
    countries: 'US, UK, Germany, Italy, Poland & more',
    color: 'bg-blue-500',
  },
  {
    season: 'Summer Intake',
    months: 'May – Jun',
    applyBy: 'Feb – Mar',
    description: 'Niche programs only — short courses, specific masters.',
    countries: 'Limited (mostly UK, Spain, Croatia)',
    color: 'bg-emerald-500',
  },
];

const DOCUMENTS = [
  { icon: FileText, title: 'Passport', desc: 'Valid for the entire duration of your course, minimum 6 months validity' },
  { icon: BookOpen, title: 'Admission Proof', desc: 'I-20 (USA), CAS (UK), or university admission letter (Europe)' },
  { icon: Shield, title: 'Financial Proof', desc: 'Bank statements, fixed deposits, education loan or sponsor docs' },
  { icon: Star, title: 'Visa Photo', desc: 'Recent passport-size photo meeting embassy specifications' },
];

const COURSE_CATEGORIES = [
  { id: 'stem', label: 'STEM', icon: Atom, description: 'Science, Technology, Engineering, Mathematics' },
  { id: 'engineering', label: 'Engineering', icon: Cog, description: 'Mechanical, Electrical, Civil, Computer' },
  { id: 'business', label: 'Business', icon: Briefcase, description: 'MBA, Finance, Marketing, Management' },
  { id: 'medicine', label: 'Medicine', icon: Heart, description: 'MBBS, Pharmacy, Nursing, Public Health' },
  { id: 'law', label: 'Law', icon: Scale, description: 'LLB, LLM, International Law' },
  { id: 'arts', label: 'Arts', icon: Palette, description: 'Design, Fine Arts, Architecture' },
  { id: 'social', label: 'Social Sciences', icon: BookMarked, description: 'Economics, Psychology, Sociology' },
];

const COURSE_ID_TO_NAME = {
  stem: 'STEM',
  engineering: 'Engineering',
  business: 'Business',
  medicine: 'Medicine',
  law: 'Law',
  arts: 'Arts',
  social: 'Social Sciences',
};

const SCORE_REQUIREMENTS = [
  { id: 'ielts', label: 'IELTS', icon: BookOpen, min: '6.0', max: '7.5', avg: '6.5', format: 'Band score (0–9)', desc: 'Most widely accepted English test for student visas worldwide.' },
  { id: 'toefl', label: 'TOEFL', icon: Globe2, min: '80', max: '100', avg: '90', format: 'iBT score (0–120)', desc: 'Preferred by US universities. Accepted globally.' },
  { id: 'pte', label: 'PTE Academic', icon: Star, min: '50', max: '70', avg: '60', format: 'Score (10–90)', desc: 'Fast results (48 hrs). Accepted in UK, AU, NZ, CA.' },
  { id: 'gre', label: 'GRE', icon: BarChart3, min: '300', max: '330', avg: '315', format: 'Verbal + Quant (260–340)', desc: 'Required for most US graduate programs. Some EU schools accept.' },
  { id: 'gmat', label: 'GMAT', icon: TrendingUp, min: '550', max: '750', avg: '650', format: 'Score (200–800)', desc: 'Required for top MBA programs worldwide.' },
  { id: 'duolingo', label: 'Duolingo English', icon: Globe, min: '100', max: '130', avg: '115', format: 'Score (10–160)', desc: 'Affordable at-home test. Accepted by 4500+ institutions.' },
];

const ANNUAL_BUDGETS = [
  { country: 'us', name: 'United States', flag: '🇺🇸', tuition_min: 20000, tuition_max: 60000, living_min: 12000, living_max: 24000, currency: 'USD' },
  { country: 'uk', name: 'United Kingdom', flag: '🇬🇧', tuition_min: 15000, tuition_max: 38000, living_min: 12000, living_max: 18000, currency: 'GBP' },
  { country: 'de', name: 'Germany', flag: '🇩🇪', tuition_min: 0, tuition_max: 3000, living_min: 11000, living_max: 14000, currency: 'EUR' },
  { country: 'it', name: 'Italy', flag: '🇮🇹', tuition_min: 2000, tuition_max: 20000, living_min: 10000, living_max: 15000, currency: 'EUR' },
  { country: 'es', name: 'Spain', flag: '🇪🇸', tuition_min: 2000, tuition_max: 18000, living_min: 9000, living_max: 14000, currency: 'EUR' },
  { country: 'pl', name: 'Poland', flag: '🇵🇱', tuition_min: 2000, tuition_max: 8000, living_min: 6000, living_max: 10000, currency: 'EUR' },
  { country: 'at', name: 'Austria', flag: '🇦🇹', tuition_min: 0, tuition_max: 2000, living_min: 11000, living_max: 14000, currency: 'EUR' },
  { country: 'pt', name: 'Portugal', flag: '🇵🇹', tuition_min: 3000, tuition_max: 12000, living_min: 8000, living_max: 12000, currency: 'EUR' },
  { country: 'gr', name: 'Greece', flag: '🇬🇷', tuition_min: 2000, tuition_max: 8000, living_min: 7000, living_max: 11000, currency: 'EUR' },
  { country: 'hr', name: 'Croatia', flag: '🇭🇷', tuition_min: 2000, tuition_max: 6000, living_min: 7000, living_max: 10000, currency: 'EUR' },
];

function getDisplayCourses(popularCourses = []) {
  return popularCourses.map(c => COURSE_ID_TO_NAME[c] || c);
}

function CountryCard({ c, onSelect, selected }) {
  const meta = c.student_meta || {};
  return (
    <button
      onClick={() => onSelect(c.id)}
      className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-300 overflow-hidden group ${
        selected === c.id
          ? 'border-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))]'
          : 'border-black/5 hover:border-[hsl(var(--blue-700))]/30 bg-white hover:bg-[hsl(var(--blue-50))]'
      }`}
    >
      <div className="relative z-10">
        <div className="text-3xl mb-2">{c.flag}</div>
        <div className="font-bold text-[hsl(var(--blue-900))]">{c.name}</div>
        {meta.processing_weeks && (
          <div className="text-[12px] text-[hsl(var(--blue-900))]/60 mt-1">
            {meta.processing_weeks}
          </div>
        )}
      </div>
    </button>
  );
}

function ComparisonRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-black/5">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-4 h-4 text-[hsl(var(--accent))]" />}
        <span className="text-[14px] text-[hsl(var(--blue-900))]/70">{label}</span>
      </div>
      <span className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{value}</span>
    </div>
  );
}

function IntakeCard({ intake, index }) {
  return (
    <div className="relative pl-8">
      <div className={`absolute left-0 top-0 w-7 h-7 rounded-full ${intake.color} flex items-center justify-center text-white text-[12px] font-bold`}>
        {index + 1}
      </div>
      <div className="absolute left-[13px] top-7 bottom-0 w-px bg-black/10" />
      <div className="pb-8">
        <div className="flex items-baseline gap-3">
          <h3 className="text-[18px] font-bold text-[hsl(var(--blue-900))]">{intake.season}</h3>
          <span className="text-[13px] text-[hsl(var(--blue-900))]/60">{intake.months}</span>
        </div>
        <div className="text-[12px] font-bold text-[hsl(var(--accent))] mt-1">Apply by: {intake.applyBy}</div>
        <p className="text-[13.5px] text-[hsl(var(--blue-900))]/65 mt-2">{intake.description}</p>
        <div className="text-[12px] text-[hsl(var(--blue-900))]/55 mt-2">{intake.countries}</div>
      </div>
    </div>
  );
}

export default function StudentVisa() {
  const { token, isAuthed, openAuth } = useAuth();
  const { toast } = useToast();
  const [countries, setCountries] = useState([]);
  const [selected, setSelected] = useState('us');
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [showCourseSelector, setShowCourseSelector] = useState(false);

  useEffect(() => {
    axios.get(`${API}/countries`, { params: { limit: 100 } })
      .then(r => {
        const studentCountries = STUDENT_COUNTRIES.map(sc => {
          const found = (r.data || []).find(c => c.id === sc.id);
          return found ? { ...found, flag: sc.flag } : { id: sc.id, name: sc.name, flag: sc.flag, student_meta: null };
        });
        setCountries(studentCountries);
        setLoading(false);
      })
      .catch(() => {
        setCountries(STUDENT_COUNTRIES.map(sc => ({ id: sc.id, name: sc.name, flag: sc.flag, student_meta: null })));
        setLoading(false);
      });

    axios.get(`${API}/universities`, { params: { limit: 15000 } })
      .then(r => setUniversities(r.data || []))
      .catch(() => setUniversities([]));
  }, []);

  const selectedCountry = countries.find(c => c.id === selected) || countries[0];
  const studentMeta = selectedCountry?.student_meta || {};

  return (
    <div className="bg-white">
      <Navbar variant="light" />

      <section className="pt-28 pb-16 bg-gradient-to-br from-[hsl(var(--blue-900))] to-[hsl(var(--blue-700))] text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-white/70 mb-4">
            <GraduationCap className="w-4 h-4" />
            Student Visa Program
          </div>
          <h1 className="font-display font-extrabold text-[42px] sm:text-[56px] leading-[1.0] tracking-[-0.03em]">
            Study abroad.<br />
            <span className="text-[hsl(var(--accent))]">Sorted.</span>
          </h1>
          <p className="mt-4 text-[16px] text-white/70 max-w-xl">
            Apply for a student visa to the USA, UK, Germany, Italy, Spain and 7 more — with country-specific document review, slot priority, and an on-time guarantee.
          </p>
          <div className="flex flex-wrap gap-4 mt-8">
            <Button onClick={() => isAuthed ? null : openAuth('signup')} className="btn-accent h-12 px-6">
              Start my student visa <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" className="h-12 px-6 border-white/30 text-white hover:bg-white/10">
              Book free consultation
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[hsl(var(--soft-bg))]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <h2 className="font-display font-extrabold text-[32px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
            Student visa countries we support
          </h2>
          <p className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/60">
            Country-specific student visa guidance across {STUDENT_COUNTRIES.length} destinations.
          </p>

          {loading ? (
            <div className="mt-8 flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" />
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {countries.map(c => (
                <CountryCard key={c.id} c={c} onSelect={setSelected} selected={selected} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-white border-t border-black/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
                What do you want to study?
              </h2>
              <p className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/60">
                Select your course category to find the best universities for you
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowCourseSelector(!showCourseSelector)}
              className="text-[hsl(var(--blue-700))]"
            >
              {showCourseSelector ? 'Hide courses' : 'Browse all courses'}
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {COURSE_CATEGORIES.map((course, idx) => (
              <button
                key={course.id}
                onClick={() => setSelectedCourse(selectedCourse === course.id ? null : course.id)}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-300 overflow-hidden group ${
                  selectedCourse === course.id
                    ? 'border-[hsl(var(--blue-700))] shadow-lg shadow-[hsl(var(--blue-700))]/20 bg-[hsl(var(--blue-700))]'
                    : 'border-black/5 hover:border-[hsl(var(--blue-700))]/30 bg-white hover:bg-[hsl(var(--blue-50))]'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors duration-300 ${
                  selectedCourse === course.id
                    ? 'bg-white/20'
                    : 'bg-[hsl(var(--blue-50))]'
                }`}>
                  <course.icon className={`w-6 h-6 ${selectedCourse === course.id ? 'text-white' : 'text-[hsl(var(--blue-700))]'}`} />
                </div>
                <div className={`font-bold text-[hsl(var(--blue-900))] ${selectedCourse === course.id ? 'text-white' : ''}`}>{course.label}</div>
                <div className={`text-[12px] mt-1 ${selectedCourse === course.id ? 'text-white/80' : 'text-[hsl(var(--blue-900))]/60'}`}>{course.description}</div>
              </button>
            ))}
          </div>

          {selectedCourse && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[18px] text-[hsl(var(--blue-900))]">
                  Top universities for {COURSE_CATEGORIES.find(c => c.id === selectedCourse)?.label}
                </h3>
                <Link
                  to={`/universities?course=${selectedCourse}`}
                  className="text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline flex items-center gap-1"
                >
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {universities
                  .filter(u => u.courses?.includes(selectedCourse) && u.country === selected)
                  .slice(0, 3)
                  .map((uni) => (
                    <div
                      key={uni.id}
                      className="relative rounded-2xl p-5 bg-white hover:bg-[hsl(var(--blue-50))] transition-all duration-300 hover:shadow-lg hover:shadow-[hsl(var(--blue-700))]/10"
                    >
                      <div className="relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-[hsl(var(--blue-700))] flex items-center justify-center text-white text-xl">
                            {uni.flag}
                          </div>
                          <div>
                            <div className="font-bold text-[hsl(var(--blue-900))]">{uni.short_name}</div>
                            <div className="text-[12px] text-[hsl(var(--blue-900))]/60">{uni.name}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-[13px]">
                            <span className="text-[hsl(var(--blue-900))]/60">Tuition:</span>{' '}
                            <span className="font-bold text-[hsl(var(--blue-900))]">
                              {uni.tuition_usd === 0 ? 'Free' : `$${uni.tuition_usd?.toLocaleString()}`}
                            </span>
                          </div>
                          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] text-white text-[10px] font-bold">
                            #{uni.rank} World
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {getDisplayCourses(uni.popular_courses || []).slice(0, 2).map((course) => (
                            <span key={course} className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-[hsl(var(--blue-100))] text-[hsl(var(--blue-700))]">
                              {course}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              {universities.filter(u => u.courses?.includes(selectedCourse) && u.country === selected).length === 0 && (
                <div className="text-center py-8 bg-[hsl(var(--soft-bg))] rounded-xl">
                  <BookOpen className="w-10 h-10 text-[hsl(var(--blue-900))]/30 mx-auto" />
                  <p className="mt-3 text-[14px] text-[hsl(var(--blue-900))]/60">
                    No universities found for this course in {selectedCountry?.name}.{' '}
                    <Link to={`/universities?course=${selectedCourse}`} className="text-[hsl(var(--blue-700))] font-bold hover:underline">
                      Browse all countries
                    </Link>
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-center">
            <Link
              to="/universities"
              className="inline-flex items-center gap-2 rounded-full btn-primary text-white h-12 px-8 font-bold"
            >
              Browse all universities <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[hsl(var(--soft-bg))] border-y border-black/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-3">
            <GraduationCap className="w-3.5 h-3.5" /> Schools & Programs
          </div>
          <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
            Universities in {selectedCountry?.name}
          </h2>
          <p className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/60">
            Explore programs offered by universities in {selectedCountry?.name}. Select multiple universities and apply with a single application.
          </p>

          {universities.filter(u => u.country === selected).length === 0 ? (
            <div className="mt-8 text-center py-12 bg-white rounded-2xl border border-black/5">
              <BookOpen className="w-10 h-10 text-[hsl(var(--blue-900))]/30 mx-auto" />
              <p className="mt-3 text-[14px] text-[hsl(var(--blue-900))]/60">
                No universities listed for {selectedCountry?.name} yet.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {universities.filter(u => u.country === selected).map((uni) => (
                <div
                  key={uni.id}
                  className="rounded-2xl bg-white border border-black/5 p-5 hover:border-[hsl(var(--blue-700))]/20 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] flex items-center justify-center text-xl shrink-0">
                      {uni.flag}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[15px] text-[hsl(var(--blue-900))] truncate">{uni.short_name}</div>
                      <div className="text-[12px] text-[hsl(var(--blue-900))]/60 truncate">{uni.name}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge className="bg-[hsl(var(--blue-100))] text-[hsl(var(--blue-700))] text-[10px] border-0">{uni.type}</Badge>
                        <span className="text-[11px] text-[hsl(var(--blue-900))]/50">#{uni.rank}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(uni.popular_courses || []).slice(0, 4).map((course) => (
                      <span key={course} className="text-[11px] px-2.5 py-1 rounded-full bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-100))] text-[hsl(var(--blue-700))]">
                        {COURSE_ID_TO_NAME[course] || course}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-[12px]">
                    <span className="text-[hsl(var(--blue-900))]/60">
                      Tuition: <strong className="text-[hsl(var(--blue-900))]">{uni.tuition_usd === 0 ? 'Free' : `$${uni.tuition_usd?.toLocaleString()}`}</strong>
                    </span>
                    <span className="text-[hsl(var(--blue-900))]/60">
                      IELTS: <strong className="text-[hsl(var(--blue-900))]">{uni.ielts_min}+</strong>
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      to={`/university/${uni.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-black/10 h-9 text-[12px] font-bold text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-700))]/30 transition-all"
                    >
                      View details
                    </Link>
                    <Link
                      to={`/student-visa?university=${uni.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl btn-primary text-white h-9 text-[12px] font-bold"
                    >
                      Apply <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex items-center justify-center">
            <Link
              to={`/universities?country=${selected}`}
              className="inline-flex items-center gap-2 rounded-full bg-white border border-black/10 text-[hsl(var(--blue-700))] h-12 px-8 font-bold hover:border-[hsl(var(--blue-700))]/30 transition-all"
            >
              View all universities in {selectedCountry?.name} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-3">
            <DollarSign className="w-3.5 h-3.5" /> Annual Budget
          </div>
          <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
            Estimated annual budget by country
          </h2>
          <p className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/60">
            Tuition and living costs vary by university and city. Below are typical ranges.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-black/10">
                  <th className="text-left py-3 pr-4 text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55">Country</th>
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55">Tuition (annual)</th>
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55">Living costs (annual)</th>
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55">Total (min)</th>
                  <th className="text-left py-3 pl-4 text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55">Currency</th>
                </tr>
              </thead>
              <tbody>
                {ANNUAL_BUDGETS.map(b => {
                  const totalMin = b.tuition_min + b.living_min;
                  const totalMax = b.tuition_max + b.living_max;
                  return (
                    <tr key={b.country} className="border-b border-black/5 hover:bg-[hsl(var(--blue-50))] transition">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{b.flag}</span>
                          <span className="font-bold text-[14px] text-[hsl(var(--blue-900))]">{b.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[14px] text-[hsl(var(--blue-900))]">
                        {b.tuition_min === 0 ? 'Free' : `${b.tuition_min?.toLocaleString()}`}
                        {b.tuition_max > 0 && b.tuition_min > 0 ? ` – ${b.tuition_max?.toLocaleString()}` : ''}
                      </td>
                      <td className="py-3 px-4 text-[14px] text-[hsl(var(--blue-900))]">
                        {b.living_min?.toLocaleString()} – {b.living_max?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[14px] text-[hsl(var(--blue-900))]">
                          {totalMin?.toLocaleString()} – {totalMax?.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 pl-4 text-[13px] text-[hsl(var(--blue-900))]/60">{b.currency}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-start gap-2 text-[12px] text-[hsl(var(--blue-900))]/55">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Figures are indicative. Actual costs depend on university, program, and lifestyle. Use our Cost of Living Calculator for a precise estimate.</span>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[hsl(var(--soft-bg))]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-3">
            <BookOpen className="w-3.5 h-3.5" /> Score Requirements
          </div>
          <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
            English proficiency & entrance exams
          </h2>
          <p className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/60">
            Most universities require one or more of these test scores. Requirements vary by program and institution.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SCORE_REQUIREMENTS.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.id} className="rounded-2xl bg-white border border-black/5 p-6 hover:border-[hsl(var(--blue-700))]/20 hover:shadow-lg transition-all group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] flex items-center justify-center text-white shadow-lg">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-[17px] text-[hsl(var(--blue-900))]">{s.label}</div>
                      <div className="text-[11px] text-[hsl(var(--blue-900))]/55">{s.format}</div>
                    </div>
                  </div>
                  <p className="text-[13px] text-[hsl(var(--blue-900))]/65 leading-relaxed mb-4">{s.desc}</p>
                  <div className="flex items-center gap-4 text-center">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55">Min</div>
                      <div className="text-[18px] font-display font-extrabold text-[hsl(var(--blue-900))]">{s.min}</div>
                    </div>
                    <div className="w-px h-8 bg-black/10" />
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55">Avg</div>
                      <div className="text-[18px] font-display font-extrabold text-[hsl(var(--accent))]">{s.avg}</div>
                    </div>
                    <div className="w-px h-8 bg-black/10" />
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55">Max</div>
                      <div className="text-[18px] font-display font-extrabold text-[hsl(var(--blue-900))]">{s.max}</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-black/5">
                    <Link to="/universities" className="inline-flex items-center gap-1 text-[12px] font-bold text-[hsl(var(--blue-700))] hover:underline group-hover:gap-2 transition-all">
                      Check university requirements <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 p-5">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[13px] text-amber-800">
                <span className="font-bold">Pro tip:</span> Check each university&apos;s specific requirements on their website. Some programs may waive English tests if you studied in English-medium institutions. Most test scores are valid for 2 years.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7">
              <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
                {selectedCountry?.name} Student Visa
              </h2>
              <p className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/60">
                {studentMeta.note || `${selectedCountry?.name} student visa details and requirements`}
              </p>

              <div className="mt-6 rounded-2xl border border-black/5 p-6 overflow-hidden relative" style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, hsl(var(--blue-50)/30%) 100%)',
                }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[hsl(var(--accent))]/5 to-transparent rounded-bl-full" />
                <div className="relative z-10">
                  <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--accent))] mb-4">
                    Visa Details
                  </div>
                <ComparisonRow
                  label="Processing time"
                  value={studentMeta.processing_weeks || 'Varies'}
                  icon={Clock}
                />
                <ComparisonRow
                  label="Work allowed"
                  value={studentMeta.work_hours_week || 'Varies'}
                  icon={Briefcase}
                />
                <ComparisonRow
                  label="Post-study work"
                  value={studentMeta.post_study_months ? `${studentMeta.post_study_months} months` : 'Varies'}
                  icon={Globe2}
                />
                <ComparisonRow
                  label="Tuition level"
                  value={studentMeta.tuition_level || 'Varies'}
                  icon={Award}
                />
                <ComparisonRow
                  label="Admission proof"
                  value={studentMeta.admission_proof || 'Varies'}
                  icon={FileText}
                />
                <ComparisonRow
                  label="Intakes"
                  value={studentMeta.intakes?.join(', ') || 'Varies'}
                  icon={Calendar}
                />
                <div className="pt-4">
                  <Link
                    to={`/visa/${selectedCountry?.id}`}
                    className="inline-flex items-center gap-2 rounded-full btn-primary text-white h-11 px-6 font-bold"
                  >
                    Apply for {selectedCountry?.name} <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                </div>
              </div>
            </div>

            <aside className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden p-7 sticky top-28" style={{
                background: 'linear-gradient(135deg, hsl(var(--blue-900)) 0%, hsl(var(--blue-700)) 50%, hsl(var(--blue-500)) 100%)',
              }}>
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-[hsl(var(--accent))]/20 to-transparent rounded-tl-full" />
                <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-white/70">
                  Why apply with We Hive
                </div>
                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[14px]">On-time, or it's on us</div>
                      <div className="text-[12px] text-white/60 mt-0.5">We commit to your intake date. If we miss, we refund.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[14px]">Documents reviewed by humans</div>
                      <div className="text-[12px] text-white/60 mt-0.5">Every SOP and financial document checked before submission.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[14px]">Slots before they vanish</div>
                      <div className="text-[12px] text-white/60 mt-0.5">We grab VFS appointments the moment they open.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[14px]">Real humans on call</div>
                      <div className="text-[12px] text-white/60 mt-0.5">WhatsApp, email, or call. Including weekends.</div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[hsl(var(--soft-bg))]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
            Student visa application timeline
          </h2>
          <p className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/60">
            Most student visa rejections trace back to a late start. Here's the apply-by window for each intake season.
          </p>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {INTAKE_TIMES.map((intake, i) => (
              <div
                key={intake.season}
className="relative rounded-2xl overflow-hidden group bg-white hover:bg-[hsl(var(--blue-50))] transition-all duration-300"
              >
                <div className="relative z-10 p-7 border border-black/5 rounded-2xl bg-white/80 backdrop-blur">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${intake.color} flex items-center justify-center text-white shadow-lg`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/55 font-bold">Intake</div>
                      <div className="font-bold text-[16px] text-[hsl(var(--blue-900))]">{intake.months}</div>
                    </div>
                  </div>
                  <IntakeCard intake={intake} index={i} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
            Documents required for a student visa
          </h2>
          <p className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/60">
            Country-specific add-ons (SOPs, English test scores, sponsorship letters) are listed on each country page — these four are the constant.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {DOCUMENTS.map((doc, idx) => {
              const Icon = doc.icon;
              return (
                <div
                  key={doc.title}
                  className="relative rounded-2xl p-6 text-center overflow-hidden group transition-all duration-300 hover:shadow-xl hover:shadow-[hsl(var(--blue-700))]/10 bg-white"
                >
                  <div className="relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--blue-700))] flex items-center justify-center mx-auto shadow-lg shadow-[hsl(var(--blue-700))]/20">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="mt-4 font-bold text-[15px] text-[hsl(var(--blue-900))]">{doc.title}</div>
                    <div className="mt-1 text-[13px] text-[hsl(var(--blue-900))]/60">{doc.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[hsl(var(--blue-900))] text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
                <GraduationCap className="w-4 h-4" />
                Results
              </div>
              <h2 className="mt-3 font-display font-extrabold text-[36px] tracking-[-0.025em]">
                We Hive student visa results
              </h2>
              <div className="mt-8 grid grid-cols-3 gap-6">
                <div>
                  <div className="text-[36px] font-display font-extrabold">10K+</div>
                  <div className="text-[13px] text-white/60">Student visas processed</div>
                </div>
                <div>
                  <div className="text-[36px] font-display font-extrabold">10</div>
                  <div className="text-[13px] text-white/60">Destinations supported</div>
                </div>
                <div>
                  <div className="text-[36px] font-display font-extrabold">98%</div>
                  <div className="text-[13px] text-white/60">Documents accepted on first try</div>
                </div>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-7">
              <h3 className="font-bold text-[18px]">Start your student visa today</h3>
              <p className="mt-2 text-[14px] text-white/60">
                Pick where you're studying and start your visa today. Most students finish their application paperwork in under an hour.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {countries.slice(0, 5).map(c => (
                  <Link
                    key={c.id}
                    to={`/visa/${c.id}`}
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full px-4 py-2 text-[13px] font-bold transition"
                  >
                    {c.flag} {c.name}
                  </Link>
                ))}
                <span className="inline-flex items-center bg-white/10 rounded-full px-4 py-2 text-[13px] font-bold">
                  +5 more
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[hsl(var(--soft-bg))] border-t border-black/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
            Study abroad tools
          </h2>
          <p className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/60">
            Everything you need for a successful study abroad journey.
          </p>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Sparkles, label: 'Visa Interview Simulator', desc: 'Practice mock embassy interviews with scoring', href: '/visa-interview', color: 'bg-violet-500' },
              { icon: Calculator, label: 'Scholarship Matcher', desc: 'Find scholarships matching your profile', href: '/student-visa', color: 'bg-amber-500' },
              { icon: Home, label: 'Cost of Living Calculator', desc: 'Compare tuition, rent, food, and transport costs', href: '/student-visa', color: 'bg-emerald-500' },
              { icon: FileText, label: 'AI SOP / LOR Writer', desc: 'Generate university-specific application documents', href: '/student-visa', color: 'bg-purple-500' },
            ].map(tool => (
              <Link
                key={tool.label}
                to={tool.href}
                className="rounded-2xl bg-white border border-black/5 p-5 hover:border-[hsl(var(--blue-700))]/20 hover:shadow-lg transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl ${tool.color} flex items-center justify-center text-white shadow-lg`}>
                  <tool.icon className="w-6 h-6" />
                </div>
                <h3 className="mt-3 font-bold text-[15px] text-[hsl(var(--blue-900))]">{tool.label}</h3>
                <p className="mt-1 text-[13px] text-[hsl(var(--blue-900))]/60">{tool.desc}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[hsl(var(--accent))] group-hover:gap-2 transition-all">
                  Open <ChevronRight className="w-3 h-3" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
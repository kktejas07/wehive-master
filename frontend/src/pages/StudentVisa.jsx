import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { inr, countryFlag } from '../lib/utils';
import AIUniversityRecommender from '../components/ai/AIUniversityRecommender';
import AIScholarshipMatcher from '../components/ai/AIScholarshipMatcher';
import {
  GraduationCap, Clock, Briefcase, Globe2, Calendar, Award,
  ChevronRight, Loader2, Check, BookOpen, Users, Star, ArrowRight,
  Globe, FileText, Shield, Zap, Search, TrendingUp,
  Atom, Cog, Heart, Scale, Palette, BookMarked,
  Sparkles, Calculator, Home, DollarSign,
  BarChart3, Info,
} from 'lucide-react';
import axios from 'axios';

const STUDENT_COUNTRIES = [
  { id: 'us', name: 'United States', flag: '', code: 'US' },
  { id: 'uk', name: 'United Kingdom', flag: '', code: 'GB' },
  { id: 'ca', name: 'Canada', flag: '', code: 'CA' },
  { id: 'au', name: 'Australia', flag: '', code: 'AU' },
  { id: 'de', name: 'Germany', flag: '', code: 'DE' },
  { id: 'fr', name: 'France', flag: '', code: 'FR' },
  { id: 'it', name: 'Italy', flag: '', code: 'IT' },
  { id: 'es', name: 'Spain', flag: '', code: 'ES' },
  { id: 'jp', name: 'Japan', flag: '', code: 'JP' },
  { id: 'sg', name: 'Singapore', flag: '', code: 'SG' },
  { id: 'ch', name: 'Switzerland', flag: '', code: 'CH' },
  { id: 'pl', name: 'Poland', flag: '', code: 'PL' },
  { id: 'at', name: 'Austria', flag: '', code: 'AT' },
  { id: 'pt', name: 'Portugal', flag: '', code: 'PT' },
  { id: 'gr', name: 'Greece', flag: '', code: 'GR' },
  { id: 'hr', name: 'Croatia', flag: '', code: 'HR' },
];

const INTAKE_TIMES = [
  {
    season: 'Fall Intake',
    months: 'Aug – Sep',
    applyBy: 'Apr – May',
    description: 'The biggest intake worldwide. Slot pressure peaks in June-July.',
    countries: 'US, UK, Germany, Italy, Spain & more',
    color: 'bg-[hsl(var(--blue-700))]',
  },
  {
    season: 'Spring Intake',
    months: 'Jan – Feb',
    applyBy: 'Sep – Oct',
    description: 'Smaller cohorts, faster decisions. Great backup if Fall slipped.',
    countries: 'US, UK, Germany, Italy, Poland & more',
    color: 'bg-[hsl(var(--blue-700))]',
  },
  {
    season: 'Summer Intake',
    months: 'May – Jun',
    applyBy: 'Feb – Mar',
    description: 'Niche programs only — short courses, specific masters.',
    countries: 'Limited (mostly UK, Spain, Croatia)',
    color: 'bg-[hsl(var(--blue-700))]',
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
  { country: 'us', name: 'United States', code: 'US', tuition_min: 20000, tuition_max: 60000, living_min: 12000, living_max: 24000, currency: 'USD' },
  { country: 'uk', name: 'United Kingdom', code: 'GB', tuition_min: 15000, tuition_max: 38000, living_min: 12000, living_max: 18000, currency: 'GBP' },
  { country: 'ca', name: 'Canada', code: 'CA', tuition_min: 18000, tuition_max: 45000, living_min: 12000, living_max: 20000, currency: 'CAD' },
  { country: 'au', name: 'Australia', code: 'AU', tuition_min: 20000, tuition_max: 45000, living_min: 15000, living_max: 25000, currency: 'AUD' },
  { country: 'de', name: 'Germany', code: 'DE', tuition_min: 0, tuition_max: 3000, living_min: 11000, living_max: 14000, currency: 'EUR' },
  { country: 'fr', name: 'France', code: 'FR', tuition_min: 3000, tuition_max: 20000, living_min: 10000, living_max: 15000, currency: 'EUR' },
  { country: 'it', name: 'Italy', code: 'IT', tuition_min: 2000, tuition_max: 20000, living_min: 10000, living_max: 15000, currency: 'EUR' },
  { country: 'es', name: 'Spain', code: 'ES', tuition_min: 2000, tuition_max: 18000, living_min: 9000, living_max: 14000, currency: 'EUR' },
  { country: 'jp', name: 'Japan', code: 'JP', tuition_min: 5000, tuition_max: 15000, living_min: 10000, living_max: 18000, currency: 'JPY' },
  { country: 'sg', name: 'Singapore', code: 'SG', tuition_min: 20000, tuition_max: 40000, living_min: 12000, living_max: 20000, currency: 'SGD' },
  { country: 'ch', name: 'Switzerland', code: 'CH', tuition_min: 1500, tuition_max: 4000, living_min: 18000, living_max: 25000, currency: 'CHF' },
  { country: 'pl', name: 'Poland', code: 'PL', tuition_min: 2000, tuition_max: 8000, living_min: 6000, living_max: 10000, currency: 'EUR' },
  { country: 'at', name: 'Austria', code: 'AT', tuition_min: 0, tuition_max: 2000, living_min: 11000, living_max: 14000, currency: 'EUR' },
  { country: 'pt', name: 'Portugal', code: 'PT', tuition_min: 3000, tuition_max: 12000, living_min: 8000, living_max: 12000, currency: 'EUR' },
  { country: 'gr', name: 'Greece', code: 'GR', tuition_min: 2000, tuition_max: 8000, living_min: 7000, living_max: 11000, currency: 'EUR' },
  { country: 'hr', name: 'Croatia', code: 'HR', tuition_min: 2000, tuition_max: 6000, living_min: 7000, living_max: 10000, currency: 'EUR' },
];

function getDisplayCourses(popularCourses = []) {
  return popularCourses.map(c => COURSE_ID_TO_NAME[c] || c);
}

function getInitials(name) {
  if (!name) return '?';
  const words = name.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function CountryCard({ c, onSelect, selected }) {
  const meta = c.student_meta || {};
  return (
    <button
      onClick={() => onSelect(c.id)}
      className={`relative text-left p-5 rounded-2xl border transition-colors duration-200 overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--blue-700))] ${
        selected === c.id
          ? 'border-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))] ring-1 ring-[hsl(var(--blue-700))]'
          : 'border-[hsl(var(--border))] hover:border-[hsl(var(--blue-200))] bg-white hover:bg-[hsl(var(--blue-50))]'
      }`}
    >
      <div className="relative z-10">
        <div className="text-3xl mb-2">{countryFlag(c.code) || <Globe className="w-7 h-7 text-[hsl(var(--blue-700))]/40" />}</div>
        <div className="font-bold text-[hsl(var(--blue-900))]">{c.name}</div>
        {meta.processing_weeks && (
          <div className="text-[12px] text-muted-foreground mt-1">
            {meta.processing_weeks}
          </div>
        )}
      </div>
    </button>
  );
}

function ComparisonRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[hsl(var(--border))]">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-4 h-4 text-[hsl(var(--blue-700))]" />}
        <span className="text-[14px] text-muted-foreground">{label}</span>
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
      <div className="absolute left-[13px] top-7 bottom-0 w-px bg-[hsl(var(--border))]" />
      <div className="pb-8">
        <div className="flex items-baseline gap-3">
          <h3 className="text-[18px] font-bold text-[hsl(var(--blue-900))]">{intake.season}</h3>
          <span className="text-[13px] text-muted-foreground">{intake.months}</span>
        </div>
        <div className="text-[12px] font-bold text-[hsl(var(--blue-700))] mt-1">Apply by: {intake.applyBy}</div>
        <p className="text-[14px] text-muted-foreground mt-2">{intake.description}</p>
        <div className="text-[12px] text-muted-foreground mt-2">{intake.countries}</div>
      </div>
    </div>
  );
}

export default function StudentVisa() {
  const navigate = useNavigate();
  const { token, isAuthed, openAuth } = useAuth();
  const { toast } = useToast();
  const [countries, setCountries] = useState([]);
  const [selected, setSelected] = useState('us');
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [uniPage, setUniPage] = useState(1);
  const [showAIRecommender, setShowAIRecommender] = useState(false);
  const [showScholarshipMatcher, setShowScholarshipMatcher] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tuitionMax, setTuitionMax] = useState('');
  const [ieltsFilter, setIeltsFilter] = useState('');
  const [scholarshipsOnly, setScholarshipsOnly] = useState(false);
  const [sortField, setSortField] = useState('rank');
  const UNI_PER_PAGE = 6;

  const filtered = universities.filter(u => {
    if (searchQuery && !u.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !u.short_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (tuitionMax && (u.tuition_usd == null || u.tuition_usd > Number(tuitionMax))) return false;
    if (ieltsFilter && (u.ielts_min == null || u.ielts_min > Number(ieltsFilter))) return false;
    if (scholarshipsOnly && !u.scholarships) return false;
    return true;
  }).sort((a, b) => {
    if (sortField === 'tuition') return (a.tuition_usd || 999999) - (b.tuition_usd || 999999);
    if (sortField === 'rank') return (a.rank || 9999) - (b.rank || 9999);
    if (sortField === 'name') return (a.name || '').localeCompare(b.name || '');
    return 0;
  });

  useEffect(() => {
    axios.get(`${API}/countries`, { params: { limit: 100 } })
      .then(r => {
        const studentCountries = STUDENT_COUNTRIES.map(sc => {
          const found = (r.data || []).find(c => c.id === sc.id);
          return found ? { ...found, code: sc.code, student_meta: found.student_meta || null } : { id: sc.id, name: sc.name, code: sc.code, student_meta: null };
        });
        setCountries(studentCountries);
        setLoading(false);
      })
      .catch(() => {
        setCountries(STUDENT_COUNTRIES.map(sc => ({ id: sc.id, name: sc.name, code: sc.code, student_meta: null })));
        setLoading(false);
      });

    fetchUniversities('us');
  }, []);

  useEffect(() => { setUniPage(1); fetchUniversities(selected); }, [selected]);

  useEffect(() => { setUniPage(1); }, [searchQuery, tuitionMax, ieltsFilter, scholarshipsOnly, sortField]);

  const fetchUniversities = (countryCode) => {
    axios.get(`${API}/universities`, { params: { country: countryCode, limit: 200 } })
      .then(r => setUniversities(r.data || []))
      .catch(() => setUniversities([]));
  };

  const selectedCountry = countries.find(c => c.id === selected) || countries[0];
  const studentMeta = selectedCountry?.student_meta || {};

  return (
    <div className="bg-white">
      <Navbar variant="light" />

      <section className="pt-28 pb-16 bg-[hsl(var(--blue-900))] text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-200))] mb-4">
            <GraduationCap className="w-4 h-4" />
            Student Visa Program
          </div>
          <h1 className="font-display font-bold text-[36px] sm:text-[56px] leading-[1.05] tracking-[-0.02em]">
            Study abroad.<br />
            <span className="text-gradient-light">Sorted.</span>
          </h1>
          <p className="mt-4 text-[16px] sm:text-[18px] leading-relaxed text-white/80 max-w-xl">
            Apply for a student visa to the USA, UK, Germany, Italy, Spain and 7 more — with country-specific document review, slot priority, and an on-time guarantee.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Button onClick={() => { if (isAuthed) { document.getElementById('universities-section')?.scrollIntoView({ behavior: 'smooth' }); } else { openAuth('signup'); } }} className="btn-accent h-12 px-6 text-white">
              Start my student visa <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              onClick={() => setShowAIRecommender(true)}
              variant="outline"
              className="h-12 px-6 bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
            >

              <Sparkles className="w-4 h-4 mr-1.5" /> AI recommend
            </Button>
            <Button variant="ghost" className="h-12 px-5 text-white/90 underline-offset-4 hover:underline hover:bg-transparent hover:text-white">
              Book free consultation
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[hsl(var(--soft-bg))]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <h2 className="font-display font-bold text-[28px] sm:text-[32px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-tight">
            Student visa countries we support
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground">
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

      <section className="py-16 md:py-24 bg-white border-t border-[hsl(var(--border))]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-[28px] sm:text-[32px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-tight">
                What do you want to study?
              </h2>
              <p className="mt-2 text-[15px] text-muted-foreground">
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
                className={`relative text-left p-5 rounded-2xl border transition-colors duration-200 overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--blue-700))] ${
                  selectedCourse === course.id
                    ? 'border-[hsl(var(--blue-700))] bg-[hsl(var(--blue-700))]'
                    : 'border-[hsl(var(--border))] hover:border-[hsl(var(--blue-200))] bg-white hover:bg-[hsl(var(--blue-50))]'
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
                <div className={`text-[12px] mt-1 ${selectedCourse === course.id ? 'text-white/80' : 'text-muted-foreground'}`}>{course.description}</div>
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
                      className="relative rounded-2xl p-5 bg-white border border-[hsl(var(--border))] hover:border-[hsl(var(--blue-200))] transition duration-200 hover:shadow-md hover:-translate-y-0.5"
                    >
                      <div className="relative z-10">
                        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[hsl(var(--blue-700))] flex items-center justify-center overflow-hidden">
            {uni.website ? (
              <img loading="lazy" decoding="async"
                src={`https://www.google.com/s2/favicons?domain=${new URL(uni.website).hostname}&sz=128`}
                alt={uni.short_name}
                className="w-8 h-8 object-contain"
                onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(uni.short_name)}&background=1a2a5e&color=fff&size=96&bold=true`; }}
              />
            ) : (
              <img loading="lazy" decoding="async"
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(uni.short_name)}&background=1a2a5e&color=fff&size=96&bold=true`}
                alt={uni.short_name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
                          <div>
                            <div className="font-bold text-[hsl(var(--blue-900))]">{uni.short_name}</div>
                            <div className="text-[12px] text-muted-foreground">{uni.name}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-[13px]">
                            <span className="text-muted-foreground">Tuition:</span>{' '}
                            <span className="font-bold text-[hsl(var(--blue-900))]">
                              {uni.tuition_usd === 0 ? 'Free' : `$${uni.tuition_usd?.toLocaleString()}`}
                            </span>
                          </div>
                          <div className="px-3 py-1 rounded-full bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] text-[12px] font-semibold">
                            #{uni.rank} World
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {getDisplayCourses(uni.popular_courses || []).slice(0, 2).map((course) => (
                            <span key={course} className="text-[12px] px-2 py-0.5 rounded-full bg-white border border-[hsl(var(--blue-100))] text-[hsl(var(--blue-700))]">
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
                  <BookOpen className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="mt-3 text-[14px] text-muted-foreground">
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
              className="inline-flex items-center gap-2 rounded-xl btn-primary text-white h-12 px-8 font-bold"
            >
              Browse all universities <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="universities-section" className="py-16 bg-[hsl(var(--soft-bg))] border-y border-[hsl(var(--border))]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-3">
            <GraduationCap className="w-3.5 h-3.5" /> Schools & Programs
          </div>
          <h2 className="font-display font-bold text-[28px] sm:text-[32px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-tight">
            Universities in {selectedCountry?.name}
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Explore programs offered by universities in {selectedCountry?.name}. Select multiple universities and apply with a single application.
          </p>
          <Link
            to="/apply/universities"
            className="mt-4 inline-flex items-center gap-2 h-11 px-5 rounded-xl btn-accent font-semibold text-[14px]"
          >
            <GraduationCap className="w-4 h-4" /> Start university application
          </Link>

          {/* ── Filters ── */}
          <div className="mt-6 flex flex-wrap gap-3 items-center bg-white rounded-2xl border border-[hsl(var(--border))] p-4">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} aria-label="Search universities" placeholder="Search universities..." className="w-full h-11 pl-9 pr-4 rounded-xl bg-white border border-[hsl(var(--border))] text-[16px] sm:text-[14px] text-[hsl(var(--blue-900))] placeholder:text-muted-foreground outline-none focus:border-[hsl(var(--blue-700))] focus:ring-2 focus:ring-[hsl(var(--blue-700))]/20" />
            </div>
            <input type="number" value={tuitionMax} onChange={e => setTuitionMax(e.target.value)} aria-label="Maximum tuition in USD" placeholder="Max tuition $" className="h-11 w-[calc(50%-6px)] sm:w-36 px-3 rounded-xl bg-white border border-[hsl(var(--border))] text-[16px] sm:text-[14px] text-[hsl(var(--blue-900))] placeholder:text-muted-foreground outline-none focus:border-[hsl(var(--blue-700))] focus:ring-2 focus:ring-[hsl(var(--blue-700))]/20" />
            <input type="number" step="0.5" min="0" max="9" value={ieltsFilter} onChange={e => setIeltsFilter(e.target.value)} aria-label="Maximum IELTS requirement" placeholder="IELTS ≤" className="h-11 w-[calc(50%-6px)] sm:w-28 px-3 rounded-xl bg-white border border-[hsl(var(--border))] text-[16px] sm:text-[14px] text-[hsl(var(--blue-900))] placeholder:text-muted-foreground outline-none focus:border-[hsl(var(--blue-700))] focus:ring-2 focus:ring-[hsl(var(--blue-700))]/20" />
            <label className="flex items-center gap-2 min-h-[44px] text-[14px] font-semibold text-[hsl(var(--blue-900))] cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={scholarshipsOnly} onChange={e => setScholarshipsOnly(e.target.checked)} className="accent-[hsl(var(--blue-700))]" />
              Scholarships only
            </label>
            <select aria-label="Sort universities" value={sortField} onChange={e => setSortField(e.target.value)} className="h-11 px-3 rounded-xl bg-white border border-[hsl(var(--border))] text-[13px] font-bold text-[hsl(var(--blue-900))] outline-none">
              <option value="rank">Sort: Rank</option>
              <option value="tuition">Sort: Tuition</option>
              <option value="name">Sort: Name</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-8 text-center py-12 bg-white rounded-2xl border border-[hsl(var(--border))]">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="mt-3 text-[14px] text-muted-foreground">
                No universities match your filters.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-6 flex items-center gap-2 text-[12px] text-muted-foreground">
                <span className="font-bold text-[hsl(var(--blue-900))]">{filtered.length}</span> universities found
              </div>
              <div className="mt-3 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.slice((uniPage - 1) * UNI_PER_PAGE, uniPage * UNI_PER_PAGE).map((uni) => (
                <div
                  key={uni.id}
                  className="rounded-2xl bg-white border border-[hsl(var(--border))] p-5 hover:border-[hsl(var(--blue-200))] hover:shadow-md hover:-translate-y-0.5 transition duration-200"
                >
                  <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[hsl(var(--blue-700))] flex items-center justify-center overflow-hidden shrink-0">
                    {uni.website ? (
                      <img loading="lazy" decoding="async"
                        src={`https://www.google.com/s2/favicons?domain=${new URL(uni.website).hostname}&sz=128`}
                        alt={uni.short_name}
                        className="w-8 h-8 object-contain"
                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(uni.short_name)}&background=1a2a5e&color=fff&size=96&bold=true`; }}
                      />
                    ) : (
                      <img loading="lazy" decoding="async"
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(uni.short_name)}&background=1a2a5e&color=fff&size=96&bold=true`}
                        alt={uni.short_name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[15px] text-[hsl(var(--blue-900))] truncate">{uni.short_name}</div>
                      <div className="text-[12px] text-muted-foreground truncate">{uni.name}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge className="bg-[hsl(var(--blue-100))] text-[hsl(var(--blue-700))] text-[12px] border-0">{uni.type}</Badge>
                        <span className="text-[12px] text-muted-foreground">#{uni.rank}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(uni.popular_courses || []).slice(0, 4).map((course) => (
                      <span key={course} className="text-[12px] px-2.5 py-1 rounded-full bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-100))] text-[hsl(var(--blue-700))]">
                        {COURSE_ID_TO_NAME[course] || course}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-[12px]">
                    <span className="text-muted-foreground">
                      Tuition: <strong className="text-[hsl(var(--blue-900))]">{uni.tuition_usd === 0 ? 'Free' : `$${uni.tuition_usd?.toLocaleString()}`}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      IELTS: <strong className="text-[hsl(var(--blue-900))]">{uni.ielts_min}+</strong>
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      to={`/university/${uni.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-[hsl(var(--border))] h-10 text-[13px] font-semibold text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-700))]/30 transition"
                    >
                      View details
                    </Link>
                    <Link
                      to={`/university/${uni.id}?apply=true`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl btn-primary text-white h-10 text-[13px] font-semibold"
                    >
                      Apply <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            {(() => {
              const totalItems = filtered.length;
              const totalPages = Math.ceil(totalItems / UNI_PER_PAGE);
              if (totalPages <= 1) return null;
              
              const getPages = () => {
                const pgs = [];
                const maxShow = 5;
                let start = Math.max(1, uniPage - 2);
                let end = Math.min(totalPages, start + maxShow - 1);
                if (end - start < maxShow - 1) start = Math.max(1, end - maxShow + 1);
                
                if (start > 1) { pgs.push(1); if (start > 2) pgs.push('...'); }
                for (let i = start; i <= end; i++) pgs.push(i);
                if (end < totalPages) { if (end < totalPages - 1) pgs.push('...'); pgs.push(totalPages); }
                return pgs;
              };

              return (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
                  <Button
                    variant="outline"
                    disabled={uniPage === 1}
                    onClick={() => setUniPage(p => Math.max(1, p - 1))}
                    className="rounded-xl h-10 px-3 text-[13px] font-semibold"
                  >
                    Prev
                  </Button>
                  {getPages().map((p, i) =>
                    p === '...' ? (
                      <span key={`dots-${i}`} className="w-9 text-center text-[13px] text-muted-foreground font-bold">...</span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === uniPage ? 'default' : 'outline'}
                        onClick={() => setUniPage(p)}
                        className={`shrink-0 rounded-xl h-10 w-10 p-0 text-[13px] font-semibold ${p === uniPage ? 'bg-[hsl(var(--blue-700))] text-white' : ''}`}
                      >
                        {p}
                      </Button>
                    )
                  )}
                  <Button
                    variant="outline"
                    disabled={uniPage === totalPages}
                    onClick={() => setUniPage(p => Math.min(totalPages, p + 1))}
                    className="rounded-xl h-10 px-3 text-[13px] font-semibold"
                  >
                    Next
                  </Button>
                </div>
              );
            })()}
            </>
          )}
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-3">
            <DollarSign className="w-3.5 h-3.5" /> Annual Budget
          </div>
          <h2 className="font-display font-bold text-[28px] sm:text-[32px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-tight">
            Estimated annual budget by country
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Tuition and living costs vary by university and city. Below are typical ranges.
          </p>
          {/* Mobile: stacked cards instead of a wide table */}
          <ul className="mt-6 grid gap-3 sm:hidden">
            {ANNUAL_BUDGETS.map(b => {
              const totalMin = b.tuition_min + b.living_min;
              const totalMax = b.tuition_max + b.living_max;
              return (
                <li key={b.country} className="rounded-2xl bg-white border border-[hsl(var(--border))] p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl">{countryFlag(b.code) || <Globe className="w-5 h-5 text-muted-foreground" />}</span>
                      <span className="font-bold text-[16px] text-[hsl(var(--blue-900))] truncate">{b.name}</span>
                    </div>
                    <span className="text-[12px] font-semibold text-muted-foreground">{b.currency}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-y-2 text-[14px]">
                    <dt className="text-muted-foreground">Tuition / yr</dt>
                    <dd className="text-right text-[hsl(var(--blue-900))]">
                      {b.tuition_min === 0 ? 'Free' : `${b.tuition_min?.toLocaleString()}`}
                      {b.tuition_max > 0 && b.tuition_min > 0 ? ` – ${b.tuition_max?.toLocaleString()}` : ''}
                    </dd>
                    <dt className="text-muted-foreground">Living / yr</dt>
                    <dd className="text-right text-[hsl(var(--blue-900))]">{b.living_min?.toLocaleString()} – {b.living_max?.toLocaleString()}</dd>
                    <dt className="font-semibold text-[hsl(var(--blue-900))] pt-2 border-t border-[hsl(var(--border))]">Total</dt>
                    <dd className="text-right font-bold text-[hsl(var(--blue-900))] pt-2 border-t border-[hsl(var(--border))]">{totalMin?.toLocaleString()} – {totalMax?.toLocaleString()}</dd>
                  </dl>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 hidden sm:block overflow-x-auto rounded-2xl border border-[hsl(var(--border))] bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="text-left py-3 pl-5 pr-4 text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">Country</th>
                  <th className="text-left py-3 px-4 text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">Tuition (annual)</th>
                  <th className="text-left py-3 px-4 text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">Living costs (annual)</th>
                  <th className="text-left py-3 px-4 text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">Total (min)</th>
                  <th className="text-left py-3 pl-4 pr-5 text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">Currency</th>
                </tr>
              </thead>
              <tbody>
                {ANNUAL_BUDGETS.map(b => {
                  const totalMin = b.tuition_min + b.living_min;
                  const totalMax = b.tuition_max + b.living_max;
                  return (
                    <tr key={b.country} className="border-b last:border-b-0 border-[hsl(var(--border))] hover:bg-[hsl(var(--soft-bg))] transition-colors">
                      <td className="py-3 pl-5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{countryFlag(b.code) || <Globe className="w-5 h-5 text-muted-foreground" />}</span>
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
                      <td className="py-3 pl-4 pr-5 text-[13px] text-muted-foreground">{b.currency}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-start gap-2 text-[12px] text-muted-foreground">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Figures are indicative. Actual costs depend on university, program, and lifestyle. Use our Cost of Living Calculator for a precise estimate.</span>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[hsl(var(--soft-bg))]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-3">
            <BookOpen className="w-3.5 h-3.5" /> Score Requirements
          </div>
          <h2 className="font-display font-bold text-[28px] sm:text-[32px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-tight">
            English proficiency & entrance exams
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Most universities require one or more of these test scores. Requirements vary by program and institution.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SCORE_REQUIREMENTS.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.id} className="rounded-2xl bg-white border border-[hsl(var(--border))] p-6 hover:border-[hsl(var(--blue-200))] hover:shadow-md hover:-translate-y-0.5 transition duration-200 group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[hsl(var(--blue-50))] flex items-center justify-center text-[hsl(var(--blue-700))]">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-[17px] text-[hsl(var(--blue-900))]">{s.label}</div>
                      <div className="text-[12px] text-muted-foreground">{s.format}</div>
                    </div>
                  </div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">{s.desc}</p>
                  <div className="flex items-center gap-4 text-center">
                    <div>
                      <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">Min</div>
                      <div className="text-[18px] font-display font-bold text-[hsl(var(--blue-900))]">{s.min}</div>
                    </div>
                    <div className="w-px h-8 bg-[hsl(var(--border))]" />
                    <div>
                      <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">Avg</div>
                      <div className="text-[18px] font-display font-bold text-[hsl(var(--blue-700))]">{s.avg}</div>
                    </div>
                    <div className="w-px h-8 bg-[hsl(var(--border))]" />
                    <div>
                      <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">Max</div>
                      <div className="text-[18px] font-display font-bold text-[hsl(var(--blue-900))]">{s.max}</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[hsl(var(--border))]">
                    <Link to="/universities" className="inline-flex min-h-[40px] items-center gap-1 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline group-hover:gap-2 transition-all">
                      Check university requirements <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-200 p-5">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[13px] text-amber-800">
                <span className="font-bold">Pro tip:</span> Check each university&apos;s specific requirements on their website. Some programs may waive English tests if you studied in English-medium institutions. Most test scores are valid for 2 years.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7">
              <h2 className="font-display font-bold text-[28px] sm:text-[32px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-tight">
                {selectedCountry?.name} Student Visa
              </h2>
              <p className="mt-2 text-[15px] text-muted-foreground">
                {studentMeta.note || `${selectedCountry?.name} student visa details and requirements`}
              </p>

              <div className="mt-6 rounded-2xl border border-[hsl(var(--border))] bg-white shadow-sm p-6 overflow-hidden relative">
                <div className="relative z-10">
                  <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-4">
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
                    className="inline-flex items-center gap-2 rounded-xl btn-accent text-white h-12 px-6 font-semibold"
                  >
                    Apply for {selectedCountry?.name} <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                </div>
              </div>
            </div>

            <aside className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden p-6 sm:p-7 lg:sticky lg:top-28 bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-100))]">
                <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))]">
                  Why apply with We Hive
                </div>
                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-[hsl(var(--blue-700))]" />
                    </div>
                    <div>
                      <div className="font-bold text-[15px] text-[hsl(var(--blue-900))]">On-time, or it's on us</div>
                      <div className="text-[14px] text-muted-foreground mt-0.5">We commit to your intake date. If we miss, we refund.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-[hsl(var(--blue-700))]" />
                    </div>
                    <div>
                      <div className="font-bold text-[15px] text-[hsl(var(--blue-900))]">Documents reviewed by humans</div>
                      <div className="text-[14px] text-muted-foreground mt-0.5">Every SOP and financial document checked before submission.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-[hsl(var(--blue-700))]" />
                    </div>
                    <div>
                      <div className="font-bold text-[15px] text-[hsl(var(--blue-900))]">Slots before they vanish</div>
                      <div className="text-[14px] text-muted-foreground mt-0.5">We grab VFS appointments the moment they open.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4 text-[hsl(var(--blue-700))]" />
                    </div>
                    <div>
                      <div className="font-bold text-[15px] text-[hsl(var(--blue-900))]">Real humans on call</div>
                      <div className="text-[14px] text-muted-foreground mt-0.5">WhatsApp, email, or call. Including weekends.</div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[hsl(var(--soft-bg))]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <h2 className="font-display font-bold text-[28px] sm:text-[32px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-tight">
            Student visa application timeline
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Most student visa rejections trace back to a late start. Here's the apply-by window for each intake season.
          </p>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {INTAKE_TIMES.map((intake, i) => (
              <div
                key={intake.season}
className="relative rounded-2xl overflow-hidden group bg-white"
              >
                <div className="relative z-10 p-6 border border-[hsl(var(--border))] rounded-2xl bg-white shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[hsl(var(--blue-50))] flex items-center justify-center text-[hsl(var(--blue-700))]">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground font-bold">Intake</div>
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

      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <h2 className="font-display font-bold text-[28px] sm:text-[32px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-tight">
            Documents required for a student visa
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Country-specific add-ons (SOPs, English test scores, sponsorship letters) are listed on each country page — these four are the constant.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {DOCUMENTS.map((doc, idx) => {
              const Icon = doc.icon;
              return (
                <div
                  key={doc.title}
                  className="relative rounded-2xl p-6 text-center overflow-hidden group bg-white border border-[hsl(var(--border))] shadow-sm"
                >
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-xl bg-[hsl(var(--blue-50))] flex items-center justify-center mx-auto">
                      <Icon className="w-6 h-6 text-[hsl(var(--blue-700))]" />
                    </div>
                    <div className="mt-4 font-bold text-[15px] text-[hsl(var(--blue-900))]">{doc.title}</div>
                    <div className="mt-1 text-[13px] text-muted-foreground">{doc.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white border-t border-[hsl(var(--border))]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))]">
                <GraduationCap className="w-4 h-4" />
                Results
              </div>
              <h2 className="mt-3 font-display font-bold text-[28px] sm:text-[36px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-tight">
                We Hive student visa results
              </h2>
              <div className="mt-8 grid grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <div className="text-[28px] sm:text-[36px] font-display font-bold text-[hsl(var(--blue-900))]">10K+</div>
                  <div className="text-[13px] text-muted-foreground">Student visas processed</div>
                </div>
                <div>
                  <div className="text-[28px] sm:text-[36px] font-display font-bold text-[hsl(var(--blue-900))]">10</div>
                  <div className="text-[13px] text-muted-foreground">Destinations supported</div>
                </div>
                <div>
                  <div className="text-[28px] sm:text-[36px] font-display font-bold text-[hsl(var(--blue-900))]">98%</div>
                  <div className="text-[13px] text-muted-foreground">Documents accepted on first try</div>
                </div>
              </div>
            </div>
            <div className="bg-[hsl(var(--soft-bg))] border border-[hsl(var(--border))] rounded-2xl p-6 sm:p-7">
              <h3 className="font-bold text-[20px] text-[hsl(var(--blue-900))]">Start your student visa today</h3>
              <p className="mt-2 text-[15px] text-muted-foreground">
                Pick where you're studying and start your visa today. Most students finish their application paperwork in under an hour.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {countries.slice(0, 5).map(c => (
                  <Link
                    key={c.id}
                    to={`/visa/${c.id}`}
                    className="inline-flex items-center gap-2 bg-white border border-[hsl(var(--border))] hover:border-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-700))] text-[hsl(var(--blue-900))] rounded-full px-4 min-h-[44px] text-[14px] font-semibold transition-colors"
                  >
                    {countryFlag(c.code) || <Globe className="w-4 h-4" />} {c.name}
                  </Link>
                ))}
                <span className="inline-flex items-center rounded-full px-4 min-h-[44px] text-[14px] font-semibold text-muted-foreground">
                  +5 more
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[hsl(var(--soft-bg))] border-t border-[hsl(var(--border))]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <h2 className="font-display font-bold text-[28px] sm:text-[32px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-tight">
            Study abroad tools
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Everything you need for a successful study abroad journey.
          </p>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Sparkles, label: 'Visa Interview Simulator', desc: 'Practice mock embassy interviews with scoring', href: '/visa-interview' },
              { icon: Calculator, label: 'AI Scholarship Matcher', desc: 'Find scholarships matching your profile', color: 'bg-[hsl(var(--blue-700))]', action: 'scholarship' },
              { icon: Sparkles, label: 'AI University Recommender', desc: 'Get personalized AI university recommendations', color: 'bg-[hsl(var(--blue-700))]', action: 'recommender' },
              { icon: Home, label: 'Cost of Living Calculator', desc: 'Compare monthly rent, food and transport across study cities', href: '/financial-tools?tool=budget' },
              { icon: FileText, label: 'AI SOP / Cover Letter Writer', desc: 'Draft a statement of purpose for your submitted application', href: '/account?tab=aitools' },
            ].map(tool => {
              if (tool.action === 'scholarship') {
                return (
                  <button key={tool.label} onClick={() => setShowScholarshipMatcher(true)}
                    className="rounded-2xl bg-white border border-[hsl(var(--border))] p-5 hover:border-[hsl(var(--blue-200))] hover:shadow-md hover:-translate-y-0.5 transition duration-200 group text-left w-full"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[hsl(var(--blue-50))] flex items-center justify-center text-[hsl(var(--blue-700))]">
                      <tool.icon className="w-6 h-6" />
                    </div>
                    <h3 className="mt-3 font-bold text-[16px] text-[hsl(var(--blue-900))]">{tool.label}</h3>
                    <p className="mt-1 text-[14px] text-muted-foreground">{tool.desc}</p>
                    <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[hsl(var(--blue-700))] group-hover:gap-2 transition-all">
                      Open <ChevronRight className="w-3 h-3" />
                    </div>
                  </button>
                );
              }
              if (tool.action === 'recommender') {
                return (
                  <button key={tool.label} onClick={() => setShowAIRecommender(true)}
                    className="rounded-2xl bg-white border border-[hsl(var(--border))] p-5 hover:border-[hsl(var(--blue-200))] hover:shadow-md hover:-translate-y-0.5 transition duration-200 group text-left w-full"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[hsl(var(--blue-50))] flex items-center justify-center text-[hsl(var(--blue-700))]">
                      <tool.icon className="w-6 h-6" />
                    </div>
                    <h3 className="mt-3 font-bold text-[16px] text-[hsl(var(--blue-900))]">{tool.label}</h3>
                    <p className="mt-1 text-[14px] text-muted-foreground">{tool.desc}</p>
                    <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[hsl(var(--blue-700))] group-hover:gap-2 transition-all">
                      Open <ChevronRight className="w-3 h-3" />
                    </div>
                  </button>
                );
              }
              return (
                <Link key={tool.label} to={tool.href}
                  className="rounded-2xl bg-white border border-[hsl(var(--border))] p-5 hover:border-[hsl(var(--blue-200))] hover:shadow-md hover:-translate-y-0.5 transition duration-200 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-[hsl(var(--blue-50))] flex items-center justify-center text-[hsl(var(--blue-700))]">
                    <tool.icon className="w-6 h-6" />
                  </div>
                  <h3 className="mt-3 font-bold text-[15px] text-[hsl(var(--blue-900))]">{tool.label}</h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">{tool.desc}</p>
                  <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[hsl(var(--blue-700))] group-hover:gap-2 transition-all">
                    Open <ChevronRight className="w-3 h-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
      <AIUniversityRecommender open={showAIRecommender} onClose={() => setShowAIRecommender(false)} />
      <AIScholarshipMatcher open={showScholarshipMatcher} onClose={() => setShowScholarshipMatcher(false)} />
    </div>
  );
}
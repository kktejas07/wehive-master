import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { API } from '../context/AuthContext';
import MultiUniversityApplyModal from '../components/MultiUniversityApplyModal';
import AIUniversityQA from '../components/ai/AIUniversityQA';
import AIAcceptanceProbability from '../components/ai/AIAcceptanceProbability';
import ProgramCard from '../components/ProgramCard';
import ReviewsCard from '../components/ReviewsCard';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {
  Globe2, Users, Star, DollarSign, MapPin,
  ChevronRight, Loader2, GraduationCap, Award, TrendingUp,
  Calendar, Check, X, ExternalLink, Bookmark,
  Building2, Library, FlaskConical, Dribbble, Stethoscope,
  ArrowRight, Sparkles,
} from 'lucide-react';

const FACILITY_ICONS = {
  'Research Labs': FlaskConical,
  'Library': Library,
  'Sports Complex': Dribbble,
  'Sports Center': Dribbble,
  'Medical Center': Stethoscope,
  'Medical School': Stethoscope,
  'University Hospital': Stethoscope,
  'Startup Incubator': Building2,
  'Innovation Center': Building2,
  'Innovation Hub': Building2,
};

function getFacilityIcon(name) {
  const found = Object.entries(FACILITY_ICONS).find(([k]) => name.includes(k));
  return found ? found[1] : Building2;
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-2xl bg-white border border-[hsl(var(--border))] p-5 hover:border-[hsl(var(--blue-200))] transition-colors">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color || 'bg-[hsl(var(--blue-50))]'}`}>
        <Icon className={`w-5 h-5 ${color ? 'text-white' : 'text-[hsl(var(--blue-700))]'}`} />
      </div>
      <div className="mt-3 text-[12px] uppercase tracking-[0.14em] font-semibold text-muted-foreground truncate">{label}</div>
      <div className="mt-1 text-[18px] font-bold text-[hsl(var(--blue-900))]">{value}</div>
    </div>
  );
}

function IntakeCalendar({ intakes, country_name }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return (
    <div className="rounded-2xl bg-white border border-[hsl(var(--border))] p-6">
      <h3 className="font-bold text-[16px] text-[hsl(var(--blue-900))] mb-4">Intake Calendar</h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {months.map((m, i) => {
          const active = intakes?.some(inv => inv.includes(m));
          return (
            <div
              key={m}
              className={`rounded-xl p-3 text-center text-[12px] font-bold transition ${
                active
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-[hsl(var(--soft-bg))] text-muted-foreground'
              }`}
            >
              <div className="text-[16px] font-display font-bold">{m}</div>
              <div className="mt-1">{active ? 'Open' : '—'}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-[12px] text-muted-foreground">
        Active intakes for {country_name}: <span className="font-bold text-emerald-700">{intakes?.join(', ')}</span>
      </div>
    </div>
  );
}

function ProgramDetailsCard({ uni }) {
  return (
    <div className="rounded-2xl bg-white border border-[hsl(var(--border))] p-6">
      <h3 className="font-bold text-[16px] text-[hsl(var(--blue-900))] mb-4">Program Details</h3>
      <div className="space-y-4">
        <div>
          <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-2">Popular Courses</div>
          <div className="flex flex-wrap gap-2">
            {(uni.popular_courses || []).slice(0, 6).map(c => (
              <span key={c} className="text-[12px] px-3 py-1.5 rounded-full bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] font-medium">
                {c}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[hsl(var(--border))]">
          <div>
            <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">IELTS Min</div>
            <div className="mt-1 text-[16px] font-bold text-[hsl(var(--blue-900))]">{uni.ielts_min || '—'}</div>
          </div>
          <div>
            <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">TOEFL Min</div>
            <div className="mt-1 text-[16px] font-bold text-[hsl(var(--blue-900))]">{uni.toefl_min || '—'}</div>
          </div>
          <div>
            <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">GRE</div>
            <div className="mt-1 text-[16px] font-bold text-[hsl(var(--blue-900))]">{uni.gre_required ? 'Required' : 'Not required'}</div>
          </div>
          <div>
            <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">GMAT</div>
            <div className="mt-1 text-[16px] font-bold text-[hsl(var(--blue-900))]">{uni.gmat_required ? 'Required' : 'Not required'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FacilityCard({ name }) {
  const Icon = getFacilityIcon(name);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[hsl(var(--soft-bg))] p-4">
      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
        <Icon className="w-5 h-5 text-[hsl(var(--blue-700))]" />
      </div>
      <span className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{name}</span>
    </div>
  );
}

export default function UniversityDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [uni, setUni] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [translated, setTranslated] = useState(null);

  const t = (field, fallback) => {
    if (translated && translated[field]) return translated[field];
    return uni?.[field] ?? fallback ?? '';
  };

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/universities/${id}`)
      .then(r => { setUni(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (searchParams.get('apply') === 'true') {
      setShowApplyModal(true);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="bg-[hsl(var(--soft-bg))] min-h-screen">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!uni) {
    return (
      <div className="bg-white min-h-screen">
        <Navbar />
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-5">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="font-display font-bold text-[26px] text-[hsl(var(--blue-900))] leading-tight">University not found</h2>
          <Link to="/universities" className="inline-flex items-center gap-1.5 rounded-xl btn-primary text-white h-11 px-6 font-bold text-[13px]">
            Browse universities <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-white">
      <Navbar />

      <section className="pt-28 pb-12 bg-[hsl(var(--blue-900))] text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-1.5 text-[13px] text-white/75 mb-4">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/universities" className="hover:text-white">Universities</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white font-bold">{uni.name}</span>
          </div>

          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {uni.image_url ? (
                  <img src={uni.image_url} alt={uni.short_name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; e.target.parentElement.textContent = uni.flag; }} />
                ) : (
                  <span className="text-4xl">{uni.flag}</span>
                )}
              </div>
            </div>
            <div className="absolute top-0 right-0">
              <LanguageSwitcher universityId={id} fields={uni} onTranslated={setTranslated} />
            </div>
              <div>
                <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-200))] bg-white/10 rounded-full px-3 py-1">
                  <GraduationCap className="w-3.5 h-3.5" /> {uni.type}
                </div>
                <h1 className="mt-3 font-display font-bold text-[36px] sm:text-[48px] leading-[1.0] tracking-[-0.02em]">
                  {t('short_name') || uni.short_name}
                </h1>
                <p className="mt-2 text-[17px] text-white/80 max-w-xl">{t('name') || uni.name}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[14px] text-white/75">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {t('location') || uni.location}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Globe2 className="w-4 h-4" /> {uni.country_name}
                  </span>
                </div>
              </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                onClick={() => {
                  try {
                    const shortlist = JSON.parse(localStorage.getItem('wehive_shortlist') || '[]');
                    const exists = shortlist.find(s => s.id === uni.id);
                    if (exists) {
                      const updated = shortlist.filter(s => s.id !== uni.id);
                      localStorage.setItem('wehive_shortlist', JSON.stringify(updated));
                      setSaved(false);
                    } else {
                      shortlist.push({ id: uni.id, name: uni.name, short_name: uni.short_name, flag: uni.flag, country: uni.country, tuition_usd: uni.tuition_usd, rank: uni.rank });
                      localStorage.setItem('wehive_shortlist', JSON.stringify(shortlist));
                      setSaved(true);
                    }
                  } catch {}
                }}
                variant="outline"
                className="h-12 px-5 bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white rounded-xl"
              >
                <Bookmark className={`w-4 h-4 mr-1.5 ${saved ? 'fill-current' : ''}`} />
                {saved ? 'Saved' : 'Save'}
              </Button>
              <button
                onClick={() => setShowApplyModal(true)}
                className="inline-flex items-center gap-2 rounded-xl btn-accent text-white h-12 px-6 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--blue-900))]"
              >
                Apply now <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 bg-white border-b border-[hsl(var(--border))]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatCard icon={Award} label="World Rank" value={`#${uni.rank}`} />
            <StatCard icon={Star} label="QS Rank" value={`#${uni.qs_rank || '—'}`} />
            <StatCard icon={Award} label="THE Rank" value={`#${uni.times_rank || '—'}`} />
            <StatCard icon={Users} label="Students" value={(uni.students || 0).toLocaleString()} />
            <StatCard icon={Globe2} label="Intl. Students" value={(uni.intl_students || 0).toLocaleString()} />
            <StatCard icon={DollarSign} label="Tuition/yr" value={uni.tuition_usd === 0 ? 'Free' : `$${(uni.tuition_usd || 0).toLocaleString()}`} />
            <StatCard icon={TrendingUp} label="Avg Salary" value={uni.avg_salary_usd ? `$${(uni.avg_salary_usd || 0).toLocaleString()}` : '—'} />
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="rounded-2xl bg-white border border-[hsl(var(--border))] p-6">
              <h2 className="font-display font-bold text-[22px] text-[hsl(var(--blue-900))] mb-3 leading-tight">About</h2>
              <p className="text-[15px] text-muted-foreground leading-relaxed">
                {t('description') || `${uni.short_name} is a prestigious institution located in ${uni.location}, ${uni.country_name}. Established in ${uni.established}, it is known for its academic excellence and research contributions.`}
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-[13px] text-muted-foreground">
                <span>Founded: <strong>{uni.established}</strong></span>
                <span>Type: <strong>{uni.type}</strong></span>
                {uni.accreditation?.length > 0 && (
                  <span>Accreditation: <strong>{uni.accreditation.join(', ')}</strong></span>
                )}
              </div>
            </div>

            <ProgramDetailsCard uni={uni} />

            <ProgramCard universityId={id} />

            <div>
              <h2 className="font-display font-bold text-[22px] text-[hsl(var(--blue-900))] mb-4 leading-tight">Campus Facilities</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {(uni.facilities || []).map(f => (
                  <FacilityCard key={f} name={f} />
                ))}
              </div>
            </div>

            <ReviewsCard universityId={id} />

            <div className="rounded-2xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-100))] p-6 sm:p-8">
              <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))]">
                <Sparkles className="w-3.5 h-3.5" /> Ready to apply?
              </div>
              <h3 className="mt-2 font-display font-bold text-[24px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
                Start your application to {uni.short_name}
              </h3>
              <p className="mt-2 text-[15px] text-muted-foreground max-w-lg">
                We handle your student visa application from document review to submission.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl btn-accent text-white h-12 px-6 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2"
                >
                  Apply now <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  to={`/universities?country=${uni.country}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white border border-[hsl(var(--border))] hover:border-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-700))] text-[hsl(var(--blue-900))] h-12 px-6 font-semibold transition-colors"
                >
                  More from {uni.country_name}
                </Link>
              </div>
            </div>
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <IntakeCalendar intakes={uni.intakes} country_name={uni.country_name} />

            <div className="rounded-2xl bg-white border border-[hsl(var(--border))] p-6">
              <h3 className="font-bold text-[16px] text-[hsl(var(--blue-900))] mb-4">Key Metrics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))]">
                  <span className="text-[13px] text-muted-foreground">Acceptance Rate</span>
                  <span className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{uni.acceptance_rate || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))]">
                  <span className="text-[13px] text-muted-foreground">Employment Rate</span>
                  <span className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{uni.employment_rate || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))]">
                  <span className="text-[13px] text-muted-foreground">Est. Living Cost/yr</span>
                  <span className="text-[14px] font-bold text-[hsl(var(--blue-900))]">${(uni.living_cost_usd || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-[13px] text-muted-foreground">Scholarships</span>
                  <span className={`text-[14px] font-bold ${uni.scholarships ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                    {uni.scholarships ? 'Available' : 'Not available'}
                  </span>
                </div>
              </div>
            </div>

            {uni.website && (
              <a href={uni.website.startsWith('http') ? uni.website : `https://${uni.website}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-2xl bg-white border border-[hsl(var(--border))] p-5 hover:border-[hsl(var(--blue-200))] transition-colors group">
                <ExternalLink className="w-5 h-5 text-[hsl(var(--blue-700))]" />
                <div>
                  <div className="text-[13px] font-bold text-[hsl(var(--blue-900))] group-hover:text-[hsl(var(--blue-700))]">Visit official website</div>
                  <div className="text-[12px] text-muted-foreground truncate max-w-[200px]">{uni.website}</div>
                </div>
              </a>
            )}

            <AIUniversityQA universityId={id} universityName={uni.short_name} />
            <AIAcceptanceProbability universityId={id} universityName={uni.short_name} />

            <div className="rounded-2xl bg-white border border-[hsl(var(--border))] p-6">
              <h3 className="font-bold text-[16px] text-[hsl(var(--blue-900))] mb-2">Study Abroad with WeHive</h3>
              <ul className="space-y-2">
                {['Expert visa guidance', 'Document verification', 'Application tracking', 'Scholarship assistance'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-[hsl(var(--blue-700))] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {showApplyModal && uni && (
        <MultiUniversityApplyModal universities={[uni]} onClose={() => setShowApplyModal(false)} />
      )}
      <Footer />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API } from '../context/AuthContext';
import { Loader2, Clock, DollarSign, GraduationCap, BookOpen, Globe, ArrowLeft, ExternalLink, ChevronRight } from 'lucide-react';

const DEGREE_COLORS = {
  bachelor: { bg: 'bg-[hsl(var(--blue-50))]', text: 'text-[hsl(var(--blue-700))]', border: 'border-[hsl(var(--blue-100))]' },
  master: { bg: 'bg-[hsl(var(--blue-50))]', text: 'text-[hsl(var(--blue-700))]', border: 'border-[hsl(var(--blue-100))]' },
  phd: { bg: 'bg-[hsl(var(--blue-50))]', text: 'text-[hsl(var(--blue-700))]', border: 'border-[hsl(var(--blue-100))]' },
  diploma: { bg: 'bg-[hsl(var(--blue-50))]', text: 'text-[hsl(var(--blue-700))]', border: 'border-[hsl(var(--blue-100))]' },
};

export default function ProgramList() {
  const { universityId } = useParams();
  const [uni, setUni] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    setUni(null);
    setPrograms([]);
    setFilter('all');
    Promise.all([
      axios.get(`${API}/universities/${universityId}`).catch(() => null),
      axios.get(`${API}/programs/${universityId}`).catch(() => ({ data: [] })),
    ]).then(([uRes, pRes]) => {
      if (uRes) setUni(uRes.data);
      setPrograms(pRes.data || []);
      setLoading(false);
    });
  }, [universityId]);

  const degreeTypes = [...new Set(programs.map(p => p.degree_type).filter(Boolean))];
  const filtered = filter === 'all' ? programs : programs.filter(p => p.degree_type === filter);

  if (loading) return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" /></div>
      <Footer />
    </div>
  );

  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      <section className="pt-28 pb-12 bg-[hsl(var(--blue-900))] text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <Link to={`/university/${universityId}`} className="inline-flex items-center gap-1 text-[14px] text-white/75 hover:text-white mb-4 min-h-[44px]">
            <ArrowLeft className="w-4 h-4" /> Back to {uni?.name || 'university'}
          </Link>
          <h1 className="font-display font-bold text-[32px] sm:text-[48px] tracking-[-0.02em] leading-[1.05]">
            Programs at {uni?.short_name || 'University'}
          </h1>
          <p className="mt-3 text-[16px] text-white/80 max-w-xl">{programs.length} programs available</p>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-[hsl(var(--soft-bg))]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          {degreeTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              <button onClick={() => setFilter('all')} className={`px-4 min-h-[44px] rounded-full border text-[14px] font-semibold transition-colors ${filter === 'all' ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))] text-white' : 'bg-white border-[hsl(var(--border))] text-muted-foreground hover:text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-200))]'}`}>All</button>
              {degreeTypes.map(dt => (
                <button key={dt} onClick={() => setFilter(dt)} className={`px-4 min-h-[44px] rounded-full border text-[14px] font-semibold transition-colors ${filter === dt ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))] text-white' : 'bg-white border-[hsl(var(--border))] text-muted-foreground hover:text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-200))]'}`}>
                  {dt.charAt(0).toUpperCase() + dt.slice(1)}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-[15px] font-bold">No programs found</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filtered.map(p => {
                const dc = DEGREE_COLORS[p.degree_type] || { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
                return (
                  <div key={p.id} className="rounded-2xl bg-white border border-[hsl(var(--border))] shadow-sm p-5 sm:p-6 hover:border-[hsl(var(--blue-200))] hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-[16px] text-[hsl(var(--blue-900))]">{p.name}</h3>
                          <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full border ${dc.bg} ${dc.text} ${dc.border}`}>
                            {p.degree_type?.charAt(0).toUpperCase() + p.degree_type?.slice(1)}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                          <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="w-3.5 h-3.5" /> {p.duration_years} years</span>
                          <span className="flex items-center gap-1.5 text-muted-foreground"><DollarSign className="w-3.5 h-3.5" /> ${(p.tuition_usd || 0).toLocaleString()}/yr</span>
                          {p.ielts_min && <span className="flex items-center gap-1.5 text-muted-foreground"><BookOpen className="w-3.5 h-3.5" /> IELTS {p.ielts_min}+</span>}
                          {p.toefl_min && <span className="flex items-center gap-1.5 text-muted-foreground"><BookOpen className="w-3.5 h-3.5" /> TOEFL {p.toefl_min}</span>}
                          <span className="flex items-center gap-1.5 text-muted-foreground"><Globe className="w-3.5 h-3.5" /> {p.language}</span>
                          {p.application_fee_usd > 0 && <span className="flex items-center gap-1.5 text-muted-foreground">App fee: ${p.application_fee_usd}</span>}
                        </div>
                        {p.entry_requirements && (
                          <div className="mt-3 p-3 rounded-lg bg-[hsl(var(--blue-50))]">
                            <div className="text-[12px] font-bold text-[hsl(var(--blue-900))] uppercase tracking-[0.14em] mb-1">Entry Requirements</div>
                            <p className="text-[12px] text-muted-foreground">{p.entry_requirements}</p>
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(p.intake_months || []).map(m => (
                            <span key={m} className="text-[12px] px-2 py-0.5 rounded-full bg-[hsl(var(--soft-bg))] border border-[hsl(var(--border))] text-[hsl(var(--blue-900))] font-semibold">{m}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white border border-[hsl(var(--border))] hover:border-[hsl(var(--blue-700))] text-[hsl(var(--blue-700))] px-4 h-10 text-[13px] font-semibold transition-colors">
                        Official page <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

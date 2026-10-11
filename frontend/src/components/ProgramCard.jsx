import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, DollarSign, GraduationCap, BookOpen, Globe, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';
import axios from 'axios';
import { API } from '../context/AuthContext';

const DEGREE_COLORS = {
  bachelor: 'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] border-[hsl(var(--blue-100))]',
  master: 'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] border-[hsl(var(--blue-100))]',
  phd: 'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] border-[hsl(var(--blue-100))]',
  diploma: 'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] border-[hsl(var(--blue-100))]',
};

export default function ProgramCard({ universityId, limit = 6 }) {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/programs/${universityId}`)
      .then(r => setPrograms(r.data || []))
      .catch(() => setPrograms([]))
      .finally(() => setLoading(false));
  }, [universityId]);

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blue-700))]" /></div>;
  if (programs.length === 0) return null;

  const displayed = programs.slice(0, limit);

  return (
    <div className="rounded-2xl bg-white border border-[hsl(var(--border))] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[16px] text-[hsl(var(--blue-900))]">
          <GraduationCap className="w-4 h-4 inline mr-1.5 text-[hsl(var(--blue-700))]" />
          Programs ({programs.length})
        </h3>
        {programs.length > limit && (
          <Link to={`/programs/${universityId}`} className="text-[12px] font-bold text-[hsl(var(--blue-700))] hover:underline flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="space-y-3">
        {displayed.map(p => (
          <div key={p.id} className="rounded-xl bg-[hsl(var(--soft-bg))] p-4 border border-[hsl(var(--border))] hover:border-[hsl(var(--blue-200))] transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-[14px] text-[hsl(var(--blue-900))] truncate">{p.name}</h4>
                  <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full border ${DEGREE_COLORS[p.degree_type] || 'bg-slate-100 text-slate-600'}`}>
                    {p.degree_type?.charAt(0).toUpperCase() + p.degree_type?.slice(1) || 'N/A'}
                  </span>
                  <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full border ${DEGREE_COLORS[p.degree_type] || 'bg-slate-100 text-slate-600'}`}>
                    {p.degree_type?.charAt(0).toUpperCase() + p.degree_type?.slice(1) || 'N/A'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.duration_years} yrs</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ${(p.tuition_usd || 0).toLocaleString()}/yr</span>
                  {p.ielts_min && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> IELTS {p.ielts_min}+</span>}
                  <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {p.language}</span>
                </div>
              </div>
            </div>
            {p.entry_requirements && (
              <div className="mt-2 text-[12px] text-muted-foreground line-clamp-1">{p.entry_requirements}</div>
            )}
            {p.url && (
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-[hsl(var(--blue-700))] hover:underline">
                Program page <ExternalLink className="w-3 h-3" />
              </a>
            )}

          </div>
        ))}
      </div>
    </div>
  );
}

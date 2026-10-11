import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Loader2, ArrowRight, GraduationCap, DollarSign, Globe, BookOpen, Target, X, Award } from 'lucide-react';
import { useAuth, API } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import axios from 'axios';
import { useDialogA11y } from '../../hooks/use-dialog-a11y';

export default function AIScholarshipMatcher({ open, onClose }) {
  const dialogProps = useDialogA11y(open, onClose);
  const { token } = useAuth();
  const { toast } = useToast();

  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);

  const [budget, setBudget] = useState(25000);
  const [country, setCountry] = useState('');
  const [ieltsScore, setIeltsScore] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');

  const handleMatch = async () => {
    setBusy(true);
    try {
      const body = { budget: Number(budget) };
      if (country.trim()) body.country = country.trim().toLowerCase();
      if (ieltsScore) body.ielts_score = Number(ieltsScore);
      if (fieldOfStudy.trim()) body.field_of_study = fieldOfStudy.trim().toLowerCase();

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await axios.post(`${API}/ai/universities/scholarship-match`, body, { headers });
      setResults(data);
    } catch (e) {
      toast({ title: 'Scholarship match failed', description: e.response?.data?.detail || e.message });
    }
    setBusy(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[hsl(var(--blue-900))]/60" onClick={onClose}>
      <div {...dialogProps} className="rounded-2xl bg-white border border-[hsl(var(--border))] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-[hsl(var(--blue-50))] flex items-center justify-center">
              <Award className="w-5 h-5 text-[hsl(var(--blue-700))]" />
            </div>
            <div>
              <h3 className="font-bold text-[16px] text-[hsl(var(--blue-900))]">AI Scholarship Matcher</h3>
              <p className="text-[12px] text-muted-foreground">Find universities with the best financial aid opportunities</p>
            </div>
          </div>
          <button aria-label="Close" onClick={onClose} className="h-11 w-11 rounded-full hover:bg-[hsl(var(--blue-50))] flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-[hsl(var(--blue-900))]" />
          </button>
        </div>

        {!results && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="aischolarshipmatcher-budget-usd-year" className="block text-[12px] font-bold text-[hsl(var(--blue-900))] mb-1">
                  <DollarSign className="w-3.5 h-3.5 inline mr-1" /> Budget (USD/year)
                </label>
                <input id="aischolarshipmatcher-budget-usd-year" type="number" value={budget} onChange={e => setBudget(e.target.value)} className="w-full h-10 px-4 rounded-xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--border))] text-[14px] outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label htmlFor="aischolarshipmatcher-country" className="block text-[12px] font-bold text-[hsl(var(--blue-900))] mb-1">
                  <Globe className="w-3.5 h-3.5 inline mr-1" /> Country
                </label>
                <input id="aischolarshipmatcher-country" type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="us, gb, de..." className="w-full h-10 px-4 rounded-xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--border))] text-[14px] outline-none focus:border-emerald-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="aischolarshipmatcher-ielts-score" className="block text-[12px] font-bold text-[hsl(var(--blue-900))] mb-1">
                  <Target className="w-3.5 h-3.5 inline mr-1" /> IELTS Score
                </label>
                <input id="aischolarshipmatcher-ielts-score" type="number" step="0.5" min="0" max="9" value={ieltsScore} onChange={e => setIeltsScore(e.target.value)} placeholder="e.g. 7.0" className="w-full h-10 px-4 rounded-xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--border))] text-[14px] outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label htmlFor="aischolarshipmatcher-field-of-study" className="block text-[12px] font-bold text-[hsl(var(--blue-900))] mb-1">
                  <BookOpen className="w-3.5 h-3.5 inline mr-1" /> Field of Study
                </label>
                <input id="aischolarshipmatcher-field-of-study" type="text" value={fieldOfStudy} onChange={e => setFieldOfStudy(e.target.value)} placeholder="engineering, business..." className="w-full h-10 px-4 rounded-xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--border))] text-[14px] outline-none focus:border-emerald-500" />
              </div>
            </div>
            <button onClick={handleMatch} disabled={busy}
              className="w-full h-12 rounded-xl bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] disabled:opacity-50 text-white font-bold text-[14px] flex items-center justify-center gap-2">
              {busy ? <><Loader2 className="w-5 h-5 animate-spin" /> Matching...</> : <><Award className="w-5 h-5" /> Find Scholarships</>}
            </button>
          </div>
        )}

        {results && (
          <div className="p-5">
            {results.note && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[13px] text-amber-800">{results.note}</div>
            )}
            {results.matches && results.matches.length > 0 ? (
              <div className="space-y-3">
                {results.matches.slice(0, 8).map((uni, idx) => (
                  <div key={uni.id} className="rounded-xl bg-[hsl(var(--blue-50))] p-4 border border-[hsl(var(--border))] hover:border-emerald-300 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">#{idx + 1}</span>
                          <h4 className="font-bold text-[15px] text-[hsl(var(--blue-900))] truncate">{uni.name}</h4>
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{uni.country_name || uni.country} · ${uni.tuition_usd?.toLocaleString()}/yr</p>
                      </div>
                      {uni.match_score != null && (
                        <div className="shrink-0 w-14 h-14 rounded-full bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-100))] flex items-center justify-center text-[hsl(var(--blue-700))] font-bold text-[18px]">
                          {uni.match_score}
                        </div>
                      )}
                    </div>
                    {uni.reason && <p className="mt-2 text-[13px] text-muted-foreground">{uni.reason}</p>}
                    {uni.scholarship_tips && (
                      <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                        <p className="text-[12px] font-bold text-emerald-700 mb-0.5">Tip</p>
                        <p className="text-[12px] text-emerald-700/80">{uni.scholarship_tips}</p>
                      </div>
                    )}
                    <Link to={`/university/${uni.id}`} className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-emerald-600 hover:underline">
                      View university <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-[15px] font-bold">No scholarship matches found</p>
                <p className="text-[13px] mt-1">Try adjusting your criteria.</p>
              </div>
            )}
            <button onClick={() => setResults(null)} className="mt-4 w-full h-10 rounded-xl bg-[hsl(var(--blue-50))] hover:bg-[hsl(var(--blue-100))] text-[hsl(var(--blue-900))] font-bold text-[13px]">
              Refine search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

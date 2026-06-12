import { useState } from 'react';
import { Check, Loader2, Info, ArrowRight, GraduationCap, UserPlus, LogIn } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth, API } from '../context/AuthContext';
import { inr } from '../lib/utils';
import axios from 'axios';

function computeFee(count) {
  const n = Math.max(1, count);
  if (n <= 3) return { application: 20000, gst: Math.round(20000 * 0.18), total: 20000 + Math.round(20000 * 0.18) };
  const app = 20000 + (n - 3) * 3000;
  const gst = Math.round(app * 0.18);
  return { application: app, gst, total: app + gst };
}

export default function MultiUniversityApplyModal({ universities, onClose }) {
  const { isAuthed, openAuth, token } = useAuth();
  const [step, setStep] = useState('review');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const VISA_TYPE = 'Student';
  const COUNTRY_IDS = [...new Set(universities.map(u => u.country))];
  const primaryCountry = COUNTRY_IDS[0] || 'us';

  const fees = computeFee(universities.length);

  const handleSubmit = async () => {
    if (!isAuthed) { openAuth('signup'); return; }
    setSubmitting(true);
    setError('');
    try {
      const r = await axios.post(
        `${API}/users/me/applications/universities`,
        {
          university_ids: universities.map(u => u.id),
          country_id: primaryCountry,
          visa_type: VISA_TYPE,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(r.data);
      setStep('done');
    } catch (e) {
      setError(e.response?.data?.detail || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}>
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[hsl(var(--blue-700))]" />
            <h2 className="text-[18px] font-display font-extrabold">Apply to {universities.length} universit{universities.length === 1 ? 'y' : 'ies'}</h2>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-[hsl(var(--blue-900))]/40 hover:text-[hsl(var(--blue-900))] p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {step === 'review' && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="text-[14px] font-bold text-[hsl(var(--blue-900))] mb-3">Selected Universities</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {universities.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--soft-bg))]">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] flex items-center justify-center text-sm shrink-0">
                      {u.flag}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-[hsl(var(--blue-900))] truncate">{u.short_name}</div>
                      <div className="text-[11px] text-[hsl(var(--blue-900))]/60 truncate">{u.name}</div>
                    </div>
                    <div className="text-[11px] font-bold text-[hsl(var(--blue-700))] bg-white px-2 py-1 rounded-md">#{u.rank}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <h3 className="text-[14px] font-bold text-amber-800 mb-3">Application Fee</h3>
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between text-amber-700">
                  <span>1–3 universities (flat fee)</span>
                  <span className="font-bold">₹20,000</span>
                </div>
                {universities.length > 3 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Additional {universities.length - 3} universit{universities.length - 3 === 1 ? 'y' : 'ies'} (₹3,000 each)</span>
                    <span className="font-bold">₹{(universities.length - 3) * 3000}</span>
                  </div>
                )}
                <div className="flex justify-between text-amber-700 pt-2 border-t border-amber-200">
                  <span>Application fee</span>
                  <span className="font-bold">₹{fees.application.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>GST (18%)</span>
                  <span className="font-bold">₹{fees.gst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-amber-800 text-[15px] pt-2 border-t border-amber-200">
                  <span className="font-bold">Total payable</span>
                  <span className="font-extrabold">₹{fees.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {!isAuthed && (
              <div className="rounded-2xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-200))] p-4">
                <div className="flex items-start gap-2 text-[13px] text-[hsl(var(--blue-800))]">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Account required.</span> You need to sign in or create an account to apply.
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-3 text-[13px] text-red-700">{error}</div>
            )}

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose} disabled={submitting} className="flex-1 rounded-xl h-12 border-black/10">
                Cancel
              </Button>
              {!isAuthed ? (
                <Button onClick={() => openAuth('signup')} className="flex-1 rounded-xl h-12 btn-primary text-white font-bold flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Sign up to apply
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1 rounded-xl h-12 btn-primary text-white font-bold">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Confirm & Apply
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-[20px] font-display font-extrabold text-[hsl(var(--blue-900))]">Application Created!</h3>
            <p className="text-[14px] text-[hsl(var(--blue-900))]/60">
              Your multi-university application for <strong>{result.university_count}</strong> universit{result.university_count === 1 ? 'y' : 'ies'} has been saved as draft.
            </p>
            <div className="rounded-2xl bg-[hsl(var(--soft-bg))] p-4 text-left">
              <div className="text-[13px] font-bold text-[hsl(var(--blue-900))] mb-2">Application ID</div>
              <div className="text-[12px] text-[hsl(var(--blue-900))]/60 font-mono break-all">{result.id}</div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-12 border-black/10">
                Close
              </Button>
              <Button onClick={() => { window.location.href = `/account/applications/${result.id}`; }} className="flex-1 rounded-xl h-12 btn-primary text-white font-bold">
                View Application <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

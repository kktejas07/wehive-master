import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../context/AuthContext';
import { Loader2, CheckCircle, XCircle, AlertCircle, Shield, X } from 'lucide-react';
import { Button } from '../ui/button';

export default function QualityCheckModal({ open, onClose, applicationId, token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !applicationId || !token) return;
    setLoading(true);
    axios.get(`${API}/agents/me/quality-check/${applicationId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [open, applicationId, token]);

  if (!open) return null;

  const score = data?.score ?? 0;
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[hsl(var(--blue-700))]" />
            <span className="font-bold text-[16px] text-[hsl(var(--blue-900))]">Application Quality Check</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[hsl(var(--soft-bg))] flex items-center justify-center">
            <X className="w-4 h-4 text-[hsl(var(--blue-900))]/50" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading && <div className="flex flex-col items-center py-10 gap-3"><Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" /><span className="text-[13px] text-[hsl(var(--blue-900))]/55">Analysing documents…</span></div>}

          {!loading && !data && <div className="text-center py-10 text-[hsl(var(--blue-900))]/55">Could not load quality check. Make sure you are an approved agent.</div>}

          {!loading && data && (
            <>
              <div className="flex items-center gap-5 mb-6 p-5 rounded-2xl bg-[hsl(var(--soft-bg))]">
                <div className="relative w-20 h-20 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreColor} strokeWidth="3.5"
                      strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-[18px]" style={{ color: scoreColor }}>{score}</span>
                </div>
                <div>
                  <div className="font-display font-extrabold text-[20px] text-[hsl(var(--blue-900))]">
                    {data.ready_to_submit ? 'Ready to Submit' : 'Needs Attention'}
                  </div>
                  <div className="text-[13px] text-[hsl(var(--blue-900))]/60 mt-0.5">
                    {data.critical_issues > 0 ? `${data.critical_issues} critical issue${data.critical_issues > 1 ? 's' : ''} must be resolved before submission.` : 'All critical requirements are met.'}
                    {data.optional_missing > 0 ? ` ${data.optional_missing} optional item${data.optional_missing > 1 ? 's' : ''} missing.` : ''}
                  </div>
                </div>
              </div>

              {data.critical_issues > 0 && (
                <div className="mb-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-red-600 mb-2">Critical — Must Fix</div>
                  <div className="space-y-2">
                    {data.checks.filter(c => c.critical && !c.passed).map(c => (
                      <div key={c.id} className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5">
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <span className="text-[13px] font-medium text-red-800">{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.optional_missing > 0 && (
                <div className="mb-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber-600 mb-2">Recommended — Improve Success Rate</div>
                  <div className="space-y-2">
                    {data.checks.filter(c => !c.critical && !c.passed).map(c => (
                      <div key={c.id} className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-[13px] font-medium text-amber-800">{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-green-600 mb-2">Completed</div>
                <div className="space-y-2">
                  {data.checks.filter(c => c.passed).map(c => (
                    <div key={c.id} className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-100 px-4 py-2.5">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="text-[13px] font-medium text-green-800">{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-black/5 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} className="rounded-full h-10 px-5 font-bold">Close</Button>
          {data?.ready_to_submit && (
            <Button onClick={onClose} className="rounded-full h-10 px-5 font-bold btn-primary text-white">
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Submit Application
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, X, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth, API } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';

const RISK_CONFIG = {
  low: { color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2, label: 'Low Risk' },
  medium: { color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertTriangle, label: 'Medium Risk' },
  high: { color: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: AlertTriangle, label: 'High Risk' },
  critical: { color: 'red', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: XCircle, label: 'Critical Risk' },
};

const SEVERITY_ORDER = { critical: 0, major: 1, minor: 2, note: 3 };

function ScoreBar({ score }) {
  const color = score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 rounded-full bg-black/10 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <span className="text-[13px] font-extrabold text-[hsl(var(--blue-900))] w-10 text-right">{score}</span>
    </div>
  );
}

function ChecklistItem({ label, status }) {
  const config = {
    ok: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    weak: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    missing: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  };
  const { icon: Icon, color, bg } = config[status] || config.missing;
  return (
    <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${bg}`}>
      <Icon className={`w-4 h-4 shrink-0 ${color}`} />
      <span className="text-[12.5px] text-[hsl(var(--blue-900))]">{label}</span>
    </div>
  );
}

function FactorCard({ factor }) {
  const severityColors = {
    critical: 'bg-red-50 border-red-200',
    major: 'bg-amber-50 border-amber-200',
    minor: 'bg-blue-50 border-blue-200',
    note: 'bg-[hsl(var(--soft-bg))] border-black/8',
  };
  return (
    <div className={`rounded-2xl border p-4 ${severityColors[factor.severity] || severityColors.note}`}>
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 text-[11px] font-bold uppercase tracking-[0.1em] rounded-full px-2 py-0.5 shrink-0 ${
          factor.severity === 'critical' ? 'bg-red-100 text-red-700' :
          factor.severity === 'major' ? 'bg-amber-100 text-amber-700' :
          factor.severity === 'minor' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-600'
        }`}>{factor.severity}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">{factor.title}</div>
          <div className="text-[12px] text-[hsl(var(--blue-900))]/65 mt-1 leading-relaxed">{factor.description}</div>
          {factor.fixable && factor.fix_suggestion && (
            <div className="mt-2 rounded-xl bg-white/70 border border-black/8 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--accent))] mb-1">Fix suggestion</div>
              <div className="text-[12px] text-[hsl(var(--blue-900))]/80">{factor.fix_suggestion}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AIRiskAnalysisModal({ open, onClose, applicationId }) {
  const { token } = useAuth();
  const { toast } = useToast();

  const [focusAreas, setFocusAreas] = useState([]);
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState(null);

  const handleClose = () => { setResult(null); onClose?.(); };

  const onAnalyse = async () => {
    setAnalysing(true);
    try {
      const r = await axios.post(
        `${API}/apps/${applicationId}/risk-analysis`,
        { focus_areas: focusAreas.length > 0 ? focusAreas : undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(r.data.analysis || null);
    } catch (e) {
      toast({ title: 'Analysis failed', description: e?.response?.data?.detail || 'Please try again.' });
    } finally {
      setAnalysing(false);
    }
  };

  const toggleFocus = (area) => {
    setFocusAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const risk = result?.risk_level || 'low';
  const riskCfg = RISK_CONFIG[risk] || RISK_CONFIG.low;
  const RiskIcon = riskCfg.icon;

  const sortedFactors = [...(result?.factors || [])].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-[hsl(var(--blue-900))]/40 backdrop-blur-sm" onClick={handleClose} />
          <motion.div
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <header className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/5 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent))]/10">
                  <ShieldAlert className="w-4 h-4 text-[hsl(var(--accent))]" />
                </span>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">AI Review</div>
                  <h2 className="font-display text-[18px] font-extrabold tracking-[-0.02em] text-[hsl(var(--blue-900))]">
                    Rejection Risk Analyser
                  </h2>
                </div>
              </div>
              <button onClick={handleClose} className="h-9 w-9 rounded-full hover:bg-black/5 inline-flex items-center justify-center" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="px-6 py-5 overflow-y-auto flex-1">
              {!result ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-[hsl(var(--accent))]/20 bg-[hsl(var(--soft-bg))] p-4 text-[13px] text-[hsl(var(--blue-900))]/70">
                    Our AI reviews your application and flags potential rejection risks before you submit. Upload your documents for best results.
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--blue-900))]/60 mb-2">Focus areas (optional)</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ['financial_proof', 'Financial proof'],
                        ['travel_history', 'Travel history'],
                        ['document_quality', 'Document quality'],
                        ['genuine_intent', 'Genuine intent'],
                        ['form_completeness', 'Form completeness'],
                        ['ties_to_home', 'Ties to home country'],
                      ].map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => toggleFocus(val)}
                          className={`rounded-full px-3.5 py-1.5 text-[12px] font-bold border transition ${
                            focusAreas.includes(val)
                              ? 'bg-[hsl(var(--accent))] text-white border-[hsl(var(--accent))]'
                              : 'border-black/15 text-[hsl(var(--blue-900))]/60 hover:border-[hsl(var(--accent))]/50'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={onAnalyse}
                    disabled={analysing}
                    className="w-full rounded-full btn-accent text-white h-11 font-bold"
                  >
                    {analysing ? (
                      <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Analysing your application…</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Analyse for rejection risks</span>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className={`rounded-2xl border ${riskCfg.border} ${riskCfg.bg} p-5`}>
                    <div className="flex items-center gap-3">
                      <RiskIcon className={`w-7 h-7 shrink-0 ${riskCfg.text}`} />
                      <div className="flex-1">
                        <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-[hsl(var(--accent))]">Risk Level</div>
                        <div className={`text-[22px] font-extrabold ${riskCfg.text}`}>{riskCfg.label}</div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="text-[11px] text-[hsl(var(--blue-900))]/50 mb-2">Risk Score: {result.risk_score || 0}/100</div>
                      <ScoreBar score={result.risk_score || 0} />
                    </div>
                    {result.summary && (
                      <p className="mt-3 text-[13px] text-[hsl(var(--blue-900))]/80 leading-relaxed">{result.summary}</p>
                    )}
                  </div>

                  {result.checks && (
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/50 mb-3">Quick checks</div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(result.checks).map(([key, check]) => {
                          const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                          return (
                            <ChecklistItem key={key} label={label} status={check?.status || 'missing'} />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {sortedFactors.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/50 mb-3">Risk factors & recommendations</div>
                      <div className="space-y-2">
                        {sortedFactors.map((f, i) => (
                          <FactorCard key={i} factor={f} />
                        ))}
                      </div>
                    </div>
                  )}

                  {result.overall_advice && (
                    <div className="rounded-2xl border border-[hsl(var(--accent))]/20 bg-[hsl(var(--accent))]/5 p-4">
                      <div className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--accent))] mb-2">Overall advice</div>
                      <div className="text-[13px] text-[hsl(var(--blue-900))]/80 leading-relaxed">{result.overall_advice}</div>
                    </div>
                  )}

                  {result.approvals_needed?.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/50 mb-2">Approvals needed before submission</div>
                      <ul className="space-y-1.5">
                        {result.approvals_needed.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px] text-[hsl(var(--blue-900))]/80">
                            <span className="text-[hsl(var(--accent))] mt-0.5">•</span> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button onClick={handleClose} className="w-full rounded-full btn-accent text-white h-11 font-bold">
                    Done
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
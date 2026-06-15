import { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, X, Calendar, MapPin, DollarSign, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth, API } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';

const STYLES = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'cultural', label: 'Cultural' },
];
const BUDGETS = [
  { value: 'budget', label: 'Budget' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'luxury', label: 'Luxury' },
];

function DayView({ day }) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white overflow-hidden">
      <div className="bg-gradient-to-r from-[hsl(var(--blue-700))] to-[hsl(var(--accent))] px-4 py-2.5 flex items-center justify-between">
        <span className="text-white text-[13px] font-bold">Day {day.day}</span>
        {day.theme && (
          <span className="text-white/80 text-[11px]">{day.theme}</span>
        )}
      </div>
      <div className="p-4 space-y-3">
        {(day.activities || []).map((a, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="text-[11px] font-mono text-[hsl(var(--accent))] mt-0.5 w-10 shrink-0">{a.time || ''}</span>
            <div>
              <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">{a.activity}</div>
              {a.location && (
                <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--blue-900))]/55 mt-0.5">
                  <MapPin className="w-3 h-3" /> {a.location}
                </div>
              )}
              {a.note && <div className="text-[11px] text-[hsl(var(--blue-900))]/50 mt-0.5 italic">{a.note}</div>}
            </div>
          </div>
        ))}
        {day.meals && (
          <div className="mt-3 pt-3 border-t border-black/5">
            <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-[hsl(var(--blue-900))]/40 mb-2">Meals</div>
            <div className="grid grid-cols-3 gap-2 text-[11.5px]">
              {[
                ['breakfast', 'B'],
                ['lunch', 'L'],
                ['dinner', 'D'],
              ].map(([key, label]) => (
                <div key={key} className="rounded-lg bg-[hsl(var(--soft-bg))] px-2 py-1.5">
                  <div className="font-bold text-[hsl(var(--accent))]">{label}</div>
                  <div className="text-[hsl(var(--blue-900))]/60 truncate">{day.meals[key] || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {day.travel_tip && (
          <div className="mt-2 text-[11px] text-[hsl(var(--blue-900))]/50 flex items-center gap-1.5">
            <span className="font-bold">Tip:</span> {day.travel_tip}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIItineraryModal({ open, onClose, applicationId, country_id }) {
  const { token } = useAuth();
  const { toast } = useToast();

  const [days, setDays] = useState(7);
  const [style, setStyle] = useState('balanced');
  const [budget, setBudget] = useState('moderate');
  const [generating, setGenerating] = useState(false);
  const [itinerary, setItinerary] = useState(null);

  const handleClose = () => { setItinerary(null); onClose?.(); };

  const onGenerate = async () => {
    setGenerating(true);
    try {
      const r = await axios.get(
        `${API}/apps/${applicationId}/ai-itinerary`,
        {
          params: { days, style, budget },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setItinerary(r.data.itinerary || null);
    } catch (e) {
      toast({ title: 'Generation failed', description: e?.response?.data?.detail || 'Please try again.' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-[hsl(var(--blue-900))]/40 backdrop-blur-sm" onClick={handleClose} />
          <motion.div
            className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <header className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/5 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent))]/10">
                  <Calendar className="w-4 h-4 text-[hsl(var(--accent))]" />
                </span>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">AI Planner</div>
                  <h2 className="font-display text-[18px] font-extrabold tracking-[-0.02em] text-[hsl(var(--blue-900))]">
                    AI Itinerary Generator
                  </h2>
                </div>
              </div>
              <button onClick={handleClose} className="h-9 w-9 rounded-full hover:bg-black/5 inline-flex items-center justify-center" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="px-6 py-5 overflow-y-auto flex-1">
              {!itinerary ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-[hsl(var(--accent))]/20 bg-[hsl(var(--soft-bg))] p-4 text-[13px] text-[hsl(var(--blue-900))]/70">
                    Generate a personalised day-by-day itinerary for this trip. The more specific you are, the better the result.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[12px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--blue-900))]/60 mb-1.5">Number of days</label>
                      <input
                        type="number"
                        min={3}
                        max={30}
                        value={days}
                        onChange={e => setDays(Math.min(30, Math.max(3, Number(e.target.value))))}
                        className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--blue-900))]/60 mb-1.5">Style</label>
                      <div className="relative">
                        <select
                          value={style}
                          onChange={e => setStyle(e.target.value)}
                          className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/40 appearance-none bg-white"
                        >
                          {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--blue-900))]/40 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--blue-900))]/60 mb-1.5">Budget</label>
                      <div className="relative">
                        <select
                          value={budget}
                          onChange={e => setBudget(e.target.value)}
                          className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/40 appearance-none bg-white"
                        >
                          {BUDGETS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--blue-900))]/40 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {itinerary?.budget_estimate && (
                    <div className="rounded-2xl border border-black/8 p-4">
                      <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--blue-900))]/60 mb-3">
                        <DollarSign className="w-3.5 h-3.5" /> Budget estimate (INR per person)
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                          ['Low', itinerary.budget_estimate.low],
                          ['Mid', itinerary.budget_estimate.mid],
                          ['High', itinerary.budget_estimate.high],
                        ].map(([label, val]) => (
                          <div key={label} className="rounded-xl bg-[hsl(var(--soft-bg))] p-3">
                            <div className="text-[11px] text-[hsl(var(--blue-900))]/50">{label}</div>
                            <div className="text-[16px] font-extrabold text-[hsl(var(--blue-900))]">₹{(val || 0).toLocaleString('en-IN')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={onGenerate}
                    disabled={generating}
                    className="w-full rounded-full btn-accent text-white h-11 font-bold"
                  >
                    {generating ? (
                      <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Generating your itinerary…</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Generate AI Itinerary</span>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--accent))]">Your Itinerary</div>
                      <div className="text-[15px] font-extrabold text-[hsl(var(--blue-900))]">{itinerary.days?.length || 0} days</div>
                    </div>
                    <button
                      onClick={() => setItinerary(null)}
                      className="text-[12px] underline hover:no-underline text-[hsl(var(--blue-900))]/60"
                    >Regenerate</button>
                  </div>

                  {(itinerary.highlights || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {itinerary.highlights.map((h, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--accent))]/10 text-[11px] font-bold text-[hsl(var(--accent))] px-3 py-1">
                          <Sparkles className="w-3 h-3" /> {h}
                        </span>
                      ))}
                    </div>
                  )}

                  {(itinerary.packing_tips || []).length > 0 && (
                    <div className="rounded-2xl border border-[hsl(var(--accent))]/20 bg-[hsl(var(--soft-bg))] p-4">
                      <div className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--accent))] mb-2">Packing tips</div>
                      <ul className="space-y-1">
                        {itinerary.packing_tips.map((t, i) => (
                          <li key={i} className="text-[12.5px] text-[hsl(var(--blue-900))]/70 flex items-start gap-2">
                            <span className="text-[hsl(var(--accent))]">•</span> {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-3">
                    {(itinerary.days || []).map((d) => (
                      <DayView key={d.day} day={d} />
                    ))}
                  </div>

                  {itinerary.budget_estimate && (
                    <div className="rounded-2xl border border-black/8 p-4">
                      <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--blue-900))]/60 mb-3">
                        <DollarSign className="w-3.5 h-3.5" /> Budget estimate (INR per person)
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                          ['Low', itinerary.budget_estimate.low],
                          ['Mid', itinerary.budget_estimate.mid],
                          ['High', itinerary.budget_estimate.high],
                        ].map(([label, val]) => (
                          <div key={label} className="rounded-xl bg-[hsl(var(--soft-bg))] p-3">
                            <div className="text-[11px] text-[hsl(var(--blue-900))]/50">{label}</div>
                            <div className="text-[16px] font-extrabold text-[hsl(var(--blue-900))]">₹{(val || 0).toLocaleString('en-IN')}</div>
                          </div>
                        ))}
                      </div>
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
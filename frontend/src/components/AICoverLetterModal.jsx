import { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, X, FileText, Copy, Check, AlertTriangle, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const DESTINATIONS = {
  'us': 'United States', 'uk': 'United Kingdom', 'jp': 'Japan',
  'fr': 'France', 'sg': 'Singapore', 'ae': 'UAE', 'au': 'Australia',
  'ca': 'Canada', 'it': 'Italy', 'ch': 'Switzerland', 'th': 'Thailand',
  'de': 'Germany', 'np': 'Nepal', 'bt': 'Bhutan',
};

export default function AICoverLetterModal({ open, onClose, applicationId, country_id, visa_type, formData }) {
  const { token } = useAuth();
  const { toast } = useToast();

  const [purpose, setPurpose] = useState('');
  const [sponsors, setSponsors] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [additional, setAdditional] = useState('');
  const [generating, setGenerating] = useState(false);
  const [letter, setLetter] = useState('');
  const [copied, setCopied] = useState(false);

  const applicantName = formData?.full_name || '';

  const reset = () => {
    setPurpose(''); setSponsors(''); setTravelDate(''); setAdditional('');
    setLetter(''); setGenerating(false); setCopied(false);
  };

  const handleClose = () => { reset(); onClose?.(); };

  const onGenerate = async () => {
    if (!purpose.trim()) {
      toast({ title: 'Purpose required', description: 'Please describe the purpose of your trip.' });
      return;
    }
    setGenerating(true);
    try {
      const r = await axios.post(
        `${API}/apps/${applicationId}/cover-letter`,
        {
          purpose: purpose.trim(),
          applicant_name: applicantName || 'Applicant',
          nationality: 'Indian',
          destination: DESTINATIONS[country_id] || country_id?.toUpperCase() || 'Unknown',
          visa_type: visa_type || 'Tourist',
          travel_date: travelDate || undefined,
          sponsors: sponsors || undefined,
          additional_info: additional || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLetter(r.data.letter || '');
    } catch (e) {
      toast({ title: 'Generation failed', description: e?.response?.data?.detail || 'Please try again.' });
    } finally {
      setGenerating(false);
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Could not copy' });
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
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <header className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/5 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent))]/10">
                  <FileText className="w-4 h-4 text-[hsl(var(--accent))]" />
                </span>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">AI Writing</div>
                  <h2 className="font-display text-[18px] font-extrabold tracking-[-0.02em] text-[hsl(var(--blue-900))]">
                    Cover Letter / SOP Writer
                  </h2>
                </div>
              </div>
              <button onClick={handleClose} className="h-9 w-9 rounded-full hover:bg-black/5 inline-flex items-center justify-center" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="px-6 py-5 overflow-y-auto flex-1">
              {!letter ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[hsl(var(--accent))]/20 bg-[hsl(var(--soft-bg))] p-4 text-[13px] text-[hsl(var(--blue-900))]/70">
                    Our AI generates a professional cover letter tailored to your application. Fill in the details below.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[12px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--blue-900))]/60 mb-1.5">Purpose of travel *</label>
                      <textarea
                        value={purpose}
                        onChange={e => setPurpose(e.target.value)}
                        rows={3}
                        placeholder="e.g. Tourism — exploring historic landmarks and experiencing local culture in France..."
                        className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/40 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--blue-900))]/60 mb-1.5">Travel date (if known)</label>
                      <input
                        type="date"
                        value={travelDate}
                        onChange={e => setTravelDate(e.target.value)}
                        className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/40"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--blue-900))]/60 mb-1.5">Sponsorship / funds</label>
                      <input
                        value={sponsors}
                        onChange={e => setSponsors(e.target.value)}
                        placeholder="e.g. Self-funded, parents sponsoring..."
                        className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/40"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[12px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--blue-900))]/60 mb-1.5">Additional context (optional)</label>
                      <textarea
                        value={additional}
                        onChange={e => setAdditional(e.target.value)}
                        rows={2}
                        placeholder="Any extra details that would make the letter stronger: ties to India, specific itinerary, etc."
                        className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/40 resize-none"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={onGenerate}
                    disabled={generating}
                    className="w-full rounded-full btn-accent text-white h-11 font-bold"
                  >
                    {generating ? (
                      <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Generating…</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Generate cover letter</span>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-center gap-2 text-[13px] text-emerald-700">
                    <Check className="w-4 h-4 shrink-0" />
                    <span className="font-bold">Cover letter generated successfully</span>
                    <button
                      onClick={() => setLetter('')}
                      className="ml-auto text-[11px] underline hover:no-underline"
                    >Regenerate</button>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[hsl(var(--soft-bg))]/50 p-5">
                    <pre className="whitespace-pre-wrap text-[13.5px] text-[hsl(var(--blue-900))] leading-relaxed font-sans" style={{ fontFamily: 'inherit' }}>
                      {letter}
                    </pre>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={onCopy} className="rounded-full h-10 px-4 font-bold border-black/10 gap-1.5">
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy to clipboard'}
                    </Button>
                    <Button onClick={handleClose} className="rounded-full btn-accent text-white h-10 px-5 font-bold">
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
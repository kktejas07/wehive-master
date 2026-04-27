import { useRef, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Upload, Loader2, X, Check, AlertTriangle, Crown } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const FIELD_LABELS = {
  full_name: 'Full name',
  given_names: 'Given names',
  surname: 'Surname',
  date_of_birth: 'Date of birth',
  gender: 'Gender',
  nationality: 'Nationality',
  place_of_birth: 'Place of birth',
  passport_number: 'Passport number',
  issue_date: 'Issue date',
  expiry_date: 'Expiry date',
  issuing_country: 'Issuing country',
  issuing_authority: 'Issuing authority',
};

function PremiumGate({ onUpgrade, upgrading }) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--accent))]/30 bg-gradient-to-br from-[hsl(var(--soft-bg))] to-white p-6 sm:p-7 text-center" data-testid="scan-premium-gate">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--accent))]/10 mb-3">
        <Crown className="w-5 h-5 text-[hsl(var(--accent))]" />
      </div>
      <h3 className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-[hsl(var(--blue-900))]">
        Unlock AI document scanning
      </h3>
      <p className="mt-2 text-[13.5px] text-[hsl(var(--blue-900))]/65 max-w-md mx-auto">
        Upload your passport and supporting documents — our AI extracts every detail in seconds,
        so you don't have to type a thing. Premium feature.
      </p>
      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-md mx-auto">
        {[
          'Passport OCR with MRZ decoding',
          'Auto-fill visa forms',
          'Address, photo & signature detection',
          'Supporting doc classification',
        ].map((t) => (
          <li key={t} className="flex items-start gap-2 text-[13px] text-[hsl(var(--blue-900))]/80">
            <Check className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" /> {t}
          </li>
        ))}
      </ul>
      <Button
        data-testid="scan-upgrade-btn"
        onClick={onUpgrade}
        disabled={upgrading}
        className="mt-5 rounded-full btn-accent text-white h-11 px-6 font-bold"
      >
        {upgrading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Crown className="w-4 h-4" /> Upgrade to Premium
          </span>
        )}
      </Button>
      <div className="mt-2 text-[11px] text-[hsl(var(--blue-900))]/50">
        Demo mode — no payment required
      </div>
    </div>
  );
}

function ExtractionView({ data, onConfirm, onRetry }) {
  if (!data) return null;
  const warnings = data.warnings || [];
  const rows = Object.entries(FIELD_LABELS)
    .map(([k, label]) => [label, data[k]])
    .filter(([, v]) => v);

  return (
    <div className="space-y-4" data-testid="scan-extraction-view">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="flex items-center gap-2 text-emerald-700 text-[13px] font-bold">
          <Check className="w-4 h-4" /> Extraction complete
          {typeof data.confidence === 'number' && (
            <span className="ml-auto text-[11px] font-semibold bg-white border border-emerald-200 px-2 py-0.5 rounded-full">
              {data.confidence}% confidence
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white">
        <div className="px-4 py-3 border-b border-black/5 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
          Extracted fields
        </div>
        <dl className="divide-y divide-black/5">
          {rows.length === 0 && (
            <div className="px-4 py-6 text-center text-[13px] text-[hsl(var(--blue-900))]/55">
              No fields detected. Try a clearer photo.
            </div>
          )}
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[140px_1fr] gap-3 px-4 py-2.5 text-[13.5px]">
              <dt className="text-[hsl(var(--blue-900))]/60">{label}</dt>
              <dd className="font-bold text-[hsl(var(--blue-900))] break-words">{String(value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-center gap-2 text-amber-700 text-[13px] font-bold">
            <AlertTriangle className="w-4 h-4" /> Notes
          </div>
          <ul className="mt-2 space-y-1 text-[12.5px] text-amber-800 list-disc pl-4">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onRetry} className="rounded-full h-10 px-4 font-bold border-black/10" data-testid="scan-retry-btn">
          Scan another
        </Button>
        <Button onClick={() => onConfirm(data)} className="rounded-full btn-accent text-white h-10 px-5 font-bold" data-testid="scan-apply-btn">
          Use these values
        </Button>
      </div>
    </div>
  );
}

export default function AIScanModal({ open, onClose, applicationId, onApplied }) {
  const { user, token, refreshUser } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef(null);

  const [mode, setMode] = useState('passport'); // passport | document
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [result, setResult] = useState(null);

  const isPremium = !!user?.is_premium;

  const reset = () => {
    setFile(null);
    setResult(null);
    setScanning(false);
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const onUpgrade = async () => {
    setUpgrading(true);
    try {
      await axios.post(`${API}/users/me/upgrade`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await refreshUser();
      toast({ title: 'Welcome to Premium', description: 'AI scanning is now unlocked.' });
    } catch (e) {
      toast({ title: 'Could not upgrade', description: e?.response?.data?.detail || 'Please try again.' });
    } finally {
      setUpgrading(false);
    }
  };

  const onPick = (f) => {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      toast({ title: 'Unsupported format', description: 'Please upload a JPG, PNG or WEBP image.' });
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Maximum size is 8MB.' });
      return;
    }
    setFile(f);
    setResult(null);
  };

  const onScan = async () => {
    if (!file) return;
    setScanning(true);
    try {
      const form = new FormData();
      form.append('file', file);
      if (applicationId) form.append('application_id', applicationId);
      const endpoint = mode === 'passport' ? 'passport' : 'document';
      const r = await axios.post(`${API}/scan/${endpoint}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResult(r.data.extracted || {});
    } catch (e) {
      const detail = e?.response?.data?.detail;
      if (e?.response?.status === 402) {
        toast({ title: 'Premium required', description: detail });
      } else {
        toast({
          title: 'Scan failed',
          description: detail || 'The image could not be processed. Try a clearer photo.',
        });
      }
    } finally {
      setScanning(false);
    }
  };

  const onConfirm = (data) => {
    onApplied?.(data);
    toast({ title: 'Fields saved', description: 'We\'ve copied these details to your application.' });
    handleClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="scan-modal"
        >
          <div
            className="absolute inset-0 bg-[hsl(var(--blue-900))]/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <header className="flex items-center justify-between px-5 sm:px-7 pt-5 pb-4 border-b border-black/5">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent))]/10">
                  <Sparkles className="w-4.5 h-4.5 text-[hsl(var(--accent))]" />
                </span>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
                    AI Document Scan
                  </div>
                  <h2 className="font-display text-[18px] font-extrabold tracking-[-0.02em] text-[hsl(var(--blue-900))]">
                    {mode === 'passport' ? 'Scan your passport' : 'Scan a supporting document'}
                  </h2>
                </div>
              </div>
              <button
                data-testid="scan-modal-close"
                onClick={handleClose}
                className="h-9 w-9 rounded-full hover:bg-black/5 inline-flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="px-5 sm:px-7 py-5 max-h-[70vh] overflow-y-auto">
              {!isPremium ? (
                <PremiumGate onUpgrade={onUpgrade} upgrading={upgrading} />
              ) : result ? (
                <ExtractionView data={result} onConfirm={onConfirm} onRetry={reset} />
              ) : (
                <div className="space-y-4">
                  <div className="inline-flex rounded-full bg-[hsl(var(--soft-bg))] p-1 text-[12.5px] font-bold">
                    {[
                      ['passport', 'Passport'],
                      ['document', 'Supporting doc'],
                    ].map(([v, l]) => (
                      <button
                        key={v}
                        data-testid={`scan-mode-${v}`}
                        onClick={() => { setMode(v); setResult(null); setFile(null); }}
                        className={`px-4 py-1.5 rounded-full transition ${
                          mode === v ? 'bg-white shadow text-[hsl(var(--blue-900))]' : 'text-[hsl(var(--blue-900))]/60'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>

                  <label
                    data-testid="scan-drop-zone"
                    className="block rounded-2xl border-2 border-dashed border-black/15 bg-[hsl(var(--soft-bg))]/60 p-6 text-center cursor-pointer hover:border-[hsl(var(--accent))]/50 transition"
                  >
                    <input
                      ref={inputRef}
                      data-testid="scan-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => onPick(e.target.files?.[0])}
                    />
                    <Upload className="w-6 h-6 mx-auto text-[hsl(var(--blue-900))]/50" />
                    <div className="mt-2 text-[13.5px] font-bold text-[hsl(var(--blue-900))]">
                      {file ? file.name : 'Click to choose an image'}
                    </div>
                    <div className="text-[11.5px] text-[hsl(var(--blue-900))]/55">
                      JPG, PNG or WEBP · max 8MB
                    </div>
                  </label>

                  {file && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setFile(null)}
                        className="rounded-full h-10 px-4 font-bold border-black/10"
                        data-testid="scan-clear-btn"
                      >
                        Clear
                      </Button>
                      <Button
                        data-testid="scan-start-btn"
                        onClick={onScan}
                        disabled={scanning}
                        className="flex-1 rounded-full btn-accent text-white h-10 px-5 font-bold"
                      >
                        {scanning ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Analysing…
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4" /> Scan with AI
                          </span>
                        )}
                      </Button>
                    </div>
                  )}

                  <div className="text-[11.5px] text-[hsl(var(--blue-900))]/55 leading-relaxed">
                    Your image is processed by Gemini 2.5 Flash and not stored permanently.
                    Keep lighting even, avoid glare, and crop to the data page.
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

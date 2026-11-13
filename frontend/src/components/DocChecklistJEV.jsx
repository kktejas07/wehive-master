import { useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';

const INDIAN_MANDATORY = [
  { id: 'aadhaar', label: 'Aadhaar Card', hint: 'Front + back, PDF or JPG' },
  { id: 'pan', label: 'PAN Card', hint: 'Clear scan, PDF or JPG' },
];
const STANDARD = [
  { id: 'passport', label: 'Passport (all pages)', hint: 'PDF scan' },
  { id: 'photo', label: 'Passport Photo', hint: '35×45 mm, white background' },
  { id: 'sop', label: 'Statement of Purpose', hint: 'PDF, max 2 pages' },
];

export default function DocChecklistJEV({ passportCountry, onVerified }) {
  const isIndian = passportCountry === 'IN';
  const required = isIndian ? [...INDIAN_MANDATORY, ...STANDARD] : STANDARD;
  const [uploaded, setUploaded] = useState({});

  const toggle = (id) => setUploaded(prev => ({ ...prev, [id]: !prev[id] }));
  const missing = required.filter(d => !uploaded[d.id]);
  const ready = missing.length === 0;

  const verify = () => {
    if (!ready) return { ok: false, missing: missing.map(d => d.label) };
    onVerified?.();
    return { ok: true };
  };

  return (
    <div className="space-y-3">
      <h3 className="font-display font-bold text-[15px] text-[hsl(var(--blue-900))]">
        Required Documents
      </h3>

      {required.map(doc => (
        <label
          key={doc.id}
          className={`flex items-start gap-3 cursor-pointer rounded-xl px-4 py-3 border transition-colors ${
            uploaded[doc.id]
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-white border-[hsl(var(--border))] hover:border-[hsl(var(--blue-300))]'
          }`}
        >
          <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md shrink-0 ${
            uploaded[doc.id] ? 'bg-emerald-500 text-white' : 'border-2 border-[hsl(var(--border))]'
          }`}>
            {uploaded[doc.id] && <Check className="w-3 h-3" />}
          </span>
          <input type="checkbox" checked={!!uploaded[doc.id]} onChange={() => toggle(doc.id)} className="sr-only" />
          <div>
            <p className="text-[14px] font-semibold text-[hsl(var(--blue-900))]">
              {doc.label}
              {isIndian && (doc.id === 'aadhaar' || doc.id === 'pan') && (
                <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                  Required
                </span>
              )}
            </p>
            <p className="text-[12px] text-muted-foreground">{doc.hint}</p>
          </div>
        </label>
      ))}

      {!ready && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[13px] text-amber-700">
            Missing: {missing.map(d => d.label).join(', ')}
          </p>
        </div>
      )}

      <button
        onClick={verify}
        disabled={!ready}
        className="w-full mt-2 bg-[hsl(var(--blue-700))] text-white text-[14px] font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        Confirm Documents & Continue
      </button>
    </div>
  );
}

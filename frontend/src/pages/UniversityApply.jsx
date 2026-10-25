import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  GraduationCap, Globe, ChevronRight, Check, ArrowLeft,
  Loader2, Gift, Ticket, Star, Info,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API } from '../context/AuthContext';
import { inr } from '../lib/utils';

const SERVICE_FEE = 4999; // ₹ per university

const VISA_TYPES = [
  { id: 'f1', label: 'F-1 (USA)', hint: 'Study in the United States', flag: '🇺🇸' },
  { id: 'uk', label: 'Student Visa UK', hint: 'Tier 4 / CAS', flag: '🇬🇧' },
  { id: 'ca', label: 'Study Permit Canada', hint: 'DLI approved', flag: '🇨🇦' },
  { id: 'au', label: 'Student Visa Australia', hint: 'Subclass 500', flag: '🇦🇺' },
  { id: 'de', label: 'Student Visa Germany', hint: 'Enrolled or admitted', flag: '🇩🇪' },
  { id: 'other', label: 'Other country', hint: 'Europe, Asia & more', flag: '🌍' },
];

const DEGREES = [
  { id: 'bachelor', label: "Bachelor's" },
  { id: 'master', label: "Master's" },
  { id: 'phd', label: 'PhD / Doctoral' },
  { id: 'diploma', label: 'Diploma / Certificate' },
];

const FIELDS = [
  'Computer Science / IT', 'Business / MBA', 'Engineering', 'Medicine / Nursing',
  'Arts & Design', 'Law', 'Science', 'Social Sciences', 'Other',
];

const STEPS = ['Your Profile', 'Choose Universities', 'Summary'];

function promos(visaType, count) {
  return {
    f1Free: visaType === 'f1' && count >= 4,
    stickerVisa: count >= 5,
  };
}

function feeBreakdown(selected, visaType) {
  const { f1Free, stickerVisa } = promos(visaType, selected.length);
  return selected.map((u, i) => {
    const isFree = f1Free && i === 4;
    return { ...u, fee: isFree ? 0 : SERVICE_FEE, isFree, stickerVisa: stickerVisa && i === 0 };
  });
}

// Step 1 ─────────────────────────────────────────────────────────────────────
function ProfileStep({ profile, onChange, onNext }) {
  const { visa_type, degree, gpa, count, field } = profile;
  const ready = visa_type && degree && count >= 1;

  const selCls = (active) =>
    `cursor-pointer rounded-xl border p-3 transition-colors ${
      active
        ? 'border-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))]'
        : 'border-[hsl(var(--border))] bg-white hover:border-[hsl(var(--blue-200))]'
    }`;

  const { f1Free, stickerVisa } = promos(visa_type, count);

  return (
    <div className="space-y-8">
      {/* Visa type */}
      <fieldset>
        <legend className="text-[14px] font-bold text-[hsl(var(--blue-900))] mb-3">
          Which country are you applying to? <span aria-hidden>*</span>
        </legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {VISA_TYPES.map((v) => (
            <label key={v.id} className={selCls(visa_type === v.id)} onClick={() => onChange('visa_type', v.id)}>
              <input type="radio" name="visa_type" value={v.id} checked={visa_type === v.id} onChange={() => onChange('visa_type', v.id)} className="sr-only" />
              <span className="text-[22px]">{v.flag}</span>
              <span className="mt-1 block text-[13px] font-bold text-[hsl(var(--blue-900))]">{v.label}</span>
              <span className="block text-[11px] text-muted-foreground leading-snug">{v.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Degree */}
      <fieldset>
        <legend className="text-[14px] font-bold text-[hsl(var(--blue-900))] mb-3">
          Degree type <span aria-hidden>*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {DEGREES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onChange('degree', d.id)}
              className={`px-4 h-9 rounded-full border text-[13px] font-semibold transition-colors ${
                degree === d.id
                  ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))] text-white'
                  : 'bg-white border-[hsl(var(--border))] text-muted-foreground hover:border-[hsl(var(--blue-200))]'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Field of study */}
      <div>
        <label className="block text-[14px] font-bold text-[hsl(var(--blue-900))] mb-3">
          Field of study
        </label>
        <div className="flex flex-wrap gap-2">
          {FIELDS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onChange('field', field === f ? '' : f)}
              className={`px-3 h-8 rounded-full border text-[12px] font-semibold transition-colors ${
                field === f
                  ? 'bg-[hsl(var(--blue-50))] border-[hsl(var(--blue-700))] text-[hsl(var(--blue-700))]'
                  : 'bg-white border-[hsl(var(--border))] text-muted-foreground hover:border-[hsl(var(--blue-200))]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Score */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[14px] font-bold text-[hsl(var(--blue-900))] mb-1.5">
            GPA / Percentage
          </label>
          <input
            type="number"
            min={0}
            max={100}
            placeholder="e.g. 8.5 CGPA or 85%"
            value={gpa}
            onChange={(e) => onChange('gpa', e.target.value)}
            className="w-full h-11 rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-[15px] outline-none focus:border-[hsl(var(--blue-700))] focus:ring-[3px] focus:ring-[hsl(var(--blue-700))]/20"
          />
        </div>
        <div>
          <label className="block text-[14px] font-bold text-[hsl(var(--blue-900))] mb-1.5">
            Number of universities <span aria-hidden>*</span>
          </label>
          <select
            value={count}
            onChange={(e) => onChange('count', Number(e.target.value))}
            className="w-full h-11 rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-[15px] outline-none focus:border-[hsl(var(--blue-700))] focus:ring-[3px] focus:ring-[hsl(var(--blue-700))]/20"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? 'university' : 'universities'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Promo callouts */}
      {(f1Free || stickerVisa) && (
        <div className="space-y-2">
          {f1Free && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
              <Gift className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
              <span><strong>F-1 Offer:</strong> Select 4+ universities on an F-1 visa — we process the 5th one free (service fee waived)!</span>
            </div>
          )}
          {stickerVisa && (
            <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--blue-200))] bg-[hsl(var(--blue-50))] px-4 py-3 text-[13px] text-[hsl(var(--blue-900))]">
              <Ticket className="w-4 h-4 mt-0.5 shrink-0 text-[hsl(var(--blue-700))]" />
              <span><strong>5-University Offer:</strong> Apply to 5+ universities and we include a free sticker visa service!</span>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={!ready}
        className="w-full sm:w-auto h-12 px-8 rounded-xl btn-accent font-semibold text-[15px] inline-flex items-center justify-center gap-2 disabled:opacity-50"
      >
        Choose universities <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// Step 2 ─────────────────────────────────────────────────────────────────────
function UniversityStep({ profile, selected, onToggle, onNext, onBack }) {
  const [unis, setUnis] = useState([]);
  const [loading, setLoading] = useState(true);
  const { count, visa_type } = profile;
  const { f1Free, stickerVisa } = promos(visa_type, selected.length);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (profile.degree) params.degree_type = profile.degree;
    if (profile.field) params.field = profile.field;

    axios.get(`${API}/universities`, { params })
      .then((r) => {
        const list = (r.data?.universities || r.data || []).slice(0, 30);
        setUnis(list);
      })
      .catch(() => setUnis([]))
      .finally(() => setLoading(false));
  }, [profile.degree, profile.field]);

  const isSelected = (id) => selected.some((u) => u.id === id);
  const atMax = selected.length >= 8;

  return (
    <div className="space-y-6">
      {/* Promo banners */}
      {(f1Free || stickerVisa || (visa_type === 'f1' && selected.length < 4)) && (
        <div className="space-y-2">
          {visa_type === 'f1' && selected.length < 4 && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
              <Gift className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
              <span>Select <strong>{4 - selected.length} more</strong> university{4 - selected.length !== 1 ? 'ies' : ''} to unlock your free 5th!</span>
            </div>
          )}
          {f1Free && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
              <Gift className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
              <span><strong>F-1 Offer unlocked!</strong> The 5th university you select will be processed free of our service fee.</span>
            </div>
          )}
          {stickerVisa && (
            <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--blue-200))] bg-[hsl(var(--blue-50))] px-4 py-3 text-[13px] text-[hsl(var(--blue-900))]">
              <Ticket className="w-4 h-4 mt-0.5 shrink-0 text-[hsl(var(--blue-700))]" />
              <span><strong>5-University Offer unlocked!</strong> A free sticker visa service is included with your package.</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[14px] text-muted-foreground">
          {selected.length} of {count} planned • {count - selected.length > 0
            ? `Select ${count - selected.length} more`
            : 'Looking good!'}
        </p>
        {selected.length > 0 && (
          <span className="text-[13px] font-semibold text-[hsl(var(--blue-700))]">
            {selected.length} selected
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" />
        </div>
      ) : unis.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-[14px]">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
          No universities found for your filters. Try adjusting degree type or field.
        </div>
      ) : (
        <ul className="space-y-3">
          {unis.map((u, idx) => {
            const sel = isSelected(u.id || u._id);
            const selIdx = selected.findIndex((s) => s.id === (u.id || u._id));
            const willBeFree = visa_type === 'f1' && sel && selIdx === 4;

            return (
              <li key={u.id || u._id}>
                <label className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
                  sel
                    ? 'border-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))]'
                    : 'border-[hsl(var(--border))] bg-white hover:border-[hsl(var(--blue-200))]'
                }`}>
                  <input
                    type="checkbox"
                    checked={sel}
                    disabled={!sel && atMax}
                    onChange={() => onToggle({ id: u.id || u._id, name: u.name, country: u.country, ranking: u.ranking })}
                    className="sr-only"
                  />
                  <span className={`mt-0.5 h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                    sel ? 'border-[hsl(var(--blue-700))] bg-[hsl(var(--blue-700))]' : 'border-[hsl(var(--border))]'
                  }`}>
                    {sel && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[15px] text-[hsl(var(--blue-900))]">{u.name}</span>
                      {u.ranking && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold">
                          <Star className="w-2.5 h-2.5" /> #{u.ranking}
                        </span>
                      )}
                      {willBeFree && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 font-bold">
                          FREE
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                      {u.country && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {u.country}</span>}
                      {u.city && <span>{u.city}</span>}
                    </div>
                  </div>
                  <span className="shrink-0 text-[13px] font-semibold text-[hsl(var(--blue-700))]">
                    {willBeFree ? <span className="text-emerald-600">FREE</span> : inr(SERVICE_FEE)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onBack} className="h-11 px-5 rounded-xl border border-[hsl(var(--border))] text-[14px] font-semibold inline-flex items-center gap-2 hover:border-[hsl(var(--blue-200))]">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={selected.length === 0}
          className="h-11 px-7 rounded-xl btn-accent font-semibold text-[14px] inline-flex items-center gap-2 disabled:opacity-50"
        >
          Review & confirm <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Step 3 ─────────────────────────────────────────────────────────────────────
function SummaryStep({ profile, selected, onBack }) {
  const navigate = useNavigate();
  const { visa_type } = profile;
  const items = feeBreakdown(selected, visa_type);
  const { f1Free, stickerVisa } = promos(visa_type, selected.length);
  const total = items.reduce((s, i) => s + i.fee, 0);

  const handleProceed = () => {
    navigate('/free-consultation');
  };

  return (
    <div className="space-y-6">
      {/* Promo badges */}
      {(f1Free || stickerVisa) && (
        <div className="space-y-2">
          {f1Free && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
              <Gift className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
              <div>
                <strong>F-1 4+1 Promotion applied!</strong>
                <span className="ml-1">Your 5th university is on us — service fee waived.</span>
              </div>
            </div>
          )}
          {stickerVisa && (
            <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--blue-200))] bg-[hsl(var(--blue-50))] px-4 py-3 text-[13px] text-[hsl(var(--blue-900))]">
              <Ticket className="w-4 h-4 mt-0.5 shrink-0 text-[hsl(var(--blue-700))]" />
              <div>
                <strong>5-University Promotion applied!</strong>
                <span className="ml-1">A free sticker visa service is included with this package.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected universities */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--blue-50))]">
          <span className="text-[13px] font-bold uppercase tracking-wide text-[hsl(var(--blue-700))]">Selected universities</span>
        </div>
        <ul className="divide-y divide-[hsl(var(--border))]">
          {items.map((u, i) => (
            <li key={u.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[12px] font-bold text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                <div className="min-w-0">
                  <p className="font-semibold text-[14px] text-[hsl(var(--blue-900))] truncate">{u.name}</p>
                  {u.country && <p className="text-[12px] text-muted-foreground">{u.country}</p>}
                </div>
              </div>
              <div className="text-right shrink-0">
                {u.isFree ? (
                  <div>
                    <span className="text-[13px] line-through text-muted-foreground mr-1">{inr(SERVICE_FEE)}</span>
                    <span className="text-[13px] font-bold text-emerald-600">FREE</span>
                  </div>
                ) : (
                  <span className="text-[14px] font-semibold text-[hsl(var(--blue-900))]">{inr(u.fee)}</span>
                )}
              </div>
            </li>
          ))}
          {stickerVisa && (
            <li className="flex items-center justify-between gap-4 px-5 py-3 bg-[hsl(var(--blue-50))]">
              <div className="flex items-center gap-3">
                <Ticket className="w-4 h-4 text-[hsl(var(--blue-700))] shrink-0" />
                <div>
                  <p className="font-semibold text-[14px] text-[hsl(var(--blue-900))]">Sticker visa service</p>
                  <p className="text-[12px] text-muted-foreground">Complimentary with 5-university package</p>
                </div>
              </div>
              <span className="text-[13px] font-bold text-emerald-600">FREE</span>
            </li>
          )}
        </ul>
        <div className="flex items-center justify-between px-5 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--soft-bg))]">
          <span className="font-bold text-[15px] text-[hsl(var(--blue-900))]">WeHive service fee total</span>
          <span className="font-display font-bold text-[22px] text-[hsl(var(--blue-900))]">{inr(total)}</span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          University application fees (paid to each university directly) are <strong>not included</strong> above.
          WeHive charges only for the application assistance service. College tuition fees are also paid directly to the institution.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onBack} className="h-11 px-5 rounded-xl border border-[hsl(var(--border))] text-[14px] font-semibold inline-flex items-center gap-2 hover:border-[hsl(var(--blue-200))]">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="button"
          onClick={handleProceed}
          className="h-11 px-7 rounded-xl btn-accent font-semibold text-[14px] inline-flex items-center gap-2"
        >
          Confirm & talk to a consultant <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Main page ───────────────────────────────────────────────────────────────────
export default function UniversityApply() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({
    visa_type: '',
    degree: '',
    gpa: '',
    count: 4,
    field: '',
  });
  const [selected, setSelected] = useState([]);

  const onChange = (k, v) => {
    setProfile((p) => ({ ...p, [k]: v }));
    if (k === 'visa_type' || k === 'count') setSelected([]);
  };

  const toggleUni = (u) => {
    setSelected((prev) => {
      if (prev.some((s) => s.id === u.id)) return prev.filter((s) => s.id !== u.id);
      if (prev.length >= 8) return prev;
      return [...prev, u];
    });
  };

  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-10 bg-[hsl(var(--blue-900))] text-white">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <Link to="/student-visa" className="inline-flex items-center gap-1 text-[14px] text-white/70 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" /> Student Visa
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <GraduationCap className="w-8 h-8 text-white/80" />
            <h1 className="font-display font-bold text-[32px] sm:text-[42px] tracking-[-0.02em]">
              University Application
            </h1>
          </div>
          <p className="text-[16px] text-white/80 max-w-xl">
            Tell us where you want to study and we'll handle the applications — with exclusive promotions for multiple universities.
          </p>

          {/* Steps */}
          <div className="mt-8 flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors ${
                  i === step
                    ? 'bg-white text-[hsl(var(--blue-900))]'
                    : i < step
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-white/50'
                }`}>
                  <span className={`h-5 w-5 rounded-full text-[11px] flex items-center justify-center font-bold ${
                    i < step ? 'bg-emerald-400 text-white' : i === step ? 'bg-[hsl(var(--blue-700))] text-white' : 'bg-white/20 text-white'
                  }`}>
                    {i < step ? <Check className="w-3 h-3" /> : i + 1}
                  </span>
                  {s}
                </div>
                {i < STEPS.length - 1 && <div className="w-4 h-px bg-white/20 mx-1" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wizard content */}
      <section className="py-10 sm:py-14 bg-[hsl(var(--soft-bg))]">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <div className="rounded-2xl bg-white border border-[hsl(var(--border))] shadow-sm p-6 sm:p-8">
            <h2 className="font-display font-bold text-[22px] text-[hsl(var(--blue-900))] mb-6">
              {STEPS[step]}
            </h2>

            {step === 0 && (
              <ProfileStep
                profile={profile}
                onChange={onChange}
                onNext={() => setStep(1)}
              />
            )}
            {step === 1 && (
              <UniversityStep
                profile={profile}
                selected={selected}
                onToggle={toggleUni}
                onNext={() => setStep(2)}
                onBack={() => setStep(0)}
              />
            )}
            {step === 2 && (
              <SummaryStep
                profile={profile}
                selected={selected}
                onBack={() => setStep(1)}
              />
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

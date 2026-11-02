import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../lib/apiBase';
import {
  ChevronDown,
  CheckCircle2,
  Circle,
  Loader2,
  FileText,
  ListChecks,
  CalendarDays,
  ChevronRight,
  Globe,
  GraduationCap,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COUNTRIES = ['USA', 'UK', 'Canada', 'Australia', 'Germany', 'Ireland', 'Netherlands', 'New Zealand', 'Singapore', 'France', 'Sweden'];
const PROGRAMS  = ['Masters', 'MBA', 'Bachelors', 'PhD', 'Diploma'];

// Static fallback so the feature never goes blank if the API is unreachable
const FALLBACK = {
  sop_tips: [
    'Open with a specific motivation — the problem you want to solve or the opportunity that drives you.',
    'Highlight relevant academic achievements and research projects with concrete outcomes.',
    'Show familiarity with at least 2–3 faculty members and their current research.',
    'Address any weaknesses (GPA gap, test scores) briefly and with evidence of growth.',
    'Tailor the "why this school" paragraph for every application — admissions officers notice generic copy.',
    'End with a clear 5-year career vision that ties directly back to this programme.',
  ],
  doc_checklist: [
    'Academic transcripts (official, sealed)',
    'English proficiency certificate (IELTS / TOEFL)',
    'Letters of Recommendation (2–3)',
    'Statement of Purpose',
    'CV / Resume',
    'Passport copy',
    'Financial proof for student visa',
    'Application fee confirmation',
  ],
  timeline: [
    { month: '12 months before', action: 'Research programmes; take English proficiency test', deadline_note: '' },
    { month: '9 months before',  action: 'Draft SOP; secure recommenders; gather documents',    deadline_note: '' },
    { month: '6 months before',  action: 'Submit applications',                                 deadline_note: '' },
    { month: '3 months before',  action: 'Accept offer; apply for student visa',               deadline_note: '' },
    { month: 'Arrival',          action: 'Orientation and university enrolment',                deadline_note: '' },
  ],
};

// localStorage key prefix for checkbox state
const LS_KEY = (country, program) => `wehive_appbuilder_${country}_${program}`;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepBadge({ n, active, done }) {
  const base = 'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 transition-colors';
  if (done)   return <span className={`${base} bg-[#011CB5] text-white`}><CheckCircle2 size={16} /></span>;
  if (active) return <span className={`${base} bg-[#011CB5] text-white`}>{n}</span>;
  return       <span className={`${base} bg-gray-200 text-gray-500`}>{n}</span>;
}

function SelectField({ label, icon: Icon, value, onChange, options, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
        <Icon size={14} className="text-[#011CB5]" /> {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2.5 pr-9 text-sm
                     focus:outline-none focus:ring-2 focus:ring-[#011CB5]/30 focus:border-[#011CB5]
                     bg-white text-gray-800"
        >
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>
    </div>
  );
}

function SOPCard({ tips }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="p-2 rounded-lg bg-[#011CB5]/10">
          <FileText size={18} className="text-[#011CB5]" />
        </span>
        <h3 className="font-semibold text-gray-900">SOP Tips</h3>
      </div>
      <ul className="space-y-2.5">
        {tips.map((tip, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-gray-700 leading-relaxed">
            <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-[#011CB5]/10 text-[#011CB5] text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChecklistCard({ items, country, program }) {
  const lsKey = LS_KEY(country, program);

  const [checked, setChecked] = useState(() => {
    try {
      const raw = localStorage.getItem(lsKey);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    try { localStorage.setItem(lsKey, JSON.stringify(checked)); } catch { /* quota */ }
  }, [checked, lsKey]);

  const toggle = (item) => setChecked(prev => ({ ...prev, [item]: !prev[item] }));
  const done   = Object.values(checked).filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-[#FF0302]/10">
            <ListChecks size={18} className="text-[#FF0302]" />
          </span>
          <h3 className="font-semibold text-gray-900">Document Checklist</h3>
        </div>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">
          {done}/{items.length} done
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-[#011CB5] rounded-full transition-all duration-300"
          style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
        />
      </div>

      <ul className="space-y-2">
        {items.map((item, i) => {
          const isChecked = !!checked[item];
          return (
            <li key={i}>
              <button
                onClick={() => toggle(item)}
                className="flex items-start gap-2.5 w-full text-left group"
              >
                {isChecked
                  ? <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-[#011CB5]" />
                  : <Circle       size={18} className="shrink-0 mt-0.5 text-gray-300 group-hover:text-[#011CB5]/50 transition-colors" />
                }
                <span className={`text-sm leading-snug transition-colors ${isChecked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                  {item}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TimelineCard({ timeline }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="p-2 rounded-lg bg-emerald-50">
          <CalendarDays size={18} className="text-emerald-600" />
        </span>
        <h3 className="font-semibold text-gray-900">Application Timeline</h3>
      </div>
      <ol className="relative border-l-2 border-gray-100 ml-2 space-y-5">
        {timeline.map((step, i) => (
          <li key={i} className="ml-4">
            <div className="absolute -left-[9px] w-4 h-4 rounded-full border-2 border-[#011CB5] bg-white" />
            <p className="text-xs font-semibold text-[#011CB5] uppercase tracking-wide mb-0.5">{step.month}</p>
            <p className="text-sm text-gray-800 leading-snug">{step.action}</p>
            {step.deadline_note && (
              <p className="text-xs text-amber-600 mt-0.5 italic">{step.deadline_note}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ApplicationBuilder() {
  const [country, setCountry] = useState('');
  const [program, setProgram] = useState('');
  const [step,    setStep]    = useState(1);   // 1 = selectors, 2 = results
  const [loading, setLoading] = useState(false);
  const [data,    setData]    = useState(null);

  const canProceed = country && program;

  const handleGenerate = async () => {
    if (!canProceed) return;
    setLoading(true);
    try {
      const { data: res } = await axios.get(`${API}/application-builder`, {
        params: { country, program },
        timeout: 8000,
      });
      setData(res);
    } catch {
      // Fall back to static content so the user always sees something useful
      setData({ country, program, ...FALLBACK });
    } finally {
      setLoading(false);
      setStep(2);
    }
  };

  const handleReset = () => { setStep(1); setData(null); };

  return (
    <section className="py-14 bg-gradient-to-b from-white to-[#f5f7ff]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Section header */}
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-semibold tracking-widest text-[#011CB5] uppercase mb-2">
            AI Application Toolkit
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Build Your Application
          </h2>
          <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto">
            Pick your destination country and programme — get tailored SOP tips, a document checklist, and a month-by-month timeline instantly.
          </p>
        </div>

        {/* Step 1 — Country + Program selectors */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 max-w-xl mx-auto">
            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-6">
              <StepBadge n={1} active />
              <span className="text-sm font-medium text-gray-700">Choose your destination</span>
            </div>

            <div className="space-y-4">
              <SelectField
                label="Country"
                icon={Globe}
                value={country}
                onChange={setCountry}
                options={COUNTRIES}
                placeholder="Select country…"
              />
              <SelectField
                label="Programme"
                icon={GraduationCap}
                value={program}
                onChange={setProgram}
                options={PROGRAMS}
                placeholder="Select programme…"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canProceed || loading}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-[#011CB5] hover:bg-[#0119a0]
                         disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold
                         rounded-xl py-3 text-sm transition-colors"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Generating…</>
                : <><span>Generate My Application Plan</span><ChevronRight size={16} /></>
              }
            </button>
          </div>
        )}

        {/* Step 2 — Results */}
        {step === 2 && data && (
          <div>
            {/* Result header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Your plan for</p>
                <h3 className="text-lg font-bold text-gray-900">
                  {data.program} · {data.country}
                </h3>
              </div>
              <button
                onClick={handleReset}
                className="text-sm text-[#011CB5] hover:underline font-medium"
              >
                ← Change
              </button>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <SOPCard tips={data.sop_tips} />
              <ChecklistCard items={data.doc_checklist} country={data.country} program={data.program} />
              <div className="md:col-span-2">
                <TimelineCard timeline={data.timeline} />
              </div>
            </div>

            {/* Reset CTA */}
            <div className="mt-8 text-center">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#011CB5] transition-colors"
              >
                <ChevronRight size={14} className="rotate-180" /> Start over with a different country or programme
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, CheckCircle2, GraduationCap, Briefcase, Globe,
  FileText, DollarSign, Users, BookOpen, Phone, ChevronRight, AlertCircle,
  Building2, Banknote, CreditCard, UserPlus, Sparkles, ClipboardList,
  ExternalLink, Check, Info,
} from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

// ── Data ─────────────────────────────────────────────────────────────────────

const VISA_CATEGORIES = [
  {
    id: 'student',
    label: 'Student Visa',
    icon: '🎓',
    desc: 'F-1 USA, UK Tier 4, Canada Study Permit, Australia 500, Germany',
    color: 'blue',
  },
  {
    id: 'work',
    label: 'Work Visa',
    icon: '💼',
    desc: 'H-1B, L-1, O-1, TN, Germany Work, UK Skilled Worker',
    color: 'violet',
  },
  {
    id: 'pr',
    label: 'Permanent Residency',
    icon: '🏡',
    desc: 'Canada Express Entry, Australia PR, UK ILR, EB-1/EB-2 USA',
    color: 'emerald',
  },
  {
    id: 'tourist',
    label: 'Tourist / Visitor',
    icon: '✈️',
    desc: 'B-1/B-2 USA, Schengen, UK Visitor, Canada ETA',
    color: 'amber',
  },
];

const STUDENT_VISAS = [
  { id: 'f1', label: 'F-1 USA', flag: '🇺🇸', hint: 'Most popular for Indian students' },
  { id: 'uk', label: 'UK Student Visa', flag: '🇬🇧', hint: 'Tier 4 / CAS required' },
  { id: 'ca', label: 'Canada Study Permit', flag: '🇨🇦', hint: 'DLI-approved institutions' },
  { id: 'au', label: 'Australia Subclass 500', flag: '🇦🇺', hint: 'CoE required' },
  { id: 'de', label: 'Germany Student Visa', flag: '🇩🇪', hint: 'Blocked account required' },
  { id: 'other', label: 'Other Country', flag: '🌍', hint: 'Europe, Asia & more' },
];

const WORK_VISAS = [
  { id: 'h1b', label: 'H-1B USA', flag: '🇺🇸', hint: 'Employer-sponsored specialty' },
  { id: 'l1', label: 'L-1 USA', flag: '🇺🇸', hint: 'Intra-company transfer' },
  { id: 'o1', label: 'O-1 USA', flag: '🇺🇸', hint: 'Extraordinary ability' },
  { id: 'uk_sw', label: 'UK Skilled Worker', flag: '🇬🇧', hint: 'Points-based route' },
  { id: 'de_work', label: 'Germany Work Visa', flag: '🇩🇪', hint: 'Qualified professionals' },
  { id: 'ca_work', label: 'Canada Work Permit', flag: '🇨🇦', hint: 'LMIA or CUSMA' },
];

const PR_PATHWAYS = [
  { id: 'ca_ee', label: 'Canada Express Entry', flag: '🇨🇦', hint: 'CRS-based points system' },
  { id: 'au_pr', label: 'Australia PR (189/190)', flag: '🇦🇺', hint: 'Skilled Independent' },
  { id: 'us_eb', label: 'USA EB-1 / EB-2', flag: '🇺🇸', hint: 'Employment-based green card' },
  { id: 'uk_ilr', label: 'UK Indefinite Leave', flag: '🇬🇧', hint: 'After 5 yrs on work/spouse' },
];

const TOURIST_VISAS = [
  { id: 'us_b2', label: 'USA B-1/B-2', flag: '🇺🇸', hint: 'Business & tourism' },
  { id: 'schengen', label: 'Schengen (Europe)', flag: '🇪🇺', hint: '26 EU countries' },
  { id: 'uk_visit', label: 'UK Visitor Visa', flag: '🇬🇧', hint: 'Up to 6 months' },
  { id: 'ca_eta', label: 'Canada ETA / TRV', flag: '🇨🇦', hint: 'eTA for air travel' },
];

// Financial documents required for every visa type
const FINANCIAL_DOCS_UNIVERSAL = [
  { id: 'bank_6m', label: 'Bank Statements (last 6 months)', mandatory: true, tip: 'All bank accounts, stamped & signed by bank' },
  { id: 'itr3', label: 'Income Tax Returns (last 3 years)', mandatory: true, tip: 'Form ITR-V acknowledgement from Income Tax portal' },
  { id: 'form16', label: 'Form 16 / Salary Certificate', mandatory: true, tip: 'Issued by employer for salaried individuals' },
  { id: 'ca_cert', label: 'CA-Certified Financial Statement', mandatory: true, tip: 'Certified by a chartered accountant — we connect you with verified CAs' },
  { id: 'property', label: 'Property / Asset Documents', mandatory: false, tip: 'Land deeds, FDs, shares — strengthens ties to home country' },
  { id: 'sponsor', label: 'Sponsor Affidavit & Financials', mandatory: false, tip: 'If funding is from parents/relatives, their documents are needed too' },
];

const EXTRA_FINANCIAL = {
  f1: [
    { id: 'i20_fin', label: 'I-20 Financial Statement (from university)', mandatory: true, tip: 'University confirms estimated cost; your funds must match' },
    { id: 'sevis', label: 'SEVIS Fee Payment Receipt (I-901)', mandatory: true, tip: '$350 for F-1. Pay at fmjfee.com' },
    { id: 'edu_loan', label: 'Education Loan Sanction Letter (if applicable)', mandatory: false, tip: 'HDFC Credila, Prodigy Finance, Avanse — we partner with them' },
    { id: 'forex_stmt', label: 'Forex / Remittance Statement', mandatory: false, tip: 'If transferring funds abroad via BookMyForex or HDFC Forex' },
  ],
  uk: [
    { id: 'cas', label: 'Confirmation of Acceptance (CAS)', mandatory: true, tip: 'Issued by UK university — needed before visa application' },
    { id: 'uk_maint', label: 'Maintenance Funds (£1,334/month London)', mandatory: true, tip: 'Funds must be held for 28 consecutive days' },
    { id: 'edu_loan', label: 'Education Loan Sanction Letter', mandatory: false, tip: 'Major nationalised banks accepted by UKVI' },
  ],
  ca: [
    { id: 'gic', label: 'GIC (Guaranteed Investment Certificate)', mandatory: true, tip: 'CAD 10,200 minimum via CIBC, SBI or ICICI Canada' },
    { id: 'enrolment', label: 'Proof of Enrolment / Acceptance Letter', mandatory: true, tip: 'From a Designated Learning Institution (DLI)' },
  ],
  au: [
    { id: 'coe', label: 'Confirmation of Enrolment (CoE)', mandatory: true, tip: 'Issued by Australian university after payment of first installment' },
    { id: 'oshc', label: 'OSHC Health Insurance', mandatory: true, tip: 'Overseas Student Health Cover — mandatory for visa grant' },
  ],
  de: [
    { id: 'sperrkonto', label: 'Blocked Account (Sperrkonto) — €11,208', mandatory: true, tip: 'Open via Coracle, Expatrio or Deutsche Bank before applying' },
    { id: 'uni_admit', label: 'University Admission Letter', mandatory: true, tip: 'From a state-recognised German university (Zulassungsbescheid)' },
  ],
  h1b: [
    { id: 'lca', label: 'Labor Condition Application (LCA)', mandatory: true, tip: 'Filed by employer with DOL' },
    { id: 'pay_stubs', label: 'Pay Stubs (last 3 months)', mandatory: true, tip: 'W-2 or Indian payslips for offshore applicants' },
    { id: 'employer_tax', label: "Employer's Tax Returns / Financial Health", mandatory: true, tip: 'Demonstrates employer ability to pay the prevailing wage' },
  ],
  l1: [
    { id: 'org_chart', label: 'Organizational Chart (India & US entity)', mandatory: true, tip: 'Shows qualifying relationship between entities' },
    { id: 'corp_docs', label: 'Corporate Documents (both entities)', mandatory: true, tip: 'Incorporation certificates, share structure, ownership proof' },
  ],
  ca_ee: [
    { id: 'lmia_or_jo', label: 'Job Offer (if LMIA-backed) or Provincial Nomination', mandatory: false, tip: 'Boosts CRS by 200 points; not always required' },
    { id: 'language_cert', label: 'IELTS / CELPIP / TEF Score', mandatory: true, tip: 'Language is the #1 CRS factor — minimum CLB 7 for FSW' },
  ],
  us_b2: [
    { id: 'ties', label: 'Proof of Ties to India (job letter, property deed)', mandatory: true, tip: 'Overcomes 214(b) — strongest factor in tourist visa approval' },
    { id: 'itinerary', label: 'Travel Itinerary & Hotel Bookings', mandatory: false, tip: 'Not required but recommended; confirms genuine tourism intent' },
  ],
};

const PARTNERS = {
  ca_cert: {
    label: 'CA / Tax Consultant',
    partners: ['AR Axiss (your network)', 'AVKS & Associates', 'ClearTax for Chartered Accountants'],
    action: 'Connect with a CA',
    icon: <Building2 size={16} />,
    color: 'blue',
  },
  edu_loan: {
    label: 'Education Loan',
    partners: ['HDFC Credila', 'Prodigy Finance', 'Avanse Financial Services'],
    action: 'Check eligibility',
    icon: <Banknote size={16} />,
    color: 'emerald',
  },
  forex: {
    label: 'Forex & Remittance',
    partners: ['BookMyForex', 'Thomas Cook India', 'HDFC Forex'],
    action: 'Get best rates',
    icon: <CreditCard size={16} />,
    color: 'violet',
  },
  gre_prep: {
    label: 'GRE / GMAT Coaching',
    partners: ['T.I.M.E.', 'IMS Learning', 'Jamboree Education'],
    action: 'Find coaching centers',
    icon: <BookOpen size={16} />,
    color: 'amber',
  },
  ielts_prep: {
    label: 'IELTS / TOEFL / PTE Coaching',
    partners: ['British Council', 'IDP India', 'T.I.M.E.'],
    action: 'Find coaching centers',
    icon: <BookOpen size={16} />,
    color: 'amber',
  },
  immigration_law: {
    label: 'Immigration Law Firm',
    partners: ['AILA-member firms', 'ICCRC-registered consultants'],
    action: 'Get legal counsel',
    icon: <Globe size={16} />,
    color: 'blue',
  },
  gic: {
    label: 'GIC Providers',
    partners: ['CIBC Student GIC', 'SBI Canada', 'ICICI Bank Canada'],
    action: 'Open GIC account',
    icon: <Banknote size={16} />,
    color: 'emerald',
  },
  blocked_acc: {
    label: 'German Blocked Account',
    partners: ['Coracle', 'Expatrio', 'Deutsche Bank'],
    action: 'Open Sperrkonto',
    icon: <Banknote size={16} />,
    color: 'emerald',
  },
};

// Which partners are relevant per doc id
const DOC_PARTNER_MAP = {
  ca_cert: 'ca_cert',
  edu_loan: 'edu_loan',
  forex_stmt: 'forex',
  gic: 'gic',
  sperrkonto: 'blocked_acc',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function selCls(active) {
  return `cursor-pointer rounded-xl border p-4 transition-colors text-left ${
    active
      ? 'border-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))]'
      : 'border-[hsl(var(--border))] bg-white hover:border-[hsl(var(--blue-200))]'
  }`;
}

function Badge({ text, color = 'blue' }) {
  const map = {
    blue: 'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] border-[hsl(var(--blue-200))]',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${map[color]}`}>
      {text}
    </span>
  );
}

function PartnerCard({ partnerKey }) {
  const p = PARTNERS[partnerKey];
  if (!p) return null;
  const colorMap = {
    blue: 'border-[hsl(var(--blue-200))] bg-[hsl(var(--blue-50))]',
    emerald: 'border-emerald-200 bg-emerald-50',
    amber: 'border-amber-200 bg-amber-50',
    violet: 'border-violet-200 bg-violet-50',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[p.color]} mt-2`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[hsl(var(--blue-700))]">{p.icon}</span>
        <span className="text-[12px] font-bold text-[hsl(var(--blue-900))]">{p.label}</span>
        <Badge text="WeHive Partner" color={p.color} />
      </div>
      <p className="text-[12px] text-muted-foreground mb-2">
        {p.partners.join(' · ')}
      </p>
      <button className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-800))]">
        {p.action} <ExternalLink size={12} />
      </button>
    </div>
  );
}

// ── Step components ────────────────────────────────────────────────────────────

function StepVisaCategory({ value, onChange }) {
  return (
    <div className="space-y-3">
      <h2 className="text-[20px] font-bold text-[hsl(var(--blue-900))]">
        What kind of visa are you applying for?
      </h2>
      <p className="text-[14px] text-muted-foreground">We'll create a personalised checklist and connect you with the right partners.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {VISA_CATEGORIES.map((c) => (
          <button key={c.id} className={selCls(value === c.id)} onClick={() => onChange(c.id)}>
            <span className="text-[28px]">{c.icon}</span>
            <div className="mt-2 text-[15px] font-bold text-[hsl(var(--blue-900))]">{c.label}</div>
            <div className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{c.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepSubCategory({ category, value, onChange }) {
  const options =
    category === 'student' ? STUDENT_VISAS
    : category === 'work' ? WORK_VISAS
    : category === 'pr' ? PR_PATHWAYS
    : TOURIST_VISAS;

  const label =
    category === 'student' ? 'Which student visa are you targeting?'
    : category === 'work' ? 'Which work visa are you targeting?'
    : category === 'pr' ? 'Which PR pathway interests you?'
    : 'Which visitor visa are you applying for?';

  return (
    <div className="space-y-3">
      <h2 className="text-[20px] font-bold text-[hsl(var(--blue-900))]">{label}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {options.map((v) => (
          <button key={v.id} className={selCls(value === v.id)} onClick={() => onChange(v.id)}>
            <span className="text-[24px]">{v.flag}</span>
            <div className="mt-1 text-[14px] font-bold text-[hsl(var(--blue-900))]">{v.label}</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">{v.hint}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepProfile({ category, subVisa, profile, onChange }) {
  const isF1 = subVisa === 'f1';
  const isStudent = category === 'student';
  const isWork = category === 'work';
  const isPR = category === 'pr';

  return (
    <div className="space-y-6">
      <h2 className="text-[20px] font-bold text-[hsl(var(--blue-900))]">Tell us about yourself</h2>
      <p className="text-[14px] text-muted-foreground -mt-3">
        This helps us identify gaps and recommend the right next steps.
      </p>

      {/* Language tests */}
      {(isStudent || isPR) && (
        <fieldset className="space-y-2">
          <legend className="text-[13px] font-bold text-[hsl(var(--blue-900))] mb-1">
            Do you have an English proficiency score?
          </legend>
          <div className="flex flex-wrap gap-2">
            {['Yes — IELTS', 'Yes — TOEFL', 'Yes — PTE', 'No — planning soon', 'Not required'].map((opt) => (
              <label key={opt}
                className={`cursor-pointer rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                  profile.language === opt
                    ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))] text-white'
                    : 'border-[hsl(var(--border))] text-muted-foreground hover:border-[hsl(var(--blue-200))]'
                }`}>
                <input type="radio" className="sr-only" checked={profile.language === opt}
                  onChange={() => onChange('language', opt)} />
                {opt}
              </label>
            ))}
          </div>
          {profile.language?.startsWith('No') && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mt-2">
              <div className="flex gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-bold text-amber-800">IELTS / TOEFL required for most visas</p>
                  <p className="text-[12px] text-amber-700 mt-0.5">
                    F-1 needs TOEFL 80+; Canada needs IELTS 6.5; UK needs IELTS 6.0. We partner with British Council, IDP, and T.I.M.E. to help you prepare.
                  </p>
                  <PartnerCard partnerKey="ielts_prep" />
                </div>
              </div>
            </div>
          )}
        </fieldset>
      )}

      {/* GRE / GMAT — only for F1 grad programs */}
      {isF1 && (
        <fieldset className="space-y-2">
          <legend className="text-[13px] font-bold text-[hsl(var(--blue-900))] mb-1">
            Do you have GRE / GMAT scores? <span className="text-[11px] font-normal text-muted-foreground">(for Masters/PhD)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {['Yes — GRE', 'Yes — GMAT', 'Not required (undergrad)', 'No — planning to give', 'Waiver requested'].map((opt) => (
              <label key={opt}
                className={`cursor-pointer rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                  profile.gre === opt
                    ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))] text-white'
                    : 'border-[hsl(var(--border))] text-muted-foreground hover:border-[hsl(var(--blue-200))]'
                }`}>
                <input type="radio" className="sr-only" checked={profile.gre === opt}
                  onChange={() => onChange('gre', opt)} />
                {opt}
              </label>
            ))}
          </div>

          {profile.gre === 'No — planning to give' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mt-2">
              <div className="flex gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-bold text-amber-800">GRE needed for most US Master's programs</p>
                  <p className="text-[12px] text-amber-700 mt-0.5">
                    Target 310+ for mid-tier, 320+ for top-20 US universities. Average prep time: 8–12 weeks. We partner with T.I.M.E., IMS, and Jamboree for structured coaching.
                  </p>
                  <PartnerCard partnerKey="gre_prep" />
                </div>
              </div>
            </div>
          )}

          {(profile.gre === 'Yes — GRE' || profile.gre === 'Yes — GMAT') && (
            <div className="mt-2">
              <label className="text-[12px] font-bold text-[hsl(var(--blue-900))]">
                Your score (GRE: 260–340 · GMAT: 200–800)
              </label>
              <input
                type="number"
                min={260} max={340}
                placeholder="e.g. 315"
                value={profile.gre_score || ''}
                onChange={(e) => onChange('gre_score', e.target.value)}
                className="mt-1 block w-full max-w-xs rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-[14px] outline-none focus:border-[hsl(var(--blue-700))]"
              />
            </div>
          )}
        </fieldset>
      )}

      {/* Degree */}
      {isStudent && (
        <fieldset className="space-y-2">
          <legend className="text-[13px] font-bold text-[hsl(var(--blue-900))] mb-1">Target degree level</legend>
          <div className="flex flex-wrap gap-2">
            {["Bachelor's", "Master's", 'PhD / Doctoral', 'Diploma / Certificate', 'Language Program'].map((opt) => (
              <label key={opt}
                className={`cursor-pointer rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                  profile.degree === opt
                    ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))] text-white'
                    : 'border-[hsl(var(--border))] text-muted-foreground hover:border-[hsl(var(--blue-200))]'
                }`}>
                <input type="radio" className="sr-only" checked={profile.degree === opt}
                  onChange={() => onChange('degree', opt)} />
                {opt}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Work visa: employment status */}
      {isWork && (
        <fieldset className="space-y-2">
          <legend className="text-[13px] font-bold text-[hsl(var(--blue-900))] mb-1">Current employment status</legend>
          <div className="flex flex-wrap gap-2">
            {['Has employer sponsoring', 'Searching for sponsor', 'Self-employed / own company', 'On OPT/CPT (USA)'].map((opt) => (
              <label key={opt}
                className={`cursor-pointer rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                  profile.employment === opt
                    ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))] text-white'
                    : 'border-[hsl(var(--border))] text-muted-foreground hover:border-[hsl(var(--blue-200))]'
                }`}>
                <input type="radio" className="sr-only" checked={profile.employment === opt}
                  onChange={() => onChange('employment', opt)} />
                {opt}
              </label>
            ))}
          </div>
          {profile.employment === 'Searching for sponsor' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mt-2">
              <div className="flex gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-bold text-amber-800">Employer sponsorship is required for H-1B / L-1</p>
                  <p className="text-[12px] text-amber-700 mt-0.5">
                    We work with staffing agencies and placement partners to connect eligible candidates with H-1B sponsors.
                  </p>
                  <PartnerCard partnerKey="immigration_law" />
                </div>
              </div>
            </div>
          )}
        </fieldset>
      )}

      {/* PR: work experience */}
      {isPR && (
        <fieldset className="space-y-2">
          <legend className="text-[13px] font-bold text-[hsl(var(--blue-900))] mb-1">Years of skilled work experience</legend>
          <div className="flex flex-wrap gap-2">
            {['Less than 1 year', '1–2 years', '3–5 years', '5+ years'].map((opt) => (
              <label key={opt}
                className={`cursor-pointer rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                  profile.experience === opt
                    ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))] text-white'
                    : 'border-[hsl(var(--border))] text-muted-foreground hover:border-[hsl(var(--blue-200))]'
                }`}>
                <input type="radio" className="sr-only" checked={profile.experience === opt}
                  onChange={() => onChange('experience', opt)} />
                {opt}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Current financial situation */}
      <fieldset className="space-y-2">
        <legend className="text-[13px] font-bold text-[hsl(var(--blue-900))] mb-1">
          How are you funding this?
        </legend>
        <div className="flex flex-wrap gap-2">
          {['Self / family savings', 'Education loan', 'Scholarship', 'Employer sponsored', 'Mixed sources'].map((opt) => (
            <label key={opt}
              className={`cursor-pointer rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                profile.funding === opt
                  ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))] text-white'
                  : 'border-[hsl(var(--border))] text-muted-foreground hover:border-[hsl(var(--blue-200))]'
              }`}>
              <input type="radio" className="sr-only" checked={profile.funding === opt}
                onChange={() => onChange('funding', opt)} />
              {opt}
            </label>
          ))}
        </div>
        {profile.funding === 'Education loan' && (
          <PartnerCard partnerKey="edu_loan" />
        )}
      </fieldset>
    </div>
  );
}

function DocRow({ doc, checked, onToggle, partnerKey }) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-white p-4 space-y-1.5">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggle(doc.id)}
          className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            checked
              ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))]'
              : 'border-[hsl(var(--border))] bg-white'
          }`}
          aria-label={`Mark ${doc.label} as ${checked ? 'not ready' : 'ready'}`}
        >
          {checked && <Check size={11} className="text-white" />}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-[hsl(var(--blue-900))]">{doc.label}</span>
            {doc.mandatory
              ? <Badge text="Mandatory" color="red" />
              : <Badge text="Recommended" color="amber" />}
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{doc.tip}</p>
        </div>
      </div>
      {partnerKey && <PartnerCard partnerKey={partnerKey} />}
    </div>
  );
}

function StepFinancialDocs({ subVisa, checkedDocs, onToggle }) {
  const extraDocs = EXTRA_FINANCIAL[subVisa] || [];
  const allDocs = [...FINANCIAL_DOCS_UNIVERSAL, ...extraDocs];
  const mandatoryCount = allDocs.filter((d) => d.mandatory).length;
  const checkedMandatory = allDocs.filter((d) => d.mandatory && checkedDocs.has(d.id)).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[20px] font-bold text-[hsl(var(--blue-900))]">Financial Documents</h2>
        <p className="text-[14px] text-muted-foreground mt-1">
          Financial proof is <strong>mandatory for every visa type, every country, every applicant age</strong>.
          Check off what you have — we'll connect you with partners for the rest.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-200))] p-3">
        <DollarSign size={18} className="text-[hsl(var(--blue-700))] shrink-0" />
        <p className="text-[13px] text-[hsl(var(--blue-900))]">
          <strong>{checkedMandatory}/{mandatoryCount}</strong> mandatory documents marked ready
        </p>
      </div>

      <div className="rounded-xl border border-[hsl(var(--blue-200))] bg-[hsl(var(--blue-50))] p-4">
        <p className="text-[12px] font-bold text-[hsl(var(--blue-900))] mb-2 uppercase tracking-wide">Universal — Required for All Visa Types</p>
        <div className="space-y-3">
          {FINANCIAL_DOCS_UNIVERSAL.map((doc) => (
            <DocRow key={doc.id} doc={doc} checked={checkedDocs.has(doc.id)}
              onToggle={onToggle} partnerKey={DOC_PARTNER_MAP[doc.id]} />
          ))}
        </div>
      </div>

      {extraDocs.length > 0 && (
        <div className="rounded-xl border border-[hsl(var(--border))] p-4">
          <p className="text-[12px] font-bold text-[hsl(var(--blue-900))] mb-2 uppercase tracking-wide">
            Additional — Specific to Your Visa Type
          </p>
          <div className="space-y-3">
            {extraDocs.map((doc) => (
              <DocRow key={doc.id} doc={doc} checked={checkedDocs.has(doc.id)}
                onToggle={onToggle} partnerKey={DOC_PARTNER_MAP[doc.id]} />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[hsl(var(--blue-200))] bg-[hsl(var(--blue-50))] p-4">
        <div className="flex gap-2">
          <Info size={16} className="text-[hsl(var(--blue-700))] shrink-0 mt-0.5" />
          <div>
            <p className="text-[12px] font-bold text-[hsl(var(--blue-900))]">WeHive Financial Document Audit</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Our partner CAs and auditors review your financial documents before submission.
              We catch issues that lead to rejections — missing attestations, insufficient funds, or inconsistent statements.
            </p>
            <PartnerCard partnerKey="ca_cert" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepApplicantDetails({ applicant, onChange }) {
  return (
    <div className="space-y-5">
      <h2 className="text-[20px] font-bold text-[hsl(var(--blue-900))]">Add Applicant Details</h2>
      <p className="text-[14px] text-muted-foreground -mt-3">
        We'll create your applicant profile and assign a case manager to guide you through each stage.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { key: 'name', label: 'Full Name', placeholder: 'As on passport' },
          { key: 'email', label: 'Email Address', placeholder: 'you@example.com', type: 'email' },
          { key: 'phone', label: 'WhatsApp / Phone', placeholder: '+91 9XXXXXXXXX', type: 'tel' },
          { key: 'dob', label: 'Date of Birth', placeholder: '', type: 'date' },
        ].map(({ key, label, placeholder, type = 'text' }) => (
          <div key={key}>
            <label className="block text-[12px] font-bold text-[hsl(var(--blue-900))] mb-1">{label}</label>
            <input
              type={type}
              value={applicant[key] || ''}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder={placeholder}
              className="block w-full rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-[14px] outline-none focus:border-[hsl(var(--blue-700))] bg-white"
            />
          </div>
        ))}
        <div>
          <label className="block text-[12px] font-bold text-[hsl(var(--blue-900))] mb-1">Passport Number</label>
          <input
            type="text"
            value={applicant.passport || ''}
            onChange={(e) => onChange('passport', e.target.value)}
            placeholder="A1234567"
            className="block w-full rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-[14px] outline-none focus:border-[hsl(var(--blue-700))] bg-white"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-[hsl(var(--blue-900))] mb-1">Passport Expiry</label>
          <input
            type="date"
            value={applicant.passport_expiry || ''}
            onChange={(e) => onChange('passport_expiry', e.target.value)}
            className="block w-full rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-[14px] outline-none focus:border-[hsl(var(--blue-700))] bg-white"
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-[13px] font-bold text-[hsl(var(--blue-900))] mb-1">Preferred contact method</legend>
        <div className="flex flex-wrap gap-2">
          {['WhatsApp', 'Email', 'Phone call', 'In-person (Hyderabad)'].map((opt) => (
            <label key={opt}
              className={`cursor-pointer rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                applicant.contact_pref === opt
                  ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))] text-white'
                  : 'border-[hsl(var(--border))] text-muted-foreground hover:border-[hsl(var(--blue-200))]'
              }`}>
              <input type="radio" className="sr-only" checked={applicant.contact_pref === opt}
                onChange={() => onChange('contact_pref', opt)} />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function StepSummary({ category, subVisa, profile, applicant, checkedDocs, onSubmit, loading }) {
  const allDocs = [...FINANCIAL_DOCS_UNIVERSAL, ...(EXTRA_FINANCIAL[subVisa] || [])];
  const mandatoryMissing = allDocs.filter((d) => d.mandatory && !checkedDocs.has(d.id));

  const subLabel =
    [...STUDENT_VISAS, ...WORK_VISAS, ...PR_PATHWAYS, ...TOURIST_VISAS].find((v) => v.id === subVisa)?.label || subVisa;

  const catLabel = VISA_CATEGORIES.find((c) => c.id === category)?.label || category;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ClipboardList size={22} className="text-[hsl(var(--blue-700))]" />
        <h2 className="text-[20px] font-bold text-[hsl(var(--blue-900))]">Your Application Summary</h2>
      </div>

      <div className="rounded-xl border border-[hsl(var(--border))] bg-white divide-y divide-[hsl(var(--border))]">
        <div className="p-4 flex gap-3 items-center">
          <Globe size={16} className="text-[hsl(var(--blue-700))] shrink-0" />
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Visa Type</p>
            <p className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{catLabel} → {subLabel}</p>
          </div>
        </div>
        <div className="p-4 flex gap-3 items-center">
          <Users size={16} className="text-[hsl(var(--blue-700))] shrink-0" />
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Applicant</p>
            <p className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{applicant.name || '—'}</p>
            <p className="text-[12px] text-muted-foreground">{applicant.email}</p>
          </div>
        </div>
        <div className="p-4 flex gap-3">
          <FileText size={16} className="text-[hsl(var(--blue-700))] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Profile Highlights</p>
            {profile.degree && <p className="text-[13px] text-[hsl(var(--blue-900))]">Degree: {profile.degree}</p>}
            {profile.language && <p className="text-[13px] text-[hsl(var(--blue-900))]">Language: {profile.language}</p>}
            {profile.gre && <p className="text-[13px] text-[hsl(var(--blue-900))]">GRE/GMAT: {profile.gre}{profile.gre_score ? ` — ${profile.gre_score}` : ''}</p>}
            {profile.funding && <p className="text-[13px] text-[hsl(var(--blue-900))]">Funding: {profile.funding}</p>}
            {profile.employment && <p className="text-[13px] text-[hsl(var(--blue-900))]">Employment: {profile.employment}</p>}
          </div>
        </div>
        <div className="p-4 flex gap-3">
          <DollarSign size={16} className="text-[hsl(var(--blue-700))] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Financial Documents</p>
            <p className="text-[13px] text-[hsl(var(--blue-900))]">
              {checkedDocs.size} of {allDocs.length} documents ready
            </p>
            {mandatoryMissing.length > 0 && (
              <div className="mt-1.5 space-y-1">
                <p className="text-[11px] font-bold text-red-600">Still needed (mandatory):</p>
                {mandatoryMissing.map((d) => (
                  <p key={d.id} className="text-[11px] text-red-600">• {d.label}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {mandatoryMissing.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[13px] text-amber-800">
            <strong>{mandatoryMissing.length} mandatory document(s)</strong> not yet ready. We'll connect you with our partners to help you collect them quickly.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-[hsl(var(--blue-200))] bg-[hsl(var(--blue-50))] p-4 space-y-2">
        <p className="text-[13px] font-bold text-[hsl(var(--blue-900))]">What happens next?</p>
        {[
          'Your case will be assigned to a WeHive consultant within 24 hours.',
          'You\'ll receive a personalised checklist with exact document templates.',
          'Our partners (CAs, forex providers, coaching centers) will be looped in as needed.',
          'Track your entire application in real-time from your Account dashboard.',
        ].map((step, i) => (
          <div key={i} className="flex gap-2">
            <CheckCircle2 size={14} className="text-[hsl(var(--blue-700))] shrink-0 mt-0.5" />
            <p className="text-[12px] text-[hsl(var(--blue-900))]">{step}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onSubmit}
        disabled={loading || !applicant.name || !applicant.email}
        className="w-full btn-primary flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-bold disabled:opacity-50"
      >
        {loading ? (
          <span className="animate-spin w-4 h-4 rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <>
            <UserPlus size={18} /> Create My Applicant Profile
          </>
        )}
      </button>
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────

function ProgressBar({ step, total }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
            i < step ? 'bg-[hsl(var(--blue-700))]' : 'bg-[hsl(var(--blue-200))]'
          }`}
        />
      ))}
      <span className="text-[12px] text-muted-foreground shrink-0">{step}/{total}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;

export default function ApplicantFlow() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');    // student | work | pr | tourist
  const [subVisa, setSubVisa] = useState('');       // f1 | h1b | ca_ee | …
  const [profile, setProfile] = useState({});       // language, gre, degree, funding, …
  const [checkedDocs, setCheckedDocs] = useState(new Set());
  const [applicant, setApplicant] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateProfile = (key, val) => setProfile((p) => ({ ...p, [key]: val }));
  const updateApplicant = (key, val) => setApplicant((a) => ({ ...a, [key]: val }));
  const toggleDoc = (id) =>
    setCheckedDocs((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const canNext = () => {
    if (step === 1) return !!category;
    if (step === 2) return !!subVisa;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    const allDocs = [...FINANCIAL_DOCS_UNIVERSAL, ...(EXTRA_FINANCIAL[subVisa] || [])];
    const missingDocs = allDocs.filter((d) => d.mandatory && !checkedDocs.has(d.id)).map((d) => d.label);

    const subLabel = [...STUDENT_VISAS, ...WORK_VISAS, ...PR_PATHWAYS, ...TOURIST_VISAS].find((v) => v.id === subVisa)?.label || subVisa;

    const message = [
      `Applicant Flow Submission`,
      `Category: ${VISA_CATEGORIES.find((c) => c.id === category)?.label} → ${subLabel}`,
      `Degree: ${profile.degree || '—'}`,
      `Language: ${profile.language || '—'}`,
      `GRE/GMAT: ${profile.gre || '—'}${profile.gre_score ? ` (${profile.gre_score})` : ''}`,
      `Funding: ${profile.funding || '—'}`,
      `Employment: ${profile.employment || '—'}`,
      `Documents ready: ${checkedDocs.size}/${allDocs.length}`,
      missingDocs.length ? `Missing mandatory: ${missingDocs.join(', ')}` : 'All mandatory docs ready',
      `Contact pref: ${applicant.contact_pref || '—'}`,
      `Phone: ${applicant.phone || '—'}`,
    ].join('\n');

    try {
      await axios.post(`${API}/enquiries`, {
        name: applicant.name,
        surname: '',
        email: applicant.email,
        message,
      });
      setSubmitted(true);
    } catch {
      toast({ title: 'Could not submit', description: 'Please try again or contact us directly.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[hsl(var(--soft-bg))] flex items-center justify-center px-4 py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white rounded-2xl border border-[hsl(var(--border))] p-8 text-center shadow-sm"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <h2 className="text-[22px] font-bold text-[hsl(var(--blue-900))] mb-2">Profile Created!</h2>
            <p className="text-[14px] text-muted-foreground mb-6">
              A WeHive consultant will contact you within 24 hours at <strong>{applicant.email}</strong> to begin your journey.
            </p>
            <div className="space-y-2 text-left mb-6">
              {[
                'Personalised checklist sent to your email',
                'Partner introductions (CA, forex, coaching) arranged',
                'Track progress from your Account dashboard',
              ].map((item, i) => (
                <div key={i} className="flex gap-2">
                  <Sparkles size={14} className="text-[hsl(var(--blue-700))] shrink-0 mt-0.5" />
                  <p className="text-[13px] text-[hsl(var(--blue-900))]">{item}</p>
                </div>
              ))}
            </div>
            <a href="/account" className="btn-primary w-full py-3 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2">
              Go to My Account <ChevronRight size={16} />
            </a>
          </motion.div>
        </main>
        <Footer />
      </>
    );
  }

  const stepTitles = ['Visa Type', 'Sub-category', 'Your Profile', 'Financial Docs', 'Confirm & Submit'];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[hsl(var(--soft-bg))] px-4 py-10">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--blue-200))] bg-white px-4 py-1.5 text-[12px] font-bold text-[hsl(var(--blue-700))] mb-3">
              <Sparkles size={13} /> Guided Applicant Flow
            </div>
            <h1 className="text-[28px] font-bold text-[hsl(var(--blue-900))]">
              Start Your Visa Journey
            </h1>
            <p className="text-[14px] text-muted-foreground mt-2 max-w-lg mx-auto">
              Answer a few questions and we'll build your personalised roadmap — documents, partners, and a dedicated consultant included.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-bold text-[hsl(var(--blue-700))] uppercase tracking-wide">
              Step {step}: {stepTitles[step - 1]}
            </p>
          </div>
          <ProgressBar step={step} total={TOTAL_STEPS} />

          {/* Card */}
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] shadow-sm p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 1 && (
                  <StepVisaCategory value={category} onChange={(v) => { setCategory(v); setSubVisa(''); }} />
                )}
                {step === 2 && (
                  <StepSubCategory category={category} value={subVisa} onChange={setSubVisa} />
                )}
                {step === 3 && (
                  <StepProfile category={category} subVisa={subVisa} profile={profile} onChange={updateProfile} />
                )}
                {step === 4 && (
                  <StepFinancialDocs subVisa={subVisa} checkedDocs={checkedDocs} onToggle={toggleDoc} />
                )}
                {step === 5 && (
                  <StepSummary
                    category={category} subVisa={subVisa} profile={profile}
                    applicant={applicant} checkedDocs={checkedDocs}
                    onSubmit={handleSubmit} loading={loading}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Nav buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[hsl(var(--border))]">
              <button
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 1}
                className="flex items-center gap-2 text-[14px] font-semibold text-muted-foreground hover:text-[hsl(var(--blue-900))] disabled:opacity-30"
              >
                <ArrowLeft size={16} /> Back
              </button>

              {step < TOTAL_STEPS ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canNext()}
                  className="flex items-center gap-2 btn-primary px-6 py-2.5 rounded-xl text-[14px] font-bold disabled:opacity-40"
                >
                  Continue <ArrowRight size={16} />
                </button>
              ) : null /* submit is in StepSummary */}
            </div>
          </div>

          {/* Step 4 extra: contact-us-for-help shortcut */}
          {step === 4 && (
            <div className="mt-4 text-center">
              <p className="text-[12px] text-muted-foreground">
                Need help gathering documents?{' '}
                <a href="/contact" className="text-[hsl(var(--blue-700))] font-semibold hover:underline">
                  Talk to a consultant →
                </a>
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

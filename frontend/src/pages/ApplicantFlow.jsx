import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, CheckCircle2, Globe, FileText, DollarSign,
  Users, UserPlus, Sparkles, ClipboardList, Check, Info, Plus, X,
  AlertCircle, GraduationCap, Briefcase, Home, Plane, MapPin,
} from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

// ── Visa category + sub-type data ─────────────────────────────────────────────

const VISA_CATEGORIES = [
  { id: 'student', label: 'Student Visa',        Icon: GraduationCap, desc: 'F-1 USA, UK Tier 4, Canada Study Permit, Australia 500, Germany' },
  { id: 'work',    label: 'Work Visa',            Icon: Briefcase,     desc: 'H-1B, H-4, L-1, O-1, UK Skilled Worker, Germany Work' },
  { id: 'pr',      label: 'Permanent Residency',  Icon: Home,          desc: 'Canada Express Entry, Australia PR, UK ILR, EB-1/EB-2 USA' },
  { id: 'tourist', label: 'Tourist / Visitor',    Icon: Plane,         desc: 'B-1/B-2 USA, Schengen, UK Visitor, Canada ETA' },
];

const STUDENT_VISAS = [
  { id: 'f1',    label: 'F-1 USA',               country: 'United States',  hint: 'Most popular for Indian students' },
  { id: 'uk',    label: 'UK Student Visa',        country: 'United Kingdom', hint: 'Tier 4 / CAS required' },
  { id: 'ca',    label: 'Canada Study Permit',    country: 'Canada',         hint: 'DLI-approved institutions' },
  { id: 'au',    label: 'Australia Subclass 500', country: 'Australia',      hint: 'CoE required' },
  { id: 'de',    label: 'Germany Student Visa',   country: 'Germany',        hint: 'Blocked account + APS required' },
  { id: 'other', label: 'Other Country',          country: '',               hint: 'Europe, Asia & more' },
];

const WORK_VISAS = [
  { id: 'h1b',    label: 'H-1B USA',           country: 'United States',  hint: 'Employer-sponsored specialty occupation' },
  { id: 'h4',     label: 'H-4 USA',            country: 'United States',  hint: 'Dependent of H-1B holder (spouse / child)' },
  { id: 'l1',     label: 'L-1 USA',            country: 'United States',  hint: 'Intra-company transfer' },
  { id: 'o1',     label: 'O-1 USA',            country: 'United States',  hint: 'Extraordinary ability' },
  { id: 'uk_sw',  label: 'UK Skilled Worker',  country: 'United Kingdom', hint: 'Points-based route' },
  { id: 'de_work',label: 'Germany Work Visa',  country: 'Germany',        hint: 'Qualified professionals' },
  { id: 'ca_work',label: 'Canada Work Permit', country: 'Canada',         hint: 'LMIA or CUSMA' },
];

const PR_PATHWAYS = [
  { id: 'ca_ee',  label: 'Canada Express Entry',  country: 'Canada',         hint: 'CRS-based points system' },
  { id: 'au_pr',  label: 'Australia PR (189/190)', country: 'Australia',      hint: 'Skilled Independent' },
  { id: 'us_eb',  label: 'USA EB-1 / EB-2',       country: 'United States',  hint: 'Employment-based green card' },
  { id: 'uk_ilr', label: 'UK Indefinite Leave',    country: 'United Kingdom', hint: 'After 5 years on work/spouse visa' },
];

const TOURIST_VISAS = [
  { id: 'us_b2',    label: 'USA B-1/B-2',       country: 'United States', hint: 'Business & tourism' },
  { id: 'schengen', label: 'Schengen (Europe)',  country: 'Europe',        hint: '26 EU countries' },
  { id: 'uk_visit', label: 'UK Visitor Visa',    country: 'United Kingdom',hint: 'Up to 6 months' },
  { id: 'ca_eta',   label: 'Canada ETA / TRV',   country: 'Canada',        hint: 'eTA for air travel' },
];

// ── Comprehensive mandatory document lists per visa type ──────────────────────

const VISA_DOCS = {
  f1: {
    sections: [
      {
        id: 'application', title: 'Application & Identity Documents',
        docs: [
          { id: 'ds160',    label: 'DS-160 Confirmation Page', mandatory: true,  tip: 'Online nonimmigrant visa application; print the barcode page for interview' },
          { id: 'passport', label: 'Valid Passport — 6+ months beyond I-20 end date', mandatory: true, tip: 'Bring all previous passports if any' },
          { id: 'photo',    label: 'Visa Photo — 2×2 inch, white background', mandatory: true, tip: 'As per US visa specifications; taken within last 6 months' },
          { id: 'mrv_fee',  label: 'MRV Fee Payment Receipt ($185)', mandatory: true, tip: 'Pay via NEFT at designated banks (Axis/HDFC) listed on ustraveldocs.com' },
          { id: 'sevis_fee',label: 'SEVIS Fee Receipt (I-901) — $350', mandatory: true, tip: 'Pay at fmjfee.com using the SEVIS ID on your I-20; print the receipt' },
          { id: 'i20',      label: 'Form I-20 (Original, student-signed page 1)', mandatory: true, tip: 'Issued by a SEVIS-registered university; must be signed by student and DSO' },
        ],
      },
      {
        id: 'academic', title: 'Academic Documents',
        docs: [
          { id: 'mark10',   label: '10th Marksheet & Passing Certificate', mandatory: true, tip: 'Original + attested copy' },
          { id: 'mark12',   label: '12th Marksheet & Passing Certificate', mandatory: true, tip: 'Original + attested copy' },
          { id: 'ug_degree',label: "UG Degree Certificate & Consolidated Transcripts", mandatory: false, tip: 'Required if applying for Master\'s or higher' },
          { id: 'gre',      label: 'GRE / GMAT Official Score Report', mandatory: false, tip: 'Most US Master\'s programs require GRE 300+ or GMAT 550+; bring score printout' },
          { id: 'toefl',    label: 'TOEFL / IELTS / Duolingo English Test Score', mandatory: true, tip: 'TOEFL 80+ or IELTS 6.5+ typically required; must match what university accepted' },
          { id: 'sop',      label: 'Statement of Purpose (SOP)', mandatory: true, tip: 'Written by applicant; submitted to university; bring a printed copy for interview' },
          { id: 'lor',      label: 'Letters of Recommendation (LORs) — 2 to 3', mandatory: true, tip: 'From professors or supervisors; usually sent directly to university' },
          { id: 'resume',   label: 'Resume / CV', mandatory: true, tip: 'Academic and work experience; referred to during visa interview' },
        ],
      },
      {
        id: 'financial', title: 'Financial Documents',
        docs: [
          { id: 'bank6m',   label: 'Bank Statements — all accounts, last 6 months', mandatory: true, tip: 'Stamped & signed by bank manager; must show funds matching I-20 estimated cost' },
          { id: 'itr3',     label: 'Income Tax Returns (sponsor) — last 3 years', mandatory: true, tip: 'ITR-V acknowledgements + computation sheet from Income Tax portal' },
          { id: 'form16',   label: 'Form 16 / Salary Slips — last 6 months (sponsor)', mandatory: true, tip: 'Issued by employer; CA income certificate if self-employed' },
          { id: 'ca_stmt',  label: 'CA-Certified Financial Statement', mandatory: true, tip: 'Chartered accountant certifies total assets, liabilities, and net worth of sponsor' },
          { id: 'i20_cost', label: 'I-20 Financial Estimate Confirmation from University', mandatory: true, tip: 'The I-20 shows annual cost of attendance; your documented funds must meet or exceed it' },
          { id: 'affidavit',label: 'Affidavit of Financial Support (if parent/relative sponsoring)', mandatory: false, tip: 'Notarized statement confirming sponsor will cover expenses' },
          { id: 'edu_loan', label: 'Education Loan Sanction Letter (if applicable)', mandatory: false, tip: 'From a nationalized or recognized private bank' },
          { id: 'scholarship', label: 'Scholarship Award Letter (if applicable)', mandatory: false, tip: 'Reduces proof-of-funds requirement; bring original' },
          { id: 'property', label: 'Property / Asset Documents', mandatory: false, tip: 'Land deeds, FDs, shares — strengthens home-country ties argument' },
        ],
      },
    ],
    help: ['GRE / GMAT preparation', 'TOEFL / IELTS / PTE preparation', 'SOP writing assistance', 'CA-certified financial statement', 'Education loan', 'Forex / fund transfer abroad'],
  },

  us_b2: {
    sections: [
      {
        id: 'application', title: 'Application & Identity Documents',
        docs: [
          { id: 'ds160',     label: 'DS-160 Confirmation Page', mandatory: true, tip: 'Online application for all US nonimmigrant visas' },
          { id: 'passport',  label: 'Valid Passport — 6+ months validity', mandatory: true, tip: 'Bring all previous passports; old stamps show travel history and compliance' },
          { id: 'photo',     label: 'Visa Photo — 2×2 inch, white background', mandatory: true },
          { id: 'visa_fee',  label: 'MRV Fee Payment Receipt ($185)', mandatory: true },
          { id: 'old_passports', label: 'Old / Previous Passports (if any)', mandatory: false, tip: 'Strong evidence of prior visa compliance and travel history' },
        ],
      },
      {
        id: 'ties', title: 'Home-Country Ties — Most Critical for B-1/B-2',
        docs: [
          { id: 'emp_letter',  label: 'Employment Letter with No Objection Certificate (NOC)', mandatory: true, tip: 'Most critical document; employer confirms your role, salary, and NOC to travel' },
          { id: 'leave_letter',label: 'Leave Sanction Letter from Employer', mandatory: true, tip: 'Confirms you will return to your job; dates must match intended travel' },
          { id: 'salary_slips',label: 'Salary Slips — last 3 months', mandatory: true, tip: 'Confirms active employment and regular income' },
          { id: 'property',    label: 'Property Ownership Documents (land deed / khata)', mandatory: false, tip: 'Immovable assets in India prove strong reason to return' },
          { id: 'family_ties', label: 'Proof of Dependent Family in India (birth / marriage certs)', mandatory: false, tip: 'Spouse, children, or dependent parents staying in India' },
        ],
      },
      {
        id: 'financial', title: 'Financial Documents',
        docs: [
          { id: 'bank6m',   label: 'Bank Statements — last 3-6 months (all accounts)', mandatory: true, tip: 'Typically need USD 5,000–10,000 equivalent; sudden large deposits are questioned' },
          { id: 'itr3',     label: 'Income Tax Returns — last 2-3 years', mandatory: true, tip: 'ITR-V acknowledgements from Income Tax portal' },
          { id: 'form16',   label: 'Form 16 / Salary Certificate', mandatory: true },
          { id: 'ca_stmt',  label: 'CA-Certified Financial Statement', mandatory: true, tip: 'CA certifies total net worth and assets' },
          { id: 'assets',   label: 'Fixed Deposits / Investment / Share Statements', mandatory: false, tip: 'Strengthens financial profile; stable long-term holdings preferred' },
        ],
      },
      {
        id: 'travel', title: 'Travel Documents',
        docs: [
          { id: 'itinerary',  label: 'Flight Booking / Travel Itinerary', mandatory: true, tip: 'Soft booking is fine; finalize after visa approval' },
          { id: 'hotel',      label: 'Hotel / Accommodation Bookings', mandatory: false, tip: 'Soft booking recommended; confirms planned purpose of visit' },
          { id: 'invitation', label: 'Invitation Letter from US Host (for B-1 / visiting family)', mandatory: false, tip: 'From a US citizen or resident on plain paper; include their status copy' },
          { id: 'conference', label: 'Conference / Business Event Registration Letter (B-1)', mandatory: false, tip: 'If attending a trade show, conference, or business meeting' },
        ],
      },
    ],
    help: ['CA-certified financial statement', 'Document notarization', 'Forex / travel money'],
  },

  h1b: {
    sections: [
      {
        id: 'application', title: 'Application & Identity Documents',
        docs: [
          { id: 'ds160',    label: 'DS-160 Confirmation Page', mandatory: true },
          { id: 'passport', label: 'Valid Passport — 6+ months beyond intended stay', mandatory: true, tip: 'Include all pages with previous US visa stamps' },
          { id: 'photo',    label: 'Visa Photo — 2×2 inch, white background', mandatory: true },
          { id: 'visa_fee', label: 'Visa Application Fee Receipt ($205 for H-class)', mandatory: true },
        ],
      },
      {
        id: 'petition', title: 'Petition & Employer Documents',
        docs: [
          { id: 'i797',        label: 'H-1B Approval Notice (I-797 / I-797A)', mandatory: true, tip: 'Original from USCIS; I-797A has a detachable I-94 at the bottom' },
          { id: 'i129',        label: 'Form I-129 Petition Copy', mandatory: true, tip: 'H-1B petition filed by employer; pages 1-3 minimum' },
          { id: 'lca',         label: 'Labor Condition Application (LCA)', mandatory: true, tip: 'Filed by employer with US DOL before I-129; shows prevailing wage compliance' },
          { id: 'offer_letter',label: 'Employment Offer / Appointment Letter', mandatory: true, tip: 'From US employer; shows role, salary, start date, and location(s)' },
          { id: 'support_ltr', label: 'Employer Support Letter for Visa Interview', mandatory: true, tip: 'HR letter confirming H-1B approval and business need for the position' },
          { id: 'job_desc',    label: 'Detailed Job Description — Specialty Occupation Proof', mandatory: true, tip: 'Proves the position requires at least a Bachelor\'s degree in a specific field' },
        ],
      },
      {
        id: 'education', title: 'Educational & Professional Documents',
        docs: [
          { id: 'degree',      label: "Bachelor's Degree Certificate (or higher)", mandatory: true, tip: 'Minimum qualification for H-1B specialty occupation' },
          { id: 'transcripts', label: 'Official Academic Transcripts — all semesters', mandatory: true },
          { id: 'ece',         label: 'Educational Credential Evaluation (WES/NACES) — if Indian degree', mandatory: false, tip: 'Required if the consular officer questions degree equivalency' },
          { id: 'prof_license',label: 'Professional License / Certification (if applicable)', mandatory: false, tip: 'For regulated occupations: nursing, engineering, architecture, law' },
        ],
      },
      {
        id: 'financial', title: 'Financial Documents',
        docs: [
          { id: 'india_bank', label: 'India Bank Statements — all accounts, last 6 months', mandatory: true },
          { id: 'itr3',       label: 'India Income Tax Returns — last 3 years', mandatory: true, tip: 'ITR-V acknowledgements + computation sheet' },
          { id: 'form16',     label: 'India Form 16 / Salary Slips — last 6 months', mandatory: true, tip: 'From current Indian employer before relocation' },
          { id: 'ca_stmt',    label: 'CA-Certified Financial Statement', mandatory: true },
          { id: 'paystubs',   label: 'US Pay Stubs — last 3 months (H-1B extension / transfer only)', mandatory: false, tip: 'Required for renewals/amendments; not for first-time consular processing' },
          { id: 'w2',         label: 'US W-2 Forms — last year (extension only)', mandatory: false },
        ],
      },
    ],
    help: ['Educational credential evaluation (WES)', 'CA-certified financial statement', 'Document apostille / notarization'],
  },

  h4: {
    sections: [
      {
        id: 'application', title: 'Application & Identity Documents',
        docs: [
          { id: 'ds160',    label: 'DS-160 Confirmation Page (separate per H-4 applicant)', mandatory: true },
          { id: 'passport', label: 'Valid Passport — 6+ months validity', mandatory: true },
          { id: 'photo',    label: 'Visa Photo — 2×2 inch, white background', mandatory: true },
          { id: 'visa_fee', label: 'Visa Application Fee Receipt ($185)', mandatory: true },
        ],
      },
      {
        id: 'relationship', title: 'Relationship Proof Documents',
        docs: [
          { id: 'marriage_cert', label: 'Marriage Certificate (original) — for spouse', mandatory: true, tip: 'Issued by Registrar of Marriages; must be apostilled by MEA' },
          { id: 'birth_cert',    label: 'Birth Certificate(s) — for children under 21', mandatory: true, tip: 'Issued by municipal authority; must be apostilled by MEA' },
          { id: 'apostille',     label: 'MEA Apostille on All Relationship Documents', mandatory: true, tip: 'Ministry of External Affairs apostille stamp makes documents valid for US consulate' },
        ],
      },
      {
        id: 'h1b_holder', title: "H-1B Holder's Documents (Mandatory)",
        docs: [
          { id: 'i797',         label: "H-1B Holder's Approval Notice (I-797)", mandatory: true, tip: 'Most recent I-797 showing valid H-1B status' },
          { id: 'h1b_passport', label: "H-1B Holder's Passport Copy (bio-data + visa stamp page)", mandatory: true },
          { id: 'h1b_i94',      label: "H-1B Holder's I-94 Print (from i94.cbp.dhs.gov)", mandatory: true },
          { id: 'h1b_paystubs', label: "H-1B Holder's Pay Stubs — last 3 months", mandatory: true, tip: 'Confirms active employment and that the H-1B is not in layoff status' },
          { id: 'emp_letter',   label: "H-1B Holder's Employment Verification Letter", mandatory: true, tip: 'From US employer on letterhead; confirms current role, salary, and status' },
        ],
      },
      {
        id: 'financial', title: 'Financial Documents',
        docs: [
          { id: 'us_bank',    label: "H-1B Holder's US Bank Statements — last 3 months", mandatory: true },
          { id: 'w2',         label: "H-1B Holder's W-2 / US Tax Returns (last year)", mandatory: true },
          { id: 'india_bank', label: "Applicant's India Bank Statements (if independent assets)", mandatory: false },
          { id: 'ca_stmt',    label: 'CA-Certified Financial Statement (India assets)', mandatory: true, tip: 'Certifies India-side assets of the family' },
        ],
      },
    ],
    help: ['MEA apostille assistance', 'Marriage certificate attestation', 'Document translation', 'CA-certified financial statement'],
  },

  l1: {
    sections: [
      {
        id: 'application', title: 'Application & Identity Documents',
        docs: [
          { id: 'ds160',    label: 'DS-160 Confirmation Page', mandatory: true },
          { id: 'passport', label: 'Valid Passport — 6+ months validity', mandatory: true },
          { id: 'photo',    label: 'Visa Photo — 2×2 inch, white background', mandatory: true },
          { id: 'visa_fee', label: 'Visa Application Fee Receipt ($205)', mandatory: true },
          { id: 'i797',     label: 'L-1 Approval Notice (I-797)', mandatory: true, tip: 'From USCIS via employer\'s I-129 L-1 petition' },
          { id: 'i129',     label: 'Form I-129 Petition Copy', mandatory: true },
        ],
      },
      {
        id: 'corporate', title: 'Corporate Relationship Documents',
        docs: [
          { id: 'org_chart',   label: 'Organizational Chart — India entity and US entity', mandatory: true, tip: 'Shows reporting structure and qualifying relationship between entities' },
          { id: 'india_incorp',label: 'India Company Incorporation Certificate (MCA / RoC)', mandatory: true },
          { id: 'us_incorp',   label: 'US Company State Incorporation / Registration Certificate', mandatory: true },
          { id: 'share_struct',label: 'Share Structure / Ownership Proof — both entities', mandatory: true, tip: 'Proves common ownership or control; shareholding patterns with names' },
          { id: 'india_tax',   label: 'India Company IT Returns — last 2 years', mandatory: true },
          { id: 'us_tax',      label: 'US Company Federal Tax Returns (1120) — last 2 years', mandatory: true },
        ],
      },
      {
        id: 'employment', title: 'Employment Documents',
        docs: [
          { id: 'india_emp',   label: 'Employment Letter from India Entity', mandatory: true, tip: 'Confirms: role, 1+ year tenure in last 3 years, and relationship to US company' },
          { id: 'us_emp',      label: 'Employment / Transfer Letter from US Entity', mandatory: true, tip: 'Detailed offer for new US role' },
          { id: 'job_both',    label: 'Detailed Job Descriptions — both India and US roles', mandatory: true, tip: 'L-1A: managerial/executive. L-1B: specialized knowledge' },
          { id: 'india_stubs', label: 'India Pay Stubs — last 6 months', mandatory: true },
          { id: 'india_payroll',label: 'India Payroll Records', mandatory: true },
        ],
      },
      {
        id: 'financial', title: 'Financial Documents',
        docs: [
          { id: 'india_bank', label: 'India Bank Statements — last 6 months', mandatory: true },
          { id: 'itr3',       label: 'India Income Tax Returns — last 3 years', mandatory: true },
          { id: 'form16',     label: 'Form 16 — last 2 years', mandatory: true },
          { id: 'ca_stmt',    label: 'CA-Certified Financial Statement', mandatory: true },
        ],
      },
    ],
    help: ['CA-certified financial statement', 'Corporate document translation', 'Document apostille / notarization'],
  },

  uk: {
    sections: [
      {
        id: 'application', title: 'Application & Identity Documents',
        docs: [
          { id: 'passport',   label: 'Valid Passport (must cover full course duration)', mandatory: true },
          { id: 'photo',      label: 'Passport Photos — UKVI specifications', mandatory: true },
          { id: 'visa_fee',   label: 'Student Visa Application Fee Payment (£490)', mandatory: true, tip: 'Online via UKVI portal' },
          { id: 'ihs',        label: 'Immigration Health Surcharge (IHS) Receipt', mandatory: true, tip: '£776/year for students; pay during online application' },
          { id: 'biometrics', label: 'Biometrics Enrollment (UKVCAS appointment)', mandatory: true, tip: 'Book at a Sopra Steria UKVCAS service point in India' },
          { id: 'cas',        label: 'CAS Number from UK University', mandatory: true, tip: 'Confirmation of Acceptance for Studies; reference starting with a letter, followed by numbers' },
          { id: 'tb_test',    label: 'Tuberculosis (TB) Test Result from Approved Clinic', mandatory: true, tip: 'Mandatory for Indian applicants; valid 6 months; use IOM or UKTB-approved clinic' },
        ],
      },
      {
        id: 'academic', title: 'Academic Documents',
        docs: [
          { id: 'offer_letter',label: 'Unconditional Offer Letter from UK University', mandatory: true },
          { id: 'marksheets',  label: '10th, 12th, UG Marksheets & Certificates', mandatory: true },
          { id: 'english',     label: 'English Certificate — IELTS Academic 5.5+ (or equivalent)', mandatory: true, tip: 'Must match what is listed on the CAS; some universities accept their own test' },
          { id: 'atas',        label: 'ATAS Certificate (if your subject requires it)', mandatory: false, tip: 'Academic Technology Approval Scheme — certain science/engineering/tech subjects' },
        ],
      },
      {
        id: 'financial', title: 'Financial Documents',
        docs: [
          { id: 'bank_28d',  label: 'Bank Statements — 28 consecutive days (ending within 31 days of application)', mandatory: true, tip: 'London: £1,334/month × months of course (max 9). Outside London: £1,023/month' },
          { id: 'all_accts', label: 'Statements from All Bank Accounts', mandatory: true, tip: 'Total across accounts must meet maintenance requirement' },
          { id: 'itr',       label: 'Income Tax Returns (sponsor) — last 2-3 years', mandatory: true },
          { id: 'form16',    label: 'Form 16 / Salary Certificate (sponsor)', mandatory: true },
          { id: 'ca_stmt',   label: 'CA-Certified Financial Statement', mandatory: true },
          { id: 'sponsor_ltr',label: 'Official Financial Sponsor Letter (if university/government sponsored)', mandatory: false },
          { id: 'edu_loan',  label: 'Education Loan Sanction Letter (if applicable)', mandatory: false },
        ],
      },
    ],
    help: ['IELTS Academic preparation', 'CA-certified financial statement', 'TB test appointment booking', 'Education loan', 'Forex / remittance'],
  },

  ca: {
    sections: [
      {
        id: 'application', title: 'Application & Identity Documents',
        docs: [
          { id: 'passport',   label: 'Valid Passport (must cover entire study period)', mandatory: true },
          { id: 'photo',      label: 'Photos — IRCC digital photo specifications', mandatory: true },
          { id: 'biometrics', label: 'Biometrics Fee (CAD 85) + Enrollment at VFS Global', mandatory: true },
          { id: 'dli_letter', label: 'Acceptance Letter from a DLI (Designated Learning Institution)', mandatory: true, tip: 'Confirm the DLI number at ircc.canada.ca; must be a currently designated school' },
          { id: 'permit_fee', label: 'Study Permit Application Fee (CAD 150)', mandatory: true },
        ],
      },
      {
        id: 'academic', title: 'Academic Documents',
        docs: [
          { id: 'marksheets', label: '10th, 12th, UG Marksheets & Certificates', mandatory: true },
          { id: 'ielts',      label: 'IELTS Score — 6.0+ each band (SDS stream)', mandatory: true, tip: 'Student Direct Stream requires IELTS 6.0 in all 4 bands; guarantees faster processing' },
          { id: 'study_plan', label: 'Study Plan / Statement of Purpose', mandatory: true, tip: '1-2 pages: why Canada, why this program, post-graduation plans' },
          { id: 'ece',        label: 'Educational Credential Assessment (WES)', mandatory: false, tip: 'Required if officer cannot assess your Indian qualifications' },
        ],
      },
      {
        id: 'financial', title: 'Financial Documents',
        docs: [
          { id: 'gic',         label: 'GIC Certificate (CAD 10,200 min) — SDS stream mandatory', mandatory: true, tip: 'Guaranteed Investment Certificate from CIBC, SBI Canada, or ICICI Bank Canada' },
          { id: 'tuition_rcpt',label: 'First Year Tuition Fee Payment Receipt', mandatory: true, tip: 'Required for SDS stream; pay before submitting the application' },
          { id: 'bank6m',      label: 'Bank Statements — last 4-6 months', mandatory: true, tip: 'Non-SDS: show CAD 10,000+ per year; SDS: GIC covers this' },
          { id: 'itr3',        label: 'Income Tax Returns (sponsor) — last 3 years', mandatory: true },
          { id: 'form16',      label: 'Form 16 / Salary Certificate (sponsor)', mandatory: true },
          { id: 'ca_stmt',     label: 'CA-Certified Financial Statement', mandatory: true },
          { id: 'edu_loan',    label: 'Education Loan Sanction Letter (if applicable)', mandatory: false },
        ],
      },
      {
        id: 'other', title: 'Other Documents',
        docs: [
          { id: 'medical', label: 'Medical Examination (IRCC-approved physician)', mandatory: false, tip: 'May be required if processing exceeds 6 months or for health-field programs' },
          { id: 'police',  label: 'Police Clearance Certificate', mandatory: false, tip: 'Some officers request this; obtain in advance to avoid delays' },
        ],
      },
    ],
    help: ['IELTS preparation (6.0+ each band)', 'GIC account opening', 'CA-certified financial statement', 'Study plan / SOP writing', 'Education loan'],
  },

  au: {
    sections: [
      {
        id: 'application', title: 'Application & Identity Documents',
        docs: [
          { id: 'passport',  label: 'Valid Passport', mandatory: true },
          { id: 'photo',     label: 'Passport-sized Photos', mandatory: true },
          { id: 'visa_fee',  label: 'Student Visa Application Fee (AUD 710)', mandatory: true, tip: 'Online via ImmiAccount on homeaffairs.gov.au' },
          { id: 'coe',       label: 'Confirmation of Enrolment (CoE) from CRICOS-registered institution', mandatory: true, tip: 'Issued after first tuition instalment is paid to the Australian university' },
        ],
      },
      {
        id: 'academic', title: 'Academic Documents',
        docs: [
          { id: 'marksheets', label: '10th, 12th, UG Marksheets & Certificates', mandatory: true },
          { id: 'english',    label: 'English Proficiency — IELTS 5.5+ overall / PTE 42+ / TOEFL 46+', mandatory: true },
          { id: 'gte',        label: 'Genuine Temporary Entrant (GTE) Statement', mandatory: true, tip: 'Critical for approval: explains study purpose, why Australia, and intent to return to India' },
          { id: 'study_plan', label: 'Study Plan — course choice and post-study plans', mandatory: true },
        ],
      },
      {
        id: 'financial', title: 'Financial Documents',
        docs: [
          { id: 'funds',    label: 'Proof of Funds: AUD 21,041 living + tuition per year', mandatory: true, tip: 'Bank statements, or education loan, or scholarship covering both' },
          { id: 'bank6m',   label: 'Bank Statements — last 3-6 months', mandatory: true },
          { id: 'itr',      label: 'Income Tax Returns (sponsor) — last 2-3 years', mandatory: true },
          { id: 'form16',   label: 'Form 16 / Salary Certificate (sponsor)', mandatory: true },
          { id: 'ca_stmt',  label: 'CA-Certified Financial Statement', mandatory: true },
          { id: 'oshc',     label: 'Overseas Student Health Cover (OSHC) Policy', mandatory: true, tip: 'Mandatory for entire Australian stay; purchase before or at time of application' },
          { id: 'edu_loan', label: 'Education Loan Sanction Letter (if applicable)', mandatory: false },
        ],
      },
      {
        id: 'health', title: 'Health & Character Documents',
        docs: [
          { id: 'health_exam', label: 'Health Examination — DIBP-approved Panel Physician', mandatory: true, tip: 'Results go directly from doctor to DIBP; find doctors at homeaffairs.gov.au' },
          { id: 'police',      label: 'Police Clearance Certificate from India', mandatory: true, tip: 'From local police station or passport office (RPOC); apostille not required' },
        ],
      },
    ],
    help: ['IELTS / PTE preparation', 'GTE statement writing', 'CA-certified financial statement', 'Education loan', 'OSHC insurance'],
  },

  de: {
    sections: [
      {
        id: 'application', title: 'Application & Identity Documents',
        docs: [
          { id: 'passport',   label: 'Valid Passport + 2 copies of bio-data page', mandatory: true },
          { id: 'photo',      label: 'Biometric Photos — 35×45 mm, white background', mandatory: true },
          { id: 'visa_form',  label: 'Completed National Visa Application Form (signed)', mandatory: true, tip: 'Fill at visaentrag.de or German embassy website; print and sign' },
          { id: 'visa_fee',   label: 'Visa Fee — €75 (cash or DD at German Consulate)', mandatory: true },
          { id: 'admission',  label: 'University Admission Letter (Zulassungsbescheid)', mandatory: true, tip: 'From a state-recognised German university; must be unconditional; check at anabin.kmk.org' },
          { id: 'aps',        label: 'APS Certificate (Akademische Prüfstelle) — Mandatory for Indian students', mandatory: true, tip: 'APS India verifies your academic qualifications; apply at aps-india.de; allow 4-8 weeks' },
          { id: 'enrollment', label: 'Enrollment Certificate (if already enrolled before visa)', mandatory: false },
        ],
      },
      {
        id: 'academic', title: 'Academic Documents',
        docs: [
          { id: 'marksheets', label: '10th, 12th, UG Marksheets (originals + certified German/English translation)', mandatory: true, tip: 'Translations by a sworn/certified translator; required at the consulate' },
          { id: 'degree',     label: 'Degree Certificates (originals + certified translation)', mandatory: true },
          { id: 'language',   label: 'Language Certificate — German B2/C1 (TestDaF/DSH) OR English B2+ (IELTS 6.5 / TOEFL 90)', mandatory: true, tip: 'German-taught: TestDaF 4×4 or DSH-2. English-taught programs: IELTS/TOEFL from university' },
          { id: 'motivation', label: 'Motivation Letter (Motivationsschreiben)', mandatory: true, tip: 'Why Germany, why this program, career goals; 1-2 pages' },
          { id: 'cv',         label: 'CV / Resume in Europass format', mandatory: true },
        ],
      },
      {
        id: 'financial', title: 'Financial Documents',
        docs: [
          { id: 'sperrkonto', label: 'Blocked Account (Sperrkonto) Certificate — €11,208 minimum', mandatory: true, tip: 'Open via Coracle, Expatrio, or Deutsche Bank India before consulate appointment; €934/month × 12' },
          { id: 'bank_supp',  label: 'India Bank Statements (supporting)', mandatory: true, tip: 'Shows background financial profile beyond the blocked account' },
          { id: 'ca_stmt',    label: 'CA-Certified Financial Statement', mandatory: true },
          { id: 'scholarship',label: 'Scholarship Letter — DAAD or institutional (if applicable)', mandatory: false, tip: 'Reduces or replaces blocked account requirement' },
        ],
      },
      {
        id: 'other', title: 'Other Documents',
        docs: [
          { id: 'health_ins',    label: 'Health Insurance Certificate (German statutory or approved travel coverage)', mandatory: true, tip: 'TK, AOK, Barmer (German public insurance) — or travel health insurance for the start period' },
          { id: 'accommodation', label: 'Proof of Accommodation in Germany', mandatory: true, tip: 'University dormitory confirmation, rental contract, or host\'s address with declaration' },
        ],
      },
    ],
    help: ['German language (B1/B2/C1) coaching', 'APS certificate guidance', 'Blocked account opening', 'CA-certified financial statement', 'Motivation letter writing', 'Document translation into German'],
  },

  ca_ee: {
    sections: [
      {
        id: 'identity', title: 'Identity Documents',
        docs: [
          { id: 'passport',   label: 'Valid Passport', mandatory: true },
          { id: 'photo',      label: 'Digital Photos — IRCC specifications', mandatory: true },
          { id: 'biometrics', label: 'Biometrics Enrollment (CAD 85 at VFS Global India)', mandatory: true },
        ],
      },
      {
        id: 'language', title: 'Language Test Results',
        docs: [
          { id: 'ielts',   label: 'IELTS General Training (or CELPIP) — CLB 7+ for FSW', mandatory: true, tip: 'Language is the #1 CRS factor; CLB 9+ (IELTS 7.0 each band) gives maximum points' },
          { id: 'french',  label: 'French Language Test — TEF Canada or TCF Canada (if applicable)', mandatory: false, tip: 'Bilingual (English + French) candidates receive 50 additional CRS points' },
        ],
      },
      {
        id: 'education', title: 'Education & Skills Documents',
        docs: [
          { id: 'ece',         label: 'Educational Credential Assessment — WES (or IQAS / ICES)', mandatory: true, tip: 'Mandatory for FSW stream; WES ECA with course-by-course report is preferred' },
          { id: 'degree',      label: 'All Degree Certificates & Official Transcripts', mandatory: true },
          { id: 'marksheets',  label: '10th, 12th Marksheets', mandatory: true },
        ],
      },
      {
        id: 'employment', title: 'Employment & Experience Documents',
        docs: [
          { id: 'exp_letters', label: 'Experience Letters from All Employers (last 10 years)', mandatory: true, tip: 'On company letterhead; must state: NOC/TEER code, role, duties, dates, salary, hours/week, signature of authorized HR' },
          { id: 'paystubs',    label: 'Pay Stubs — last 3-6 months', mandatory: true },
          { id: 'tax_t1',      label: 'T4 Slips / T1 Tax Returns (if previously worked in Canada)', mandatory: false },
        ],
      },
      {
        id: 'financial', title: 'Financial Documents — Settlement Funds',
        docs: [
          { id: 'settlement',  label: 'Proof of Settlement Funds (IRCC table: 1 person CAD 13,757 / family of 4 CAD 25,564)', mandatory: true, tip: 'Not required if you have a valid Canadian job offer' },
          { id: 'bank6m',      label: 'Bank Statements — last 6 months (all accounts)', mandatory: true },
          { id: 'ca_stmt',     label: 'CA-Certified Financial Statement', mandatory: true },
          { id: 'property',    label: 'Property / Asset Documents', mandatory: false },
          { id: 'fd_stmt',     label: 'Fixed Deposits / Investment / Share Statements', mandatory: false },
        ],
      },
      {
        id: 'other', title: 'Other Documents',
        docs: [
          { id: 'police',  label: 'Police Clearance Certificates (all countries lived 6+ months)', mandatory: true, tip: 'India: passport office RPOC; request early — takes 2-4 weeks' },
          { id: 'medical', label: 'Medical Examination (IRCC-designated physician) — after ITA only', mandatory: true, tip: 'Complete ONLY after receiving Invitation to Apply (ITA); valid 12 months' },
          { id: 'pnp',     label: 'Provincial Nomination Certificate (if PNP stream)', mandatory: false, tip: 'Adds 600 CRS points — essentially guarantees an ITA' },
          { id: 'job_offer',label: 'Valid Canadian Job Offer (LMIA-backed, if applicable)', mandatory: false, tip: 'Adds 200 CRS points; exempts from settlement fund requirement' },
        ],
      },
    ],
    help: ['IELTS General Training preparation', 'WES / ECA credential evaluation', 'CA-certified financial statement', 'Experience letter drafting', 'Police clearance certificate'],
  },
};

// Generic fallback for visa types without a specific entry
const VISA_DOCS_DEFAULT = {
  sections: [
    {
      id: 'application', title: 'Application & Identity Documents',
      docs: [
        { id: 'passport',  label: 'Valid Passport — 6+ months validity', mandatory: true },
        { id: 'photo',     label: 'Visa Photo (as per country specifications)', mandatory: true },
        { id: 'visa_form', label: 'Visa Application Form', mandatory: true },
        { id: 'visa_fee',  label: 'Visa Application Fee Receipt', mandatory: true },
      ],
    },
    {
      id: 'financial', title: 'Financial Documents',
      docs: [
        { id: 'bank6m',  label: 'Bank Statements — last 6 months', mandatory: true },
        { id: 'itr',     label: 'Income Tax Returns — last 3 years', mandatory: true },
        { id: 'form16',  label: 'Form 16 / Salary Certificate', mandatory: true },
        { id: 'ca_stmt', label: 'CA-Certified Financial Statement', mandatory: true },
        { id: 'property',label: 'Property / Asset Documents', mandatory: false },
      ],
    },
  ],
  help: ['CA-certified financial statement', 'Document translation / notarization'],
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
    blue:    'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] border-[hsl(var(--blue-200))]',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    red:     'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${map[color]}`}>
      {text}
    </span>
  );
}

// ── Step 1 — Visa Category ────────────────────────────────────────────────────

function StepVisaCategory({ value, onChange }) {
  return (
    <div className="space-y-3">
      <h2 className="text-[20px] font-bold text-[hsl(var(--blue-900))]">What kind of visa are you applying for?</h2>
      <p className="text-[14px] text-muted-foreground">We'll build your personalised document checklist based on official requirements.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {VISA_CATEGORIES.map((c) => (
          <button key={c.id} className={selCls(value === c.id)} onClick={() => onChange(c.id)}>
            <c.Icon className="w-5 h-5 text-[hsl(var(--blue-700))]" />
            <div className="mt-2 text-[15px] font-bold text-[hsl(var(--blue-900))]">{c.label}</div>
            <div className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{c.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 2 — Sub-category ─────────────────────────────────────────────────────

function StepSubCategory({ category, value, onChange }) {
  const options =
    category === 'student' ? STUDENT_VISAS
    : category === 'work'  ? WORK_VISAS
    : category === 'pr'    ? PR_PATHWAYS
    : TOURIST_VISAS;

  const label =
    category === 'student' ? 'Which student visa are you targeting?'
    : category === 'work'  ? 'Which work visa are you targeting?'
    : category === 'pr'    ? 'Which PR pathway interests you?'
    : 'Which visitor visa are you applying for?';

  return (
    <div className="space-y-3">
      <h2 className="text-[20px] font-bold text-[hsl(var(--blue-900))]">{label}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {options.map((v) => (
          <button key={v.id} className={selCls(value === v.id)} onClick={() => onChange(v.id)}>
            {v.country ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[hsl(var(--blue-700))] uppercase tracking-wide">
                <MapPin className="w-3 h-3" /> {v.country}
              </span>
            ) : (
              <Globe className="w-4 h-4 text-[hsl(var(--blue-700))]" />
            )}
            <div className="mt-1.5 text-[14px] font-bold text-[hsl(var(--blue-900))]">{v.label}</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">{v.hint}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 3 — Profile ──────────────────────────────────────────────────────────

function StepProfile({ category, subVisa, profile, onChange }) {
  const isStudent = category === 'student';
  const isWork    = category === 'work';
  const isPR      = category === 'pr';
  const isF1      = subVisa === 'f1';

  const pillCls = (active) =>
    `cursor-pointer rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
      active
        ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))] text-white font-bold'
        : 'border-[hsl(var(--border))] text-muted-foreground hover:border-[hsl(var(--blue-200))]'
    }`;

  return (
    <div className="space-y-6">
      <h2 className="text-[20px] font-bold text-[hsl(var(--blue-900))]">Tell us about yourself</h2>
      <p className="text-[14px] text-muted-foreground -mt-3">Helps identify gaps and tailor your document checklist.</p>

      {/* Language */}
      {(isStudent || isPR) && (
        <fieldset className="space-y-2">
          <legend className="text-[13px] font-bold text-[hsl(var(--blue-900))] mb-1">English proficiency score?</legend>
          <div className="flex flex-wrap gap-2">
            {['Yes — IELTS', 'Yes — TOEFL', 'Yes — PTE', 'No — planning soon', 'Not required'].map((opt) => (
              <label key={opt} className={pillCls(profile.language === opt)}>
                <input type="radio" className="sr-only" onChange={() => onChange('language', opt)} />
                {opt}
              </label>
            ))}
          </div>
          {profile.language === 'No — planning soon' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 mt-2 flex gap-2">
              <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-800">
                <strong>Language score is mandatory</strong> — F-1 needs TOEFL 80+; Canada needs IELTS 6.0; UK needs IELTS 5.5; Australia needs IELTS 5.5.
                Average prep time is 8–12 weeks. Mark "Need help with IELTS / TOEFL prep" in Step 4.
              </p>
            </div>
          )}
        </fieldset>
      )}

      {/* GRE for F1 */}
      {isF1 && (
        <fieldset className="space-y-2">
          <legend className="text-[13px] font-bold text-[hsl(var(--blue-900))] mb-1">GRE / GMAT score? (for Master's / PhD)</legend>
          <div className="flex flex-wrap gap-2">
            {["Yes — GRE", "Yes — GMAT", "Not required (undergrad)", "No — planning to give", "Waiver requested"].map((opt) => (
              <label key={opt} className={pillCls(profile.gre === opt)}>
                <input type="radio" className="sr-only" onChange={() => onChange('gre', opt)} />
                {opt}
              </label>
            ))}
          </div>
          {profile.gre === 'No — planning to give' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 mt-2 flex gap-2">
              <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-800">
                <strong>GRE needed for most US Master's programs</strong> — target 310+ for mid-tier, 320+ for top-20 universities. Prep time: 8–12 weeks.
                Mark "GRE / GMAT preparation" in Step 4 to flag this for your consultant.
              </p>
            </div>
          )}
          {(profile.gre === 'Yes — GRE' || profile.gre === 'Yes — GMAT') && (
            <div className="mt-2">
              <label className="text-[12px] font-bold text-[hsl(var(--blue-900))]">Your score</label>
              <input
                type="number"
                placeholder={profile.gre === 'Yes — GRE' ? '260–340' : '200–800'}
                value={profile.gre_score || ''}
                onChange={(e) => onChange('gre_score', e.target.value)}
                className="mt-1 block w-32 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-[14px] outline-none focus:border-[hsl(var(--blue-700))]"
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
            {["Bachelor's", "Master's", "PhD / Doctoral", "Diploma / Certificate", "Language Program"].map((opt) => (
              <label key={opt} className={pillCls(profile.degree === opt)}>
                <input type="radio" className="sr-only" onChange={() => onChange('degree', opt)} />
                {opt}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Work: employment status */}
      {isWork && subVisa !== 'h4' && (
        <fieldset className="space-y-2">
          <legend className="text-[13px] font-bold text-[hsl(var(--blue-900))] mb-1">Current employment status</legend>
          <div className="flex flex-wrap gap-2">
            {['Has employer sponsoring', 'Searching for sponsor', 'Self-employed / own company', 'On OPT/CPT (USA)'].map((opt) => (
              <label key={opt} className={pillCls(profile.employment === opt)}>
                <input type="radio" className="sr-only" onChange={() => onChange('employment', opt)} />
                {opt}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* PR: experience */}
      {isPR && (
        <fieldset className="space-y-2">
          <legend className="text-[13px] font-bold text-[hsl(var(--blue-900))] mb-1">Years of skilled work experience</legend>
          <div className="flex flex-wrap gap-2">
            {['Less than 1 year', '1–2 years', '3–5 years', '5+ years'].map((opt) => (
              <label key={opt} className={pillCls(profile.experience === opt)}>
                <input type="radio" className="sr-only" onChange={() => onChange('experience', opt)} />
                {opt}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Funding */}
      <fieldset className="space-y-2">
        <legend className="text-[13px] font-bold text-[hsl(var(--blue-900))] mb-1">How are you funding this?</legend>
        <div className="flex flex-wrap gap-2">
          {['Self / family savings', 'Education loan', 'Scholarship', 'Employer sponsored', 'Mixed sources'].map((opt) => (
            <label key={opt} className={pillCls(profile.funding === opt)}>
              <input type="radio" className="sr-only" onChange={() => onChange('funding', opt)} />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

// ── Step 4 — Documents ────────────────────────────────────────────────────────

function DocRow({ doc, checked, onToggle }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--border))] bg-white p-3.5">
      <button
        type="button"
        onClick={() => onToggle(doc.id)}
        className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          checked
            ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))]'
            : 'border-[hsl(var(--border))] bg-white'
        }`}
      >
        {checked && <Check size={11} className="text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-[hsl(var(--blue-900))]">{doc.label}</span>
          <Badge text={doc.mandatory ? 'Mandatory' : 'Recommended'} color={doc.mandatory ? 'red' : 'amber'} />
        </div>
        {doc.tip && <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{doc.tip}</p>}
      </div>
    </div>
  );
}

function CustomDocRow({ doc, checked, onToggle, onRemove }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--blue-200))] bg-[hsl(var(--blue-50))] p-3.5">
      <button
        type="button"
        onClick={() => onToggle(doc.id)}
        className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          checked
            ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))]'
            : 'border-[hsl(var(--border))] bg-white'
        }`}
      >
        {checked && <Check size={11} className="text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-[hsl(var(--blue-900))]">{doc.name}</span>
          <Badge text={doc.category} color="blue" />
        </div>
        {doc.remarks && <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{doc.remarks}</p>}
      </div>
      <button onClick={() => onRemove(doc.id)} className="text-muted-foreground hover:text-red-600 transition-colors shrink-0 mt-0.5">
        <X size={15} />
      </button>
    </div>
  );
}

const DOC_CATEGORIES = ['Application', 'Academic', 'Financial', 'Relationship', 'Health', 'Employment', 'Other'];

function AddDocForm({ onAdd, onCancel }) {
  const [name, setName]       = useState('');
  const [category, setCategory] = useState('Other');
  const [remarks, setRemarks] = useState('');

  const inputCls = 'block w-full rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-[13px] outline-none focus:border-[hsl(var(--blue-700))] bg-white';

  return (
    <div className="rounded-xl border border-[hsl(var(--blue-200))] bg-[hsl(var(--blue-50))] p-4 space-y-3 mt-2">
      <p className="text-[13px] font-bold text-[hsl(var(--blue-900))]">Add Custom Document</p>
      <div>
        <label className="block text-[12px] font-bold text-[hsl(var(--blue-900))] mb-1">Document name *</label>
        <input
          type="text"
          placeholder="e.g. NOC from current employer"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-[12px] font-bold text-[hsl(var(--blue-900))] mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputCls}
        >
          {DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[12px] font-bold text-[hsl(var(--blue-900))] mb-1">Remarks / notes</label>
        <textarea
          placeholder="e.g. Needs to be on company letterhead, notarized, in English"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={2}
          className={`${inputCls} resize-none`}
        />
      </div>
      <div className="flex gap-2">
        <button
          disabled={!name.trim()}
          onClick={() => { if (name.trim()) { onAdd({ name: name.trim(), category, remarks: remarks.trim() }); }}}
          className="flex items-center gap-1.5 btn-primary px-4 py-2 rounded-xl text-[13px] font-bold disabled:opacity-40"
        >
          <Plus size={14} /> Add Document
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-[13px] text-muted-foreground hover:text-[hsl(var(--blue-900))] transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

function StepDocuments({ subVisa, checkedDocs, onToggle, customDocs, onAddCustom, onRemoveCustom, helpNeeded, onToggleHelp }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const visaDocs = VISA_DOCS[subVisa] || VISA_DOCS_DEFAULT;
  const allOfficial = visaDocs.sections.flatMap((s) => s.docs);
  const mandatoryTotal   = allOfficial.filter((d) => d.mandatory).length;
  const mandatoryChecked = allOfficial.filter((d) => d.mandatory && checkedDocs.has(d.id)).length;
  const customChecked    = customDocs.filter((d) => checkedDocs.has(d.id)).length;

  const handleAddDoc = (doc) => {
    onAddCustom(doc);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[20px] font-bold text-[hsl(var(--blue-900))]">Required Documents</h2>
        <p className="text-[14px] text-muted-foreground mt-1">
          Financial documents are <strong>mandatory for every visa type</strong> regardless of country or applicant age.
          Check off what you already have.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 rounded-xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-200))] p-3">
        <DollarSign size={16} className="text-[hsl(var(--blue-700))] shrink-0" />
        <p className="text-[13px] text-[hsl(var(--blue-900))]">
          <strong>{mandatoryChecked}/{mandatoryTotal}</strong> mandatory docs ready
          {customDocs.length > 0 && (
            <span className="ml-2 text-muted-foreground">· {customChecked}/{customDocs.length} custom docs ready</span>
          )}
        </p>
      </div>

      {/* Official sections */}
      {visaDocs.sections.map((section) => (
        <div key={section.id} className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
          <div className="px-4 py-2.5 bg-[hsl(var(--blue-50))] border-b border-[hsl(var(--border))]">
            <p className="text-[11px] font-bold text-[hsl(var(--blue-900))] uppercase tracking-[0.1em]">{section.title}</p>
          </div>
          <div className="p-3 space-y-2.5">
            {section.docs.map((doc) => (
              <DocRow key={doc.id} doc={doc} checked={checkedDocs.has(doc.id)} onToggle={onToggle} />
            ))}
          </div>
        </div>
      ))}

      {/* Custom documents */}
      {customDocs.length > 0 && (
        <div className="rounded-xl border border-[hsl(var(--blue-200))] overflow-hidden">
          <div className="px-4 py-2.5 bg-[hsl(var(--blue-50))] border-b border-[hsl(var(--blue-200))]">
            <p className="text-[11px] font-bold text-[hsl(var(--blue-900))] uppercase tracking-[0.1em]">Your Added Documents</p>
          </div>
          <div className="p-3 space-y-2.5">
            {customDocs.map((doc) => (
              <CustomDocRow key={doc.id} doc={doc} checked={checkedDocs.has(doc.id)} onToggle={onToggle} onRemove={onRemoveCustom} />
            ))}
          </div>
        </div>
      )}

      {/* Add document button / form */}
      {showAddForm ? (
        <AddDocForm onAdd={handleAddDoc} onCancel={() => setShowAddForm(false)} />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 rounded-xl border border-dashed border-[hsl(var(--blue-200))] bg-[hsl(var(--blue-50))] px-4 py-3 w-full text-[13px] font-semibold text-[hsl(var(--blue-700))] hover:border-[hsl(var(--blue-700))] transition-colors"
        >
          <Plus size={15} /> Add your own document
        </button>
      )}

      {/* Need help with? */}
      {visaDocs.help?.length > 0 && (
        <div className="rounded-xl border border-[hsl(var(--border))] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Info size={15} className="text-[hsl(var(--blue-700))]" />
            <p className="text-[13px] font-bold text-[hsl(var(--blue-900))]">Do you need help with any of the following?</p>
          </div>
          <p className="text-[12px] text-muted-foreground -mt-1">Check all that apply — we'll arrange the right support via our partner network.</p>
          <div className="space-y-2">
            {visaDocs.help.map((item) => (
              <label key={item} className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => onToggleHelp(item)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                    helpNeeded.has(item)
                      ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))]'
                      : 'border-[hsl(var(--border))] bg-white'
                  }`}
                >
                  {helpNeeded.has(item) && <Check size={11} className="text-white" />}
                </div>
                <span
                  onClick={() => onToggleHelp(item)}
                  className="text-[13px] text-[hsl(var(--blue-900))] group-hover:text-[hsl(var(--blue-700))] transition-colors"
                >
                  {item}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 5 — Applicant Details + Summary ──────────────────────────────────────

function StepApplicantAndSummary({ category, subVisa, profile, applicant, onChange, checkedDocs, customDocs, helpNeeded, onSubmit, loading }) {
  const visaDocs = VISA_DOCS[subVisa] || VISA_DOCS_DEFAULT;
  const allOfficial = visaDocs.sections.flatMap((s) => s.docs);
  const missingMandatory = allOfficial.filter((d) => d.mandatory && !checkedDocs.has(d.id));
  const allSubs = [...STUDENT_VISAS, ...WORK_VISAS, ...PR_PATHWAYS, ...TOURIST_VISAS];
  const visaLabel = allSubs.find((v) => v.id === subVisa)?.label || subVisa;
  const catLabel  = VISA_CATEGORIES.find((c) => c.id === category)?.label || category;

  const inputCls = 'block w-full rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-[14px] outline-none focus:border-[hsl(var(--blue-700))] bg-white';

  const pillCls = (active) =>
    `cursor-pointer rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
      active
        ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))] text-white font-bold'
        : 'border-[hsl(var(--border))] text-muted-foreground hover:border-[hsl(var(--blue-200))]'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[20px] font-bold text-[hsl(var(--blue-900))]">Applicant Details</h2>
        <p className="text-[14px] text-muted-foreground mt-1">We'll create your profile and assign a consultant within 24 hours.</p>
      </div>

      {/* Applicant form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { key: 'name',            label: 'Full Name *',          placeholder: 'As on passport', type: 'text' },
          { key: 'email',           label: 'Email Address *',      placeholder: 'you@example.com', type: 'email' },
          { key: 'phone',           label: 'WhatsApp / Phone',     placeholder: '+91 9XXXXXXXXX', type: 'tel' },
          { key: 'dob',             label: 'Date of Birth',        placeholder: '', type: 'date' },
          { key: 'passport',        label: 'Passport Number',      placeholder: 'A1234567', type: 'text' },
          { key: 'passport_expiry', label: 'Passport Expiry Date', placeholder: '', type: 'date' },
        ].map(({ key, label, placeholder, type }) => (
          <div key={key}>
            <label className="block text-[12px] font-bold text-[hsl(var(--blue-900))] mb-1">{label}</label>
            <input
              type={type}
              placeholder={placeholder}
              value={applicant[key] || ''}
              onChange={(e) => onChange(key, e.target.value)}
              className={inputCls}
            />
          </div>
        ))}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-[13px] font-bold text-[hsl(var(--blue-900))] mb-1">Preferred contact method</legend>
        <div className="flex flex-wrap gap-2">
          {['WhatsApp', 'Email', 'Phone call', 'In-person (Hyderabad)'].map((opt) => (
            <label key={opt} className={pillCls(applicant.contact_pref === opt)}>
              <input type="radio" className="sr-only" onChange={() => onChange('contact_pref', opt)} />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Summary */}
      <div className="rounded-xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
        <div className="p-4 flex gap-3">
          <Globe size={16} className="text-[hsl(var(--blue-700))] shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Visa Type</p>
            <p className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{catLabel} → {visaLabel}</p>
          </div>
        </div>
        <div className="p-4 flex gap-3">
          <FileText size={16} className="text-[hsl(var(--blue-700))] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Documents</p>
            <p className="text-[14px] font-bold text-[hsl(var(--blue-900))]">
              {checkedDocs.size} of {allOfficial.length + customDocs.length} checked
            </p>
            {missingMandatory.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                <p className="text-[11px] font-bold text-red-600">{missingMandatory.length} mandatory doc(s) still needed:</p>
                {missingMandatory.slice(0, 4).map((d) => (
                  <p key={d.id} className="text-[11px] text-red-600">• {d.label}</p>
                ))}
                {missingMandatory.length > 4 && (
                  <p className="text-[11px] text-red-600">…and {missingMandatory.length - 4} more</p>
                )}
              </div>
            )}
          </div>
        </div>
        {helpNeeded.size > 0 && (
          <div className="p-4 flex gap-3">
            <Users size={16} className="text-[hsl(var(--blue-700))] shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Assistance Requested</p>
              {[...helpNeeded].map((h) => (
                <p key={h} className="text-[12px] text-[hsl(var(--blue-900))]">• {h}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {missingMandatory.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-2">
          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[13px] text-amber-800">
            <strong>{missingMandatory.length} mandatory document(s)</strong> still unchecked. Your consultant will help you collect these.
          </p>
        </div>
      )}

      {/* Next steps */}
      <div className="rounded-xl border border-[hsl(var(--blue-200))] bg-[hsl(var(--blue-50))] p-4 space-y-2">
        <p className="text-[13px] font-bold text-[hsl(var(--blue-900))]">What happens after you submit?</p>
        {[
          'Profile assigned to a WeHive consultant within 24 hours.',
          'Personalised checklist with exact document templates sent to your email.',
          'Assistance partners (CA, coaching, loan) contacted based on your selections.',
          'Track your application in real-time from your Account dashboard.',
        ].map((step, i) => (
          <div key={i} className="flex gap-2">
            <CheckCircle2 size={13} className="text-[hsl(var(--blue-700))] shrink-0 mt-0.5" />
            <p className="text-[12px] text-[hsl(var(--blue-900))]">{step}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onSubmit}
        disabled={loading || !applicant.name?.trim() || !applicant.email?.trim()}
        className="w-full btn-primary flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-bold disabled:opacity-50"
      >
        {loading ? (
          <span className="animate-spin w-4 h-4 rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <><UserPlus size={18} /> Create My Applicant Profile</>
        )}
      </button>
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

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

// ── Main Page ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;
const STEP_TITLES = ['Visa Type', 'Sub-category', 'Your Profile', 'Documents', 'Confirm & Submit'];
let _customDocId = 0;

export default function ApplicantFlow() {
  const { user }   = useAuth();
  const { toast }  = useToast();

  const [step, setStep]         = useState(1);
  const [category, setCategory] = useState('');
  const [subVisa, setSubVisa]   = useState('');
  const [profile, setProfile]   = useState({});
  const [checkedDocs, setCheckedDocs] = useState(new Set());
  const [customDocs, setCustomDocs]   = useState([]);
  const [helpNeeded, setHelpNeeded]   = useState(new Set());
  const [applicant, setApplicant] = useState({
    name: user?.name || '', email: user?.email || '', phone: user?.phone || '',
    dob: '', passport: '', passport_expiry: '', contact_pref: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);

  const updateProfile   = (k, v) => setProfile((p) => ({ ...p, [k]: v }));
  const updateApplicant = (k, v) => setApplicant((a) => ({ ...a, [k]: v }));

  const toggleDoc = (id) =>
    setCheckedDocs((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleHelp = (item) =>
    setHelpNeeded((s) => { const n = new Set(s); n.has(item) ? n.delete(item) : n.add(item); return n; });

  const addCustomDoc = (doc) => {
    const id = `custom_${_customDocId++}`;
    setCustomDocs((d) => [...d, { ...doc, id }]);
    setCheckedDocs((s) => { const n = new Set(s); n.add(id); return n; });
  };

  const removeCustomDoc = (id) => {
    setCustomDocs((d) => d.filter((x) => x.id !== id));
    setCheckedDocs((s) => { const n = new Set(s); n.delete(id); return n; });
  };

  const canNext = () => {
    if (step === 1) return !!category;
    if (step === 2) return !!subVisa;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    const visaDocs    = VISA_DOCS[subVisa] || VISA_DOCS_DEFAULT;
    const allOfficial = visaDocs.sections.flatMap((s) => s.docs);
    const missing     = allOfficial.filter((d) => d.mandatory && !checkedDocs.has(d.id)).map((d) => d.label);
    const allSubs     = [...STUDENT_VISAS, ...WORK_VISAS, ...PR_PATHWAYS, ...TOURIST_VISAS];
    const visaLabel   = allSubs.find((v) => v.id === subVisa)?.label || subVisa;
    const catLabel    = VISA_CATEGORIES.find((c) => c.id === category)?.label || category;

    const customDocList = customDocs.map((d) => `${d.name} (${d.category})${d.remarks ? `: ${d.remarks}` : ''}`).join(', ');
    const helpList      = [...helpNeeded].join(', ');

    const message = [
      `Applicant Flow — ${catLabel} → ${visaLabel}`,
      profile.degree     && `Degree: ${profile.degree}`,
      profile.language   && `Language: ${profile.language}`,
      profile.gre        && `GRE/GMAT: ${profile.gre}${profile.gre_score ? ` (${profile.gre_score})` : ''}`,
      profile.funding    && `Funding: ${profile.funding}`,
      profile.employment && `Employment: ${profile.employment}`,
      `Docs checked: ${checkedDocs.size} of ${allOfficial.length + customDocs.length}`,
      missing.length ? `Missing mandatory: ${missing.join('; ')}` : 'All mandatory docs checked',
      customDocList && `Custom docs: ${customDocList}`,
      helpList && `Needs help with: ${helpList}`,
      applicant.phone && `Phone: ${applicant.phone}`,
      applicant.contact_pref && `Contact pref: ${applicant.contact_pref}`,
    ].filter(Boolean).join('\n');

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
              A WeHive consultant will contact you within 24 hours at <strong>{applicant.email}</strong>.
            </p>
            <div className="space-y-2 text-left mb-6">
              {['Personalised document checklist sent to your email.', 'Assistance arranged for items you flagged.', 'Track your application from your Account dashboard.'].map((item, i) => (
                <div key={i} className="flex gap-2">
                  <Sparkles size={13} className="text-[hsl(var(--blue-700))] shrink-0 mt-0.5" />
                  <p className="text-[13px] text-[hsl(var(--blue-900))]">{item}</p>
                </div>
              ))}
            </div>
            <a href="/account" className="btn-primary w-full py-3 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2">
              Go to My Account
            </a>
          </motion.div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[hsl(var(--soft-bg))] px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--blue-200))] bg-white px-4 py-1.5 text-[12px] font-bold text-[hsl(var(--blue-700))] mb-3">
              <Sparkles size={13} /> Guided Applicant Flow
            </div>
            <h1 className="text-[28px] font-bold text-[hsl(var(--blue-900))]">Start Your Visa Journey</h1>
            <p className="text-[14px] text-muted-foreground mt-2 max-w-lg mx-auto">
              Select your visa type and get a complete, accurate document checklist based on official requirements.
            </p>
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-bold text-[hsl(var(--blue-700))] uppercase tracking-wide">
              Step {step}: {STEP_TITLES[step - 1]}
            </p>
          </div>
          <ProgressBar step={step} total={TOTAL_STEPS} />

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
                  <StepDocuments
                    subVisa={subVisa}
                    checkedDocs={checkedDocs}
                    onToggle={toggleDoc}
                    customDocs={customDocs}
                    onAddCustom={addCustomDoc}
                    onRemoveCustom={removeCustomDoc}
                    helpNeeded={helpNeeded}
                    onToggleHelp={toggleHelp}
                  />
                )}
                {step === 5 && (
                  <StepApplicantAndSummary
                    category={category} subVisa={subVisa} profile={profile}
                    applicant={applicant} onChange={updateApplicant}
                    checkedDocs={checkedDocs} customDocs={customDocs}
                    helpNeeded={helpNeeded}
                    onSubmit={handleSubmit} loading={loading}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[hsl(var(--border))]">
              <button
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 1}
                className="flex items-center gap-2 text-[14px] font-semibold text-muted-foreground hover:text-[hsl(var(--blue-900))] disabled:opacity-30"
              >
                <ArrowLeft size={16} /> Back
              </button>
              {step < TOTAL_STEPS && (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canNext()}
                  className="flex items-center gap-2 btn-primary px-6 py-2.5 rounded-xl text-[14px] font-bold disabled:opacity-40"
                >
                  Continue <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

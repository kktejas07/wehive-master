import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Globe, Shield, FileText, CheckSquare, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const GUIDES = [
  {
    id: 'ca',
    country: 'Canada',
    flag: '',
    topics: [
      { title: 'Student Visa (Study Permit) Overview', type: 'guide', content: 'A study permit is required for any course longer than 6 months. Apply online or at the port of entry. Processing times average 8–12 weeks.' },
      { title: 'GIC & Proof of Funds', type: 'checklist', items: ['CAD $10,200 in a GIC', 'First year tuition paid or demonstrated', 'Funds for family members if accompanying', 'Source of funds documentation'] },
      { title: 'PGWP — Post Graduate Work Permit', type: 'guide', content: 'Graduates of eligible programs get an open work permit for up to 3 years. Program must be at a DLI and at least 8 months long. Apply within 180 days of receiving final marks.' },
      { title: 'IELTS / TOEFL Requirements', type: 'table', rows: [['Undergraduate', '6.0 overall, no band < 5.5'], ['Postgraduate', '6.5 overall, no band < 6.0'], ['Some programs', '7.0+ required']] },
      { title: 'Common Rejection Reasons', type: 'checklist', items: ['Weak ties to home country', 'Insufficient funds', 'Incomplete application', 'No study plan / intent letter', 'Prior refusal not disclosed'] },
    ],
  },
  {
    id: 'uk',
    country: 'United Kingdom',
    flag: '',
    topics: [
      { title: 'Student Visa (formerly Tier 4)', type: 'guide', content: 'Apply up to 6 months before your course starts. You need a Confirmation of Acceptance for Studies (CAS) from your university. Biometrics required at a visa centre.' },
      { title: 'Maintenance Funds Required', type: 'table', rows: [['London universities', '£1,334/month up to 9 months'], ['Outside London', '£1,023/month up to 9 months'], ['Funds must be held', '28+ consecutive days before applying']] },
      { title: 'Graduate Route Visa', type: 'guide', content: 'Allows 2 years (3 for PhD) of post-study work. No job offer required. Apply within the UK before your student visa expires.' },
      { title: 'ATAS Certificate', type: 'guide', content: 'Required for certain sensitive research subjects at postgraduate level. Can take 4–6 weeks — apply early.' },
    ],
  },
  {
    id: 'au',
    country: 'Australia',
    flag: '',
    topics: [
      { title: 'Student Visa (Subclass 500)', type: 'guide', content: 'Apply online via ImmiAccount. Usually granted for the full duration of your course. Must maintain satisfactory progress and attendance.' },
      { title: 'GTE — Genuine Temporary Entrant', type: 'guide', content: 'Officers assess whether you genuinely intend to study and return home. Address home country ties, study history, and study plan clearly in the GTE statement.' },
      { title: 'OSHC Health Cover', type: 'guide', content: 'Overseas Student Health Cover is mandatory for the full visa period. Major providers: Medibank, Allianz, Bupa, NIB. Cost ~AUD $600–700/year.' },
      { title: 'Post-Study Work Stream (485)', type: 'table', rows: [['Bachelor/Masters by coursework', '2 years'], ['Masters by research', '3 years'], ['PhD', '4 years'], ['In regional areas', '+1 year extra']] },
    ],
  },
  {
    id: 'de',
    country: 'Germany',
    flag: '',
    topics: [
      { title: 'Student Visa Process', type: 'guide', content: 'Apply at the German embassy in your home country. After arrival, apply for a residence permit at the Ausländerbehörde within 90 days.' },
      { title: 'Blocked Bank Account (Sperrkonto)', type: 'guide', content: 'Required proof of funds. Deposit at least €11,208/year in a blocked account (Coracle, Expatrio, Deutsche Bank). Released in monthly instalments of ~€934.' },
      { title: 'German A1/B1 Language', type: 'guide', content: 'Required for non-English programs. English-medium programs still benefit from A1 knowledge for daily life.' },
      { title: 'Post-Study Work', type: 'guide', content: '18 months to find a job in your field. After employment: EU Blue Card if salary > €58,400/year. Permanent residence after 2 years with Blue Card.' },
    ],
  },
  {
    id: 'ie',
    country: 'Ireland',
    flag: '',
    topics: [
      { title: 'Study Visa (D Visa)', type: 'guide', content: 'Required for courses over 90 days. Apply online at AVATS. IRP registration required within 90 days of arrival.' },
      { title: 'Financial Requirements', type: 'table', rows: [['Proof of funds', '€7,000 per year minimum'], ['Tuition', 'Must be paid in full before visa'], ['Repatriation', '€2,000 return flight funds']] },
      { title: 'Third Level Graduate Scheme', type: 'guide', content: 'Level 8 degree: 12 months to find work. Level 9/10: 24 months. Must apply before current permission expires.' },
    ],
  },
  {
    id: 'compliance',
    country: 'Compliance & Ethics',
    flag: '',
    topics: [
      { title: 'Agent Code of Conduct', type: 'checklist', items: ['Never misrepresent university programs or costs', 'Disclose all fees charged to students', 'Keep copies of all application documents', 'Never forge or alter documents', 'Report concerns to the institution'] },
      { title: 'ESOS / Registered Agents', type: 'guide', content: 'In Australia, agents must be registered on the Australian Education International (AEI) PRISMS system. In the UK, universities maintain their own approved agent lists. Always verify your registration status.' },
      { title: 'Red Flags to Watch For', type: 'checklist', items: ['Students providing inconsistent employment details', 'Financial documents that look altered', 'Students not meeting minimum language scores', 'Requests to submit documents you haven\'t verified', 'Students who can\'t explain their study choice'] },
    ],
  },
];

const TYPE_LABELS = { guide: 'Guide', checklist: 'Checklist', table: 'Reference' };

function TopicCard({ topic }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-white border border-border overflow-hidden">
      <button onClick={() => setOpen(v => !v)} aria-expanded={open} className="w-full min-h-[48px] flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[hsl(var(--soft-bg))] transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[12px] font-semibold rounded-full px-2 py-0.5 shrink-0 bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))]">
            {TYPE_LABELS[topic.type]}
          </span>
          <span className="font-semibold text-[14px] text-[hsl(var(--blue-900))]">{topic.title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4">
          {topic.type === 'guide' && <p className="text-[14px] text-muted-foreground leading-relaxed">{topic.content}</p>}
          {topic.type === 'checklist' && (
            <ul className="space-y-1.5">
              {topic.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[14px] text-[hsl(var(--blue-900))]">
                  <CheckSquare className="w-4 h-4 text-[hsl(var(--blue-700))] mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          )}
          {topic.type === 'table' && (
            <table className="w-full text-[14px]">
              <tbody>
                {topic.rows.map(([k, v], i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="text-muted-foreground font-semibold py-2 pr-4 w-[45%] align-top">{k}</td>
                    <td className="text-[hsl(var(--blue-900))] py-2">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function CountrySection({ guide }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
      <button onClick={() => setOpen(v => !v)} aria-expanded={open} className="w-full flex items-center gap-4 px-4 sm:px-5 py-4 hover:bg-[hsl(var(--soft-bg))] transition-colors text-left">
        <span className="h-10 w-10 shrink-0 rounded-xl bg-[hsl(var(--blue-50))] inline-flex items-center justify-center text-2xl">{guide.flag || <Shield className="w-5 h-5 text-[hsl(var(--blue-700))]" />}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[16px] text-[hsl(var(--blue-900))]">{guide.country}</div>
          <div className="text-[13px] text-muted-foreground">{guide.topics.length} topics</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex text-[12px] font-semibold rounded-full px-2.5 py-0.5 bg-slate-100 text-slate-700">
            {guide.id === 'compliance' ? 'All markets' : 'Country guide'}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-border bg-[hsl(var(--soft-bg))] p-3 sm:p-4 space-y-2">
          {guide.topics.map((t, i) => <TopicCard key={i} topic={t} />)}
        </div>
      )}
    </motion.div>
  );
}

export default function AgentTraining() {
  return (
    <div className="min-h-screen bg-[hsl(var(--soft-bg))]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16 md:pb-24">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="mb-8 sm:mb-10">
          <div className="text-[12px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--blue-700))] mb-3 flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" /> Agent Knowledge Base
          </div>
          <h1 className="font-display font-bold text-[32px] sm:text-[44px] leading-[1.1] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
            Training & Compliance Hub
          </h1>
          <p className="mt-3 text-[16px] text-muted-foreground max-w-xl">
            Country-specific visa guides, compliance standards, and application best practices — everything an agent needs to succeed.
          </p>
        </motion.div>
        <div className="space-y-3">
          {GUIDES.map(g => <CountrySection key={g.id} guide={g} />)}
        </div>
      </div>
      <Footer />
    </div>
  );
}

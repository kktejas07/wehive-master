import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Globe, Clock, ChevronDown, ChevronUp, Info } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const INTAKES = [
  {
    country: 'Canada',
    flag: '🇨🇦',
    color: '#ef4444',
    intakes: [
      { name: 'Winter / January', months: 'Jan–Apr', apply_start: 'Sep', apply_end: 'Nov', popular: false },
      { name: 'Summer / May', months: 'May–Aug', apply_start: 'Feb', apply_end: 'Mar', popular: false },
      { name: 'Fall / September', months: 'Sep–Dec', apply_start: 'Jan', apply_end: 'Jun', popular: true },
    ],
    notes: 'Fall is the primary intake. Most universities open applications 6–9 months in advance.',
  },
  {
    country: 'United Kingdom',
    flag: '🇬🇧',
    color: '#3b82f6',
    intakes: [
      { name: 'January', months: 'Jan–Jun', apply_start: 'Aug', apply_end: 'Nov', popular: false },
      { name: 'September / October', months: 'Sep–Dec', apply_start: 'Oct (prev yr)', apply_end: 'Jun', popular: true },
    ],
    notes: 'Apply via UCAS for undergraduate. Postgraduate applications go directly to universities.',
  },
  {
    country: 'Australia',
    flag: '🇦🇺',
    color: '#f59e0b',
    intakes: [
      { name: 'Semester 1 / February', months: 'Feb–Jun', apply_start: 'Sep', apply_end: 'Nov', popular: true },
      { name: 'Semester 2 / July', months: 'Jul–Nov', apply_start: 'Feb', apply_end: 'Apr', popular: true },
    ],
    notes: 'Most universities offer two intakes. July is nearly as popular as February.',
  },
  {
    country: 'Germany',
    flag: '🇩🇪',
    color: '#f59e0b',
    intakes: [
      { name: 'Winter Semester / October', months: 'Oct–Mar', apply_start: 'Apr', apply_end: 'Jul', popular: true },
      { name: 'Summer Semester / April', months: 'Apr–Sep', apply_start: 'Nov', apply_end: 'Jan', popular: false },
    ],
    notes: 'Winter semester is primary. German university fees are minimal — only admin fees apply at most public universities.',
  },
  {
    country: 'USA',
    flag: '🇺🇸',
    color: '#6366f1',
    intakes: [
      { name: 'Spring / January', months: 'Jan–May', apply_start: 'Aug', apply_end: 'Nov', popular: false },
      { name: 'Fall / August', months: 'Aug–Dec', apply_start: 'Oct (prev yr)', apply_end: 'Jan', popular: true },
    ],
    notes: 'Fall is the primary intake. Start GRE/GMAT prep at least 8 months early.',
  },
  {
    country: 'Ireland',
    flag: '🇮🇪',
    color: '#22c55e',
    intakes: [
      { name: 'September / October', months: 'Sep–Jun', apply_start: 'Feb', apply_end: 'Jul', popular: true },
    ],
    notes: 'Most courses are annual. Apply through PAC for undergrad; direct for postgrad.',
  },
  {
    country: 'New Zealand',
    flag: '🇳🇿',
    color: '#14b8a6',
    intakes: [
      { name: 'Semester 1 / February', months: 'Feb–Jun', apply_start: 'Oct', apply_end: 'Dec', popular: true },
      { name: 'Semester 2 / July', months: 'Jul–Nov', apply_start: 'Apr', apply_end: 'May', popular: false },
    ],
    notes: 'February intake is the main one. Post-study work visa (3 years) is a major draw.',
  },
  {
    country: 'France',
    flag: '🇫🇷',
    color: '#ec4899',
    intakes: [
      { name: 'September / October', months: 'Sep–Jun', apply_start: 'Jan', apply_end: 'Jun', popular: true },
    ],
    notes: 'Apply via Campus France. Most programs taught in French; English-medium programs available at grandes écoles.',
  },
  {
    country: 'Netherlands',
    flag: '🇳🇱',
    color: '#f97316',
    intakes: [
      { name: 'September', months: 'Sep–Aug', apply_start: 'Oct (prev yr)', apply_end: 'Apr', popular: true },
      { name: 'February (select programs)', months: 'Feb–Jan', apply_start: 'Nov', apply_end: 'Dec', popular: false },
    ],
    notes: 'Numerus fixus applies to competitive programs — apply early. Most programs are in English.',
  },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function MonthBar({ applyStart, applyEnd, months, color }) {
  const startIdx = MONTHS.findIndex(m => applyStart?.startsWith(m));
  const endIdx = MONTHS.findIndex(m => applyEnd?.startsWith(m));

  return (
    <div className="mt-2">
      <div className="text-[10px] text-[hsl(var(--blue-900))]/50 font-bold uppercase tracking-[0.12em] mb-1">Application window</div>
      <div className="grid grid-cols-12 gap-0.5">
        {MONTHS.map((m, i) => {
          const inWindow = startIdx !== -1 && endIdx !== -1
            ? (startIdx <= endIdx ? i >= startIdx && i <= endIdx : i >= startIdx || i <= endIdx)
            : false;
          return (
            <div key={m} title={m}
              className={`h-4 rounded-sm text-[7px] flex items-center justify-center font-bold transition-colors ${inWindow ? 'text-white' : 'bg-black/5 text-[hsl(var(--blue-900))]/50'}`}
              style={inWindow ? { background: color } : {}}>
              {m[0]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CountryCard({ data }) {
  const [open, setOpen] = useState(false);
  const panelId = `intake-panel-${data.country.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className="rounded-2xl bg-white border border-black/5 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-black/[0.02] transition text-left">
        <span className="text-3xl shrink-0">{data.flag || <Globe className="w-7 h-7 text-[hsl(var(--blue-900))]/40" />}</span>
        <div className="flex-1">
          <div className="font-bold text-[16px] text-[hsl(var(--blue-900))]">{data.country}</div>
          <div className="text-[12px] text-[hsl(var(--blue-900))]/55 mt-0.5">{data.intakes.length} intake{data.intakes.length > 1 ? 's' : ''} · {data.intakes.filter(i => i.popular).map(i => i.name).join(', ') || 'see details'}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold rounded-full px-2.5 py-0.5" style={{ background: `${data.color}15`, color: data.color }}>
            {data.intakes.filter(i => i.popular).length > 0 ? 'Active intakes' : 'Annual'}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-[hsl(var(--blue-900))]/40" /> : <ChevronDown className="w-4 h-4 text-[hsl(var(--blue-900))]/40" />}
        </div>
      </button>

      {open && (
        <div id={panelId} className="border-t border-black/5 px-5 py-4 space-y-4">
          {data.intakes.map((intake, i) => (
            <div key={i} className="rounded-xl bg-[hsl(var(--soft-bg))] p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[14px] text-[hsl(var(--blue-900))]">{intake.name}</span>
                {intake.popular && (
                  <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700">Most popular</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-[12.5px]">
                <div><span className="text-[hsl(var(--blue-900))]/50 font-bold">Classes:</span> <span className="text-[hsl(var(--blue-900))]/80">{intake.months}</span></div>
                <div><span className="text-[hsl(var(--blue-900))]/50 font-bold">Apply from:</span> <span className="text-[hsl(var(--blue-900))]/80">{intake.apply_start}</span></div>
                <div><span className="text-[hsl(var(--blue-900))]/50 font-bold">Deadline:</span> <span className="text-[hsl(var(--blue-900))]/80">{intake.apply_end}</span></div>
              </div>
              <MonthBar applyStart={intake.apply_start} applyEnd={intake.apply_end} months={intake.months} color={data.color} />
            </div>
          ))}
          {data.notes && (
            <div className="flex items-start gap-2.5 rounded-xl bg-[hsl(var(--soft-bg))] px-4 py-3">
              <Info className="w-4 h-4 text-[hsl(var(--blue-900))]/40 mt-0.5 shrink-0" />
              <p className="text-[13px] text-[hsl(var(--blue-900))]/70 leading-relaxed">{data.notes}</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function IntakeCalendar() {
  const now = new Date();
  const currentMonth = MONTHS[now.getMonth()];

  return (
    <div className="min-h-screen bg-white text-[hsl(var(--blue-900))]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-5 pt-28 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-[hsl(var(--accent))] mb-3 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Intake Guide
          </div>
          <h1 className="font-display font-extrabold text-[38px] sm:text-[52px] tracking-[-0.03em] text-[hsl(var(--blue-900))] leading-[1.05]">
            University Intake<br />Calendar
          </h1>
          <p className="mt-4 text-[16px] text-[hsl(var(--blue-900))]/60 max-w-xl">
            Know exactly when to apply for each country — application windows, deadlines, and popular intakes at a glance.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--soft-bg))] border border-black/5 px-4 py-2 text-[12.5px] text-[hsl(var(--blue-900))]/70">
            <Clock className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
            Current month: <strong className="text-[hsl(var(--blue-900))]">{currentMonth} {now.getFullYear()}</strong>
          </div>
        </motion.div>

        <div className="space-y-3">
          {INTAKES.map(d => <CountryCard key={d.country} data={d} />)}
        </div>
      </div>
      <Footer />
    </div>
  );
}

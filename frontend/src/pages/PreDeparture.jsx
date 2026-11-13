import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Reveal from '../components/Reveal';
import {
  ChevronLeft, Check, Circle, Plane, Home, CreditCard, Heart,
  Phone, FileText, Globe, ShieldCheck, Luggage, GraduationCap,
  MapPin, BookOpen,
} from 'lucide-react';

const PHASES = [
  {
    id: 'visa-approved',
    title: 'Visa Approved',
    icon: ShieldCheck,
    color: 'emerald',
    items: [
      { id: 'v1', text: 'Collect visa / download e-visa', critical: true },
      { id: 'v2', text: 'Verify visa sticker details (name, dates, type)' },
      { id: 'v3', text: 'Make 2 photocopies of visa + passport bio page' },
      { id: 'v4', text: 'Scan and store copies in cloud (Google Drive / iCloud)' },
      { id: 'v5', text: 'Share visa copy with parents or emergency contact' },
    ],
  },
  {
    id: 'travel-booking',
    title: 'Travel & Booking',
    icon: Plane,
    color: 'blue',
    items: [
      { id: 't1', text: 'Book one-way or return flights', critical: true },
      { id: 't2', text: 'Confirm baggage allowance (usually 2 × 23 kg for students)' },
      { id: 't3', text: 'Book airport pickup / transfer from university or host' },
      { id: 't4', text: 'Reserve temporary accommodation for first 1-2 weeks' },
      { id: 't5', text: 'Apply for on-campus or off-campus housing', critical: true },
      { id: 't6', text: 'Purchase travel insurance covering first 90 days' },
    ],
  },
  {
    id: 'finances',
    title: 'Finances & Banking',
    icon: CreditCard,
    color: 'amber',
    items: [
      { id: 'f1', text: 'Open forex card (Niyo / BookMyForex / Wise)', critical: true },
      { id: 'f2', text: 'Transfer tuition fee deposit to university' },
      { id: 'f3', text: 'Carry emergency cash ($200-500 in local currency)' },
      { id: 'f4', text: 'Inform your Indian bank about international travel' },
      { id: 'f5', text: 'Download mobile banking apps (Revolut, Wise, local bank)' },
      { id: 'f6', text: 'Set up UPI international if available' },
      { id: 'f7', text: 'Check education loan disbursement schedule' },
    ],
  },
  {
    id: 'health',
    title: 'Health & Insurance',
    icon: Heart,
    color: 'red',
    items: [
      { id: 'h1', text: 'Get required vaccinations (check country requirements)', critical: true },
      { id: 'h2', text: 'Collect medical records and prescriptions' },
      { id: 'h3', text: 'Stock 3-month supply of regular medications' },
      { id: 'h4', text: 'Carry prescription letter from doctor (in English)' },
      { id: 'h5', text: 'Enrol in university health insurance or OSHC/NHS' },
      { id: 'h6', text: 'Get dental and eye check-up before departure' },
      { id: 'h7', text: 'Download local emergency numbers and hospital app' },
    ],
  },
  {
    id: 'documents',
    title: 'Documents',
    icon: FileText,
    color: 'purple',
    items: [
      { id: 'd1', text: 'University admission letter (original + copies)', critical: true },
      { id: 'd2', text: 'I-20 / CAS / CoE / admission confirmation', critical: true },
      { id: 'd3', text: 'SEVIS fee receipt (US) / IHS payment (UK)' },
      { id: 'd4', text: 'Academic transcripts (original, sealed envelope)' },
      { id: 'd5', text: 'Passport-size photos (20 copies, white background)' },
      { id: 'd6', text: 'Proof of accommodation' },
      { id: 'd7', text: 'Proof of financial support / bank statements' },
      { id: 'd8', text: 'SOP and LOR copies' },
      { id: 'd9', text: 'International driving permit (if needed)' },
    ],
  },
  {
    id: 'registration',
    title: 'Registration & SIM',
    icon: Globe,
    color: 'teal',
    items: [
      { id: 'r1', text: 'Register with Indian embassy (MEA portal)' },
      { id: 'r2', text: 'Get international SIM or eSIM (Airalo / local provider)' },
      { id: 'r3', text: 'Set up WhatsApp / Telegram on new number' },
      { id: 'r4', text: 'Complete university online pre-registration' },
      { id: 'r5', text: 'Join university student groups (WhatsApp / Discord)' },
      { id: 'r6', text: 'FRRO / police registration within 14 days of arrival (some countries)' },
      { id: 'r7', text: 'Open local bank account within first week' },
    ],
  },
  {
    id: 'packing',
    title: 'Packing Essentials',
    icon: Luggage,
    color: 'orange',
    items: [
      { id: 'p1', text: 'Universal power adapter + extension board' },
      { id: 'p2', text: 'Laptop + charger + backup drive' },
      { id: 'p3', text: 'Weather-appropriate clothing (check destination forecast)' },
      { id: 'p4', text: 'Bedding set for first night (if not provided by uni)' },
      { id: 'p5', text: 'Basic toiletries for first 3 days' },
      { id: 'p6', text: 'Indian spices and snacks (within customs limits)' },
      { id: 'p7', text: 'Pressure cooker (small, for student cooking)' },
      { id: 'p8', text: 'Emergency kit: torch, multi-tool, first-aid' },
    ],
  },
  {
    id: 'first-week',
    title: 'First Week Abroad',
    icon: MapPin,
    color: 'indigo',
    items: [
      { id: 'w1', text: 'Attend university orientation', critical: true },
      { id: 'w2', text: 'Collect student ID card' },
      { id: 'w3', text: 'Set up local bank account' },
      { id: 'w4', text: 'Get local SIM / phone plan' },
      { id: 'w5', text: 'Register at local government office (if required)' },
      { id: 'w6', text: 'Explore campus: library, gym, student services' },
      { id: 'w7', text: 'Locate nearest grocery store, pharmacy, hospital' },
      { id: 'w8', text: 'Sign up for student discount cards (ISIC, local transit)' },
      { id: 'w9', text: 'Introduce yourself to neighbours and classmates' },
    ],
  },
];

function CheckItem({ item, checked, onToggle }) {
  return (
    <li
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
      className={`flex items-start gap-3 rounded-xl px-4 py-3 cursor-pointer transition-all duration-200 ${
        checked
          ? 'bg-emerald-50 border border-emerald-200'
          : 'bg-white border border-[hsl(var(--border))] hover:border-[hsl(var(--blue-300))]'
      }`}
    >
      <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md shrink-0 ${
        checked ? 'bg-emerald-500 text-white' : 'border-2 border-[hsl(var(--border))]'
      }`}>
        {checked && <Check className="w-3 h-3" />}
      </span>
      <span className={`text-[14px] ${checked ? 'text-emerald-700 line-through' : 'text-[hsl(var(--blue-900))]'}`}>
        {item.text}
        {item.critical && !checked && (
          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
            Required
          </span>
        )}
      </span>
    </li>
  );
}

export default function PreDeparture() {
  const [checked, setChecked] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('wehive-predeparture') || '{}');
    } catch { return {}; }
  });

  const toggle = (id) => {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('wehive-predeparture', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const allItems = PHASES.flatMap(p => p.items);
  const totalChecked = allItems.filter(i => checked[i.id]).length;
  const totalItems = allItems.length;
  const pct = totalItems ? Math.round((totalChecked / totalItems) * 100) : 0;

  return (
    <div className="bg-[hsl(var(--soft-bg))] min-h-screen">
      <Navbar />
      <main className="pt-24 sm:pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Reveal>
            <Link to="/account" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-[hsl(var(--blue-700))] mb-4">
              <ChevronLeft className="w-4 h-4" /> Back to account
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--blue-700))]/10">
                <Plane className="w-5 h-5 text-[hsl(var(--blue-700))]" />
              </div>
              <h1 className="font-display font-bold text-[28px] sm:text-[34px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
                Pre-Departure Checklist
              </h1>
            </div>
            <p className="text-[15px] text-muted-foreground mb-6 max-w-2xl">
              Everything you need to do between visa approval and your first week abroad. Check items off as you complete them — progress is saved locally.
            </p>
          </Reveal>

          {/* Progress bar */}
          <div className="rounded-2xl bg-white border border-[hsl(var(--border))] p-5 mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{totalChecked} of {totalItems} completed</span>
              <span className="text-[14px] font-bold text-[hsl(var(--blue-700))]">{pct}%</span>
            </div>
            <div className="h-3 rounded-full bg-[hsl(var(--blue-50))] overflow-hidden">
              <div
                className="h-full rounded-full bg-[hsl(var(--blue-700))] transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {pct === 100 && (
              <div className="mt-3 text-[14px] font-semibold text-emerald-600 flex items-center gap-2">
                <Check className="w-4 h-4" /> You're all set! Have a great journey!
              </div>
            )}
          </div>

          {/* Phases */}
          <div className="space-y-8">
            {PHASES.map((phase) => {
              const phaseChecked = phase.items.filter(i => checked[i.id]).length;
              const phaseTotal = phase.items.length;
              const Icon = phase.icon;
              return (
                <Reveal key={phase.id}>
                  <div className="rounded-2xl bg-white border border-[hsl(var(--border))] p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--blue-700))]/10">
                          <Icon className="w-4.5 h-4.5 text-[hsl(var(--blue-700))]" />
                        </div>
                        <h2 className="font-display font-bold text-[18px] text-[hsl(var(--blue-900))]">{phase.title}</h2>
                      </div>
                      <span className={`text-[13px] font-bold ${phaseChecked === phaseTotal ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {phaseChecked}/{phaseTotal}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {phase.items.map(item => (
                        <CheckItem
                          key={item.id}
                          item={item}
                          checked={!!checked[item.id]}
                          onToggle={() => toggle(item.id)}
                        />
                      ))}
                    </ul>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

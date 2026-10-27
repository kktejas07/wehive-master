import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth, API } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  CheckCircle2, Shield, Wifi, Plane, Hotel,
  CheckSquare, Square, ArrowLeft, Loader2,
  CreditCard, Globe, ExternalLink, ChevronRight,
} from 'lucide-react';

// ── Checklist data ────────────────────────────────────────────────────────────
const CHECKLIST_GROUPS = [
  {
    group: 'Documents & Travel',
    items: [
      'Passport validity checked (min 6 months beyond stay)',
      'Visa stamp / e-visa downloaded and printed',
      'Travel insurance purchased',
      'Accommodation booked for first week',
      'Flight tickets confirmed',
      'International driving permit (if driving)',
    ],
  },
  {
    group: 'Money & Banking',
    items: [
      'Zero-forex credit / debit card obtained',
      'Forex / currency exchanged for first few days',
      'Informed home bank about travel dates',
      'Emergency cash reserve set aside',
    ],
  },
  {
    group: 'Health & Safety',
    items: [
      'Required vaccinations completed',
      'Travel health insurance covers medical emergencies',
      'Emergency contacts saved offline',
      'Country-specific emergency numbers noted',
    ],
  },
  {
    group: 'Communication',
    items: [
      'International SIM or eSIM activated',
      'Local WhatsApp / calling apps downloaded',
      'Hotel / host notified of arrival time',
    ],
  },
];

const ALL_ITEMS = CHECKLIST_GROUPS.flatMap((g) => g.items);

// ── Insurance cards ────────────────────────────────────────────────────────────
const INSURANCE_CARDS = [
  {
    name: 'Policybazaar',
    badge: 'Most Popular',
    bestFor: 'Indian travellers, INR pricing',
    covers: 'Medical, trip cancellation, baggage loss',
    from: '₹499 for 7 days',
    href: 'https://www.policybazaar.com/travel-insurance/',
    cta: 'Compare plans',
  },
  {
    name: 'Care Travel',
    badge: 'Senior-Friendly',
    bestFor: 'Senior-friendly, pre-existing conditions',
    covers: 'Medical emergencies up to $5L, evacuation',
    from: '₹799 for 7 days',
    href: 'https://www.careinsurance.com/travel-insurance.html',
    cta: 'Get quote',
  },
  {
    name: 'Coverfox',
    badge: 'Quick Buy',
    bestFor: 'Quick online purchase, price comparison',
    covers: 'Multi-trip annual plans available',
    from: '₹399 for 7 days',
    href: 'https://www.coverfox.com/travel-insurance/',
    cta: 'Compare & buy',
  },
];

// ── SIM cards ──────────────────────────────────────────────────────────────────
const SIM_CARDS = [
  {
    name: 'Airalo eSIM',
    badge: 'Recommended',
    desc: 'Works in 190+ countries. Buy online, activate instantly.',
    href: 'https://ref.airalo.com/GHR6',
    cta: 'Browse eSIMs',
  },
  {
    name: 'Jio International',
    desc: 'Best for India ↔ abroad roaming.',
    href: 'https://www.jio.com/en-in/international-roaming/',
    cta: 'Check packs',
  },
  {
    name: 'BSNL International',
    desc: 'Budget option for short trips.',
    href: 'https://www.bsnl.co.in/',
    cta: 'View plans',
  },
];

const FOREX_CARDS = [
  { name: 'Niyo Global', forex: '0%', atm: '₹0 domestic, 2% abroad', time: '15 min online', href: 'https://goniyo.com' },
  { name: 'HDFC Multi-currency', forex: '0–2%', atm: '₹110 per ATM', time: '3–5 days', href: 'https://www.hdfcbank.com' },
  { name: 'Wise Debit Card', forex: '0.45% avg', atm: 'Free up to £200/mo', time: '3–5 days', href: 'https://wise.com' },
  { name: 'Scapia (Federal Bank)', forex: '0%', atm: '0% internationally', time: '2–3 days', href: 'https://scapia.in' },
];

// ── Flight & accommodation links ───────────────────────────────────────────────
const FLIGHT_LINKS = [
  { name: 'Google Flights', desc: 'Compare all airlines', href: 'https://www.google.com/flights' },
  { name: 'Skyscanner', desc: 'Best for flexible dates', href: 'https://www.skyscanner.co.in' },
  { name: 'MakeMyTrip', desc: 'Indian-friendly payment methods', href: 'https://www.makemytrip.com/international-flights/' },
];

const STAY_LINKS = [
  { name: 'Booking.com', desc: 'Widest selection, free cancellation', href: 'https://www.booking.com' },
  { name: 'Hostelworld', desc: 'Best for student budgets', href: 'https://www.hostelworld.com' },
  { name: 'HousingAnywhere', desc: 'Long-term student housing (1 month+)', href: 'https://www.housinganywhere.com' },
  { name: 'Uniplaces', desc: 'Student-specific housing in Europe', href: 'https://www.uniplaces.com' },
];

// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'checklist',  label: 'Checklist',     Icon: CheckSquare },
  { id: 'insurance',  label: 'Insurance',     Icon: Shield },
  { id: 'sim-money',  label: 'SIM & Money',   Icon: Wifi },
  { id: 'flights',    label: 'Flights & Stays', Icon: Plane },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function storageKey(appId) {
  return `pah_checklist_${appId}`;
}

function loadChecked(appId) {
  try {
    const raw = localStorage.getItem(storageKey(appId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveChecked(appId, state) {
  try {
    localStorage.setItem(storageKey(appId), JSON.stringify(state));
  } catch {}
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ChecklistTab({ applicationId }) {
  const [checked, setChecked] = useState(() => loadChecked(applicationId));
  const total = ALL_ITEMS.length;
  const done = ALL_ITEMS.filter((item) => checked[item]).length;
  const pct = Math.round((done / total) * 100);

  const toggle = useCallback((item) => {
    setChecked((prev) => {
      const next = { ...prev, [item]: !prev[item] };
      saveChecked(applicationId, next);
      return next;
    });
  }, [applicationId]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-semibold text-[#1B2B5E]">{done} of {total} complete</span>
          <span className="text-[13px] font-semibold text-[#011CB5]">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-[#E8EDF8] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#011CB5] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        {done === total && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-[14px] font-semibold text-emerald-700">You're ready! Have a great trip.</span>
          </div>
        )}
      </div>

      {CHECKLIST_GROUPS.map((g) => (
        <div key={g.group}>
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-[#9CA3AF] mb-2">{g.group}</div>
          <div className="space-y-2">
            {g.items.map((item) => (
              <button
                key={item}
                onClick={() => toggle(item)}
                className="w-full flex items-center gap-3 rounded-xl bg-white border border-[#E8EDF8] hover:border-[#011CB5]/30 px-4 py-3 text-left transition"
              >
                {checked[item]
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  : <Square className="w-5 h-5 text-[#9CA3AF] shrink-0" />}
                <span className={`text-[14px] ${checked[item] ? 'line-through text-[#9CA3AF]' : 'text-[#1B2B5E]'}`}>
                  {item}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function InsuranceTab() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-[13px] text-amber-800">
        <strong>Note:</strong> Travel insurance is mandatory for Schengen visas and strongly recommended for all other destinations.
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {INSURANCE_CARDS.map((c) => (
          <div key={c.name} className="rounded-2xl bg-white border border-[#E8EDF8] p-5 flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="text-[16px] font-bold text-[#1B2B5E]">{c.name}</div>
              <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#011CB5]/10 text-[#011CB5]">{c.badge}</span>
            </div>
            <div className="text-[12px] text-[#9CA3AF] mb-1">Best for</div>
            <div className="text-[13px] text-[#4B5563] mb-3">{c.bestFor}</div>
            <div className="text-[12px] text-[#9CA3AF] mb-1">Covers</div>
            <div className="text-[13px] text-[#4B5563] mb-3 flex-1">{c.covers}</div>
            <div className="text-[13px] font-semibold text-emerald-700 mb-4">From {c.from}</div>
            <a
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 h-10 rounded-xl bg-[#011CB5] text-white text-[13px] font-semibold hover:bg-[#0118a0] transition"
            >
              {c.cta} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-[#9CA3AF] text-center">
        We may earn a referral commission at no extra cost to you.
      </p>
    </div>
  );
}

function SimMoneyTab() {
  return (
    <div className="space-y-8">
      {/* SIM Cards */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Wifi className="w-5 h-5 text-[#011CB5]" />
          <h3 className="text-[16px] font-bold text-[#1B2B5E]">International SIM cards</h3>
        </div>
        <div className="space-y-3">
          {SIM_CARDS.map((s) => (
            <div key={s.name} className="flex items-center justify-between gap-4 rounded-xl bg-white border border-[#E8EDF8] px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-semibold text-[#1B2B5E]">{s.name}</span>
                  {s.badge && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{s.badge}</span>
                  )}
                </div>
                <div className="text-[12.5px] text-[#4B5563] mt-0.5">{s.desc}</div>
              </div>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 h-9 rounded-xl border border-[#E8EDF8] px-3 text-[13px] font-semibold text-[#011CB5] hover:bg-[#F0F4FF] transition"
              >
                {s.cta} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Forex Cards table */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-[#011CB5]" />
          <h3 className="text-[16px] font-bold text-[#1B2B5E]">Zero-forex cards</h3>
        </div>
        <div className="rounded-2xl bg-white border border-[#E8EDF8] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E8EDF8] bg-[#F8FAFF]">
                  {['Card', 'Forex fee', 'ATM fee', 'Signup time', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-[#9CA3AF] text-[11px] uppercase tracking-[0.1em] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FOREX_CARDS.map((c, i) => (
                  <tr key={c.name} className={`border-b border-[#E8EDF8] last:border-0 ${i % 2 === 1 ? 'bg-[#FAFBFF]' : ''}`}>
                    <td className="px-4 py-3 font-semibold text-[#1B2B5E] whitespace-nowrap">{c.name}</td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold whitespace-nowrap">{c.forex}</td>
                    <td className="px-4 py-3 text-[#4B5563] whitespace-nowrap">{c.atm}</td>
                    <td className="px-4 py-3 text-[#4B5563] whitespace-nowrap">{c.time}</td>
                    <td className="px-4 py-3">
                      <a
                        href={c.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#011CB5] font-semibold hover:underline"
                      >
                        Apply <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[11.5px] text-[#9CA3AF] mt-2">Cards vary by availability. Check current terms before applying.</p>
      </div>
    </div>
  );
}

function FlightsTab() {
  return (
    <div className="space-y-8">
      {/* Flights */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Plane className="w-5 h-5 text-[#011CB5]" />
          <h3 className="text-[16px] font-bold text-[#1B2B5E]">Flight booking</h3>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {FLIGHT_LINKS.map((f) => (
            <a
              key={f.name}
              href={f.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl bg-white border border-[#E8EDF8] hover:border-[#011CB5]/30 hover:shadow-sm px-4 py-4 transition group"
            >
              <div>
                <div className="text-[14px] font-semibold text-[#1B2B5E]">{f.name}</div>
                <div className="text-[12px] text-[#4B5563] mt-0.5">{f.desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#011CB5] shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* Accommodation */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Hotel className="w-5 h-5 text-[#011CB5]" />
          <h3 className="text-[16px] font-bold text-[#1B2B5E]">Accommodation</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {STAY_LINKS.map((s) => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl bg-white border border-[#E8EDF8] hover:border-[#011CB5]/30 hover:shadow-sm px-4 py-4 transition group"
            >
              <div>
                <div className="text-[14px] font-semibold text-[#1B2B5E]">{s.name}</div>
                <div className="text-[12px] text-[#4B5563] mt-0.5">{s.desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#011CB5] shrink-0" />
            </a>
          ))}
        </div>
      </div>

      <p className="text-[12px] text-[#9CA3AF]">All links open in a new tab. WeHive may earn affiliate commission on bookings.</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PostApprovalHub() {
  const { applicationId } = useParams();
  const { token } = useAuth();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('checklist');

  useEffect(() => {
    if (!token || !applicationId) { setLoading(false); return; }
    axios
      .get(`${API}/users/me/applications/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setApplication(r.data))
      .catch(() => setApplication(null))
      .finally(() => setLoading(false));
  }, [token, applicationId]);

  const country = application?.country_id?.toUpperCase() || '';
  const visaType = application?.visa_type || '';

  return (
    <div className="bg-[#F8FAFF] min-h-screen">
      <Navbar />
      <main className="pt-24 sm:pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Back link */}
          <Link
            to="/account?tab=applications"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#4B5563] hover:text-[#011CB5] mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to applications
          </Link>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <span className="text-[13px] font-semibold text-emerald-700 uppercase tracking-[0.1em]">Visa Approved</span>
            </div>
            <h1 className="font-bold text-[28px] sm:text-[36px] tracking-[-0.02em] text-[#1B2B5E]">
              {loading ? 'Plan your journey' : `Your ${country}${visaType ? ` ${visaType}` : ''} journey`}
            </h1>
            <p className="mt-1 text-[15px] text-[#4B5563]">
              Everything you need before you fly — checklist, insurance, SIM cards, and more.
            </p>
          </div>

          {loading && (
            <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-[#011CB5]" />
            </div>
          )}

          {!loading && (
            <>
              {/* Tab strip */}
              <div className="flex gap-1 overflow-x-auto pb-px mb-6 [scrollbar-width:none]">
                {TABS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`shrink-0 flex items-center gap-2 px-4 h-10 rounded-xl text-[13px] font-semibold transition-colors ${
                      activeTab === id
                        ? 'bg-[#011CB5] text-white'
                        : 'bg-white border border-[#E8EDF8] text-[#4B5563] hover:bg-[#F0F4FF] hover:text-[#1B2B5E]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="rounded-2xl bg-white border border-[#E8EDF8] shadow-sm p-6 sm:p-8">
                {activeTab === 'checklist' && <ChecklistTab applicationId={applicationId} />}
                {activeTab === 'insurance' && <InsuranceTab />}
                {activeTab === 'sim-money' && <SimMoneyTab />}
                {activeTab === 'flights' && <FlightsTab />}
              </div>

              {/* Bottom CTA */}
              <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-dashed border-[#011CB5]/20 bg-[#F0F4FF] px-5 py-4">
                <div>
                  <div className="text-[14px] font-bold text-[#1B2B5E]">Need help with your visa journey?</div>
                  <div className="text-[12.5px] text-[#4B5563] mt-0.5">Our counsellors are available 9 AM – 7 PM IST.</div>
                </div>
                <Link
                  to="/contact"
                  className="shrink-0 flex items-center gap-2 h-10 rounded-xl bg-[#011CB5] text-white text-[13px] font-semibold px-4 hover:bg-[#0118a0] transition"
                >
                  <Globe className="w-4 h-4" /> Contact us
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

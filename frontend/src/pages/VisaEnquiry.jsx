import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, IdCard } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EnquirySection from '../components/EnquirySection';
import { COUNTRIES } from '../data/mock';

const DESTINATIONS = COUNTRIES.filter(c => c.id !== 'in');
const iso = (id) => (id === 'uk' ? 'GB' : id.toUpperCase());
const selectCls = 'w-full h-12 rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-[16px] text-[hsl(var(--blue-900))] outline-none focus:border-[hsl(var(--blue-700))] focus:ring-[3px] focus:ring-[hsl(var(--blue-700))]/20';
const labelCls = 'block text-[14px] font-semibold text-[hsl(var(--blue-900))] mb-1.5';

export default function VisaEnquiry() {
  const navigate = useNavigate();
  const [from, setFrom] = useState('in');
  const [to, setTo] = useState('');

  const check = (e) => {
    e.preventDefault();
    if (!to) return;
    navigate(`/visa-checker?from=${iso(from)}&to=${iso(to)}`);
  };

  return (
    <div className="min-h-screen bg-white text-[hsl(var(--blue-900))]">
      <Navbar />
      <section className="pt-28 pb-16 bg-[hsl(var(--soft-bg))] border-b border-[hsl(var(--border))]">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-3 flex items-center gap-2">
            <IdCard className="w-3.5 h-3.5" /> Visa Enquiry
          </div>
          <h1 className="font-display font-bold text-[36px] sm:text-[52px] tracking-[-0.02em] leading-[1.05]">
            Find the right visa
          </h1>
          <p className="mt-4 text-[16px] text-muted-foreground max-w-xl">
            Pick where you're going and the passport you hold. We'll show you what you need, no sign-in required.
          </p>
          <form onSubmit={check} className="mt-8 grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ve-to" className={labelCls}>Travelling to</label>
              <select id="ve-to" value={to} onChange={e => setTo(e.target.value)} className={selectCls}>
                <option value="">Select destination</option>
                {DESTINATIONS.map(c => <option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ve-from" className={labelCls}>Passport country</label>
              <select id="ve-from" value={from} onChange={e => setFrom(e.target.value)} className={selectCls}>
                {COUNTRIES.map(c => <option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}
              </select>
            </div>
            <button type="submit" disabled={!to}
              className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-white font-semibold text-[15px] h-12 px-6 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent))]">
              <Search className="w-4 h-4" /> Check requirements
            </button>
          </form>
        </div>
      </section>
      <EnquirySection />
      <Footer />
    </div>
  );
}

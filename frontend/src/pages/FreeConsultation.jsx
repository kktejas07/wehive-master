import { MessageCircle, MapPin } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EnquirySection from '../components/EnquirySection';
import HowItWorks from '../components/HowItWorks';
import { BRANCHES } from '../data/mock';

export default function FreeConsultation() {
  return (
    <div className="min-h-screen bg-white text-[hsl(var(--blue-900))]">
      <Navbar />
      <section className="pt-28 pb-10 bg-[hsl(var(--soft-bg))] border-b border-[hsl(var(--border))]">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-3 flex items-center gap-2">
            <MessageCircle className="w-3.5 h-3.5" /> Free Consultation
          </div>
          <h1 className="font-display font-bold text-[36px] sm:text-[52px] tracking-[-0.02em] leading-[1.05]">
            Talk to a visa consultant, free
          </h1>
          <p className="mt-4 text-[16px] text-muted-foreground max-w-xl">
            No sign-in needed. Tell us where you're going and why, and we'll get back to you within one working day.
          </p>
        </div>
      </section>
      <EnquirySection />
      <section className="py-16 bg-[hsl(var(--soft-bg))] border-y border-[hsl(var(--border))]" aria-labelledby="branches-title">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <h2 id="branches-title" className="font-display font-bold text-[28px] tracking-[-0.02em] leading-tight">
            Prefer to meet in person? Visit us
          </h2>
          <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BRANCHES.map(b => (
              <li key={b.id} className="rounded-2xl border border-[hsl(var(--border))] bg-white p-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <MapPin className="w-4 h-4 text-[hsl(var(--blue-700))]" aria-hidden="true" />
                  <span className="font-bold text-[15px]">{b.city}</span>
                  {b.isNew && <span className="text-[11px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-700">New</span>}
                  {!b.address && <span className="text-[11px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 bg-amber-50 text-amber-700">Coming soon</span>}
                </div>
                {b.address ? (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`} target="_blank" rel="noopener noreferrer"
                    className="mt-2 block text-[14px] text-muted-foreground hover:text-[hsl(var(--blue-700))] hover:underline">
                    {b.address}
                  </a>
                ) : (
                  <p className="mt-2 text-[14px] text-muted-foreground">Opening soon. Book a free consultation online in the meantime.</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <HowItWorks />
      <Footer />
    </div>
  );
}

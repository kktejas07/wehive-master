import { MessageCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EnquirySection from '../components/EnquirySection';
import HowItWorks from '../components/HowItWorks';

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
      <HowItWorks />
      <Footer />
    </div>
  );
}

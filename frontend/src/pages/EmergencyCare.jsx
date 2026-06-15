import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, ChevronDown, AlertTriangle, Stethoscope, Heart, Briefcase, Clock, Luggage, MessageCircle, MapPin, Pencil, ShieldCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const COVERED = [
  { icon: Stethoscope, title: 'Medical Emergencies', desc: 'Urgent treatment or care for an ailing family member.' },
  { icon: Heart, title: 'Family Emergencies', desc: 'Sudden bereavement or critical family crises.' },
  { icon: Briefcase, title: 'Work Related Urgencies', desc: 'Mission-critical deadlines and unforeseen business travel.' },
  { icon: Clock, title: 'Time Sensitive Situations', desc: 'Essential life events where the standard process has stalled.' },
];

const NOT_COVERED = [
  { icon: Luggage, title: 'Routine Travel', desc: 'Standard tourism or leisure trips planned weeks in advance.' },
  { icon: MessageCircle, title: 'General Inquiries', desc: 'Questions about visa rules or document checklists for future trips.' },
  { icon: MapPin, title: 'Standard Tracking', desc: 'Status updates for applications made through the standard process.' },
  { icon: Pencil, title: 'Non-Urgent Changes', desc: 'Minor edits or updates to existing routine visas.' },
];

const FAQS = [
  { q: 'What is the WeHive Emergency Helpline?', a: 'The WeHive Emergency Helpline is a dedicated line for travellers facing time-sensitive, exceptional visa situations. It is designed for moments when you have an urgent or imminent travel need that cannot wait for standard support channels.' },
  { q: 'When should I call the Emergency Helpline?', a: 'Call when you have an urgent travel need — a medical emergency, family crisis, last-minute business trip, or any situation where standard processing timelines won\'t work.' },
  { q: 'How quickly will you get back to me?', a: 'Our team typically responds within minutes during business hours. For after-hours emergencies, leave a message and we\'ll call back within 30 minutes.' },
  { q: 'Is there a fee for using the Emergency Helpline?', a: 'The helpline call itself is free. Visa processing fees still apply based on the country and visa type.' },
  { q: 'What information should I have ready when I call?', a: 'Your passport details, destination country, travel dates, a brief description of your emergency, and any existing application reference numbers.' },
];

function FadeIn({ children, delay = 0, className = '' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

export default function EmergencyCare() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="bg-white">
      <Navbar />
      <div className="min-h-[calc(100vh-72px)]">
        {/* Hero */}
        <section className="relative pt-28 pb-20 sm:pb-28 overflow-hidden bg-gradient-to-br from-[hsl(var(--blue-900))] via-[hsl(var(--blue-700))] to-[hsl(var(--blue-900))]">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[hsl(var(--accent))]/10 blur-[120px]" />
          <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <FadeIn>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-[11px] uppercase tracking-[0.18em] font-bold mb-6">
                  <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
                  Emergency Support
                </div>
                <h1 className="font-display font-extrabold text-[38px] sm:text-[48px] lg:text-[56px] tracking-[-0.03em] text-white leading-[1.08]">
                  Emergency visa?<br />
                  <span className="text-[hsl(var(--accent))]">we're on it</span>
                </h1>
                <p className="mt-4 text-[16px] sm:text-[18px] text-white/70 max-w-lg leading-relaxed">
                  Crisis doesn't wait for paperwork. Talk to a visa specialist now and get your application moving.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <a href="tel:+919000734326" className="inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--accent))] hover:bg-[hsl(var(--red-600))] text-white h-12 px-7 text-[15px] font-bold transition shadow-lg shadow-[hsl(var(--accent))]/25">
                    <Phone className="w-4 h-4" />
                    Get emergency visa help
                  </a>
                  <a href="tel:+919000734326" className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 hover:bg-white/20 text-white h-12 px-7 text-[15px] font-bold transition backdrop-blur-sm border border-white/20">
                    +91 90007 34326
                  </a>
                </div>
              </FadeIn>
              <FadeIn delay={0.2}>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: '250+', label: 'Countries Supported' },
                    { value: '50+', label: 'Government Partners' },
                    { value: '24/7', label: 'Active Call Support' },
                  ].map((s, i) => (
                    <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center backdrop-blur-sm">
                      <div className="font-display font-extrabold text-[28px] sm:text-[32px] text-white">{s.value}</div>
                      <div className="text-[11px] text-white/50 uppercase tracking-[0.12em] font-bold mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* What's Covered */}
        <section className="py-20 sm:py-28 bg-white">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <FadeIn className="text-center mb-14">
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-4">What's covered</div>
              <h2 className="font-display font-extrabold text-[32px] sm:text-[42px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">Situations we handle urgently</h2>
            </FadeIn>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {COVERED.map((item, i) => (
                <FadeIn key={i} delay={i * 0.08}>
                  <div className="group rounded-3xl bg-[hsl(var(--soft-bg))] p-6 sm:p-7 h-full border border-black/5 hover:border-[hsl(var(--accent))]/30 hover:shadow-lg transition-all duration-300">
                    <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--accent))]/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                      <item.icon className="w-5 h-5 text-[hsl(var(--accent))]" />
                    </div>
                    <h3 className="font-display font-bold text-[17px] text-[hsl(var(--blue-900))]">{item.title}</h3>
                    <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60 leading-relaxed">{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* What's Not Covered */}
        <section className="py-20 sm:py-28 bg-[hsl(var(--soft-bg))]">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <FadeIn className="text-center mb-14">
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--blue-900))]/40 mb-4">What's not covered</div>
              <h2 className="font-display font-extrabold text-[32px] sm:text-[42px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">For standard needs, use our app</h2>
            </FadeIn>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {NOT_COVERED.map((item, i) => (
                <FadeIn key={i} delay={i * 0.08}>
                  <div className="rounded-3xl bg-white p-6 sm:p-7 h-full border border-black/5">
                    <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--blue-900))]/5 flex items-center justify-center mb-5">
                      <item.icon className="w-5 h-5 text-[hsl(var(--blue-900))]/40" />
                    </div>
                    <h3 className="font-display font-bold text-[17px] text-[hsl(var(--blue-900))]">{item.title}</h3>
                    <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60 leading-relaxed">{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
            <FadeIn delay={0.3} className="mt-8">
              <div className="rounded-3xl bg-[hsl(var(--blue-900))] p-6 sm:p-8 text-center">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                <p className="text-white/80 text-[14px] max-w-2xl mx-auto leading-relaxed">
                  To keep this line open for immediate crises, please use our website or app for standard applications.
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 sm:py-28 bg-white">
          <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
            <FadeIn>
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-4">Need help now?</div>
              <h2 className="font-display font-extrabold text-[32px] sm:text-[42px] tracking-[-0.03em] text-[hsl(var(--blue-900))] leading-[1.1]">
                We're here for you, <span className="text-[hsl(var(--accent))]">24/7</span>
              </h2>
              <p className="mt-4 text-[16px] text-[hsl(var(--blue-900))]/60 max-w-lg mx-auto leading-relaxed">
                Call our emergency helpline or send us an email. We'll respond within minutes.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="tel:+919000734326" className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] hover:bg-[hsl(var(--red-600))] text-white h-12 px-7 text-[15px] font-bold transition shadow-lg shadow-[hsl(var(--accent))]/25">
                  <Phone className="w-4 h-4" />
                  +91 90007 34326
                </a>
                <a href="mailto:info@wehive.co.in" className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-500))] text-white h-12 px-7 text-[15px] font-bold transition">
                  <Mail className="w-4 h-4" />
                  info@wehive.co.in
                </a>
              </div>
              <p className="mt-4 text-[13px] text-[hsl(var(--blue-900))]/40">
                Available Mon – Sat, 9:00 AM – 7:00 PM IST
              </p>
            </FadeIn>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 sm:py-28 bg-[hsl(var(--soft-bg))]">
          <div className="max-w-3xl mx-auto px-5 sm:px-8">
            <FadeIn className="text-center mb-12">
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-4">FAQ</div>
              <h2 className="font-display font-extrabold text-[32px] sm:text-[42px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">Frequently Asked Questions</h2>
            </FadeIn>
            <div className="space-y-3">
              {FAQS.map((faq, i) => (
                <FadeIn key={i} delay={i * 0.06}>
                  <div className="rounded-2xl bg-white border border-black/5 overflow-hidden">
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 sm:p-6 text-left">
                      <span className="font-bold text-[15px] text-[hsl(var(--blue-900))] pr-4">{faq.q}</span>
                      <ChevronDown className={`w-4 h-4 shrink-0 text-[hsl(var(--blue-900))]/40 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaq === i && (
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                        <p className="text-[14px] text-[hsl(var(--blue-900))]/65 leading-relaxed">{faq.a}</p>
                      </div>
                    )}
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Send, User, Mail, Phone, MessageSquare, ChevronDown } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';
import { API } from '../context/AuthContext';

const SUBJECTS = [
  { id: 'general', label: 'General inquiry' },
  { id: 'visa', label: 'Visa consultation' },
  { id: 'application', label: 'Application support' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'complaint', label: 'Complaint' },
  { id: 'partnership', label: 'Partnership opportunity' },
];

function FormField({ label, icon: Icon, children, required }) {
  return (
    <div>
      <label className="block text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/60 mb-1.5">
        {label} {required && <span className="text-[hsl(var(--accent))]">*</span>}
      </label>
      <div className="relative">{children}</div>
    </div>
  );
}

function InputIcon({ icon: Icon }) {
  return <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--blue-900))]/40" />;
}

export default function Contact() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const selectedSubject = SUBJECTS.find((s) => s.id === form.subject);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject || !form.message.trim()) {
      toast({ title: 'Please fill in all required fields' });
      return;
    }
    setSending(true);
    try {
      await axios.post(`${API}/public/contact`, {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        subject: form.subject,
        message: form.message,
      });
      toast({ title: 'Message sent!', description: "We'll get back to you within 24 hours." });
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch {
      toast({ title: 'Failed to send', description: 'Please try again or email us directly.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white">
      <Navbar />
      <div className="min-h-[calc(100vh-72px)] pt-28 pb-20 bg-[hsl(var(--soft-bg))]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="text-center mb-12"
          >
<<<<<<< Updated upstream
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
              Get in touch
            </div>
            <h1 className="mt-3 font-display font-extrabold text-[38px] sm:text-[52px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
              We'd love to hear from you
=======
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]"
            >
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
              Fly with WeHive
            </motion.div>
            <h1 className="mt-3 font-display font-extrabold text-[38px] sm:text-[52px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-block"
              >
                Let's plan your fly
              </motion.span>
              <br />
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="inline-block text-[hsl(var(--accent))]"
              >
                over a nice coffee
              </motion.span>
>>>>>>> Stashed changes
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-4 text-[16px] text-[hsl(var(--blue-900))]/65 max-w-lg mx-auto"
            >
              Have a question about your visa or passport? Grab a coffee, and let's chat about your travel dreams.
            </motion.p>
          </motion.div>

          <div className="grid lg:grid-cols-5 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="lg:col-span-3"
            >
              <form onSubmit={handleSubmit} className="rounded-3xl bg-white border border-black/5 shadow-[0_20_60_-20px_rgba(10,44,138,0.15)] p-7 sm:p-9 space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <FormField label="Your name" icon={User} required>
                    <input
                      value={form.name}
                      onChange={set('name')}
                      placeholder="Priya Sharma"
                      className="w-full h-12 rounded-xl border border-black/10 pl-11 pr-4 text-[15px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/40 focus:border-[hsl(var(--blue-700))] outline-none transition"
                    />
                    <InputIcon icon={User} />
                  </FormField>
                  <FormField label="Email address" icon={Mail} required>
                    <input
                      value={form.email}
                      onChange={set('email')}
                      type="email"
                      placeholder="you@example.com"
                      className="w-full h-12 rounded-xl border border-black/10 pl-11 pr-4 text-[15px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/40 focus:border-[hsl(var(--blue-700))] outline-none transition"
                    />
                    <InputIcon icon={Mail} />
                  </FormField>
                </div>

                <FormField label="Phone number" icon={Phone}>
                  <input
                    value={form.phone}
                    onChange={set('phone')}
                    type="tel"
                    placeholder="+91 9XXXX XXXXX"
                    className="w-full h-12 rounded-xl border border-black/10 pl-11 pr-4 text-[15px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/40 focus:border-[hsl(var(--blue-700))] outline-none transition"
                  />
                  <InputIcon icon={Phone} />
                </FormField>

                <FormField label="What is this about" icon={MessageSquare} required>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSubjectOpen(!subjectOpen)}
                      className="w-full h-12 rounded-xl border border-black/10 pl-11 pr-10 text-[15px] text-left flex items-center justify-between hover:border-[hsl(var(--blue-700))]/40 transition"
                    >
                      <span className={selectedSubject ? 'text-[hsl(var(--blue-900))]' : 'text-[hsl(var(--blue-900))]/40'}>
                        {selectedSubject ? selectedSubject.label : 'Select a topic'}
                      </span>
                    </button>
                    <InputIcon icon={MessageSquare} />
                    <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--blue-900))]/40 transition-transform ${subjectOpen ? 'rotate-180' : ''}`} />
                    {subjectOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-black/10 bg-white shadow-lg z-10 overflow-hidden">
                        {SUBJECTS.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => { setForm((f) => ({ ...f, subject: s.id })); setSubjectOpen(false); }}
                            className={`w-full px-4 py-3 text-[14px] text-left hover:bg-[hsl(var(--soft-bg))] transition ${form.subject === s.id ? 'text-[hsl(var(--blue-700))] font-bold' : 'text-[hsl(var(--blue-900))]'}`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </FormField>

                <FormField label="Your message" icon={MessageSquare} required>
                  <textarea
                    value={form.message}
                    onChange={set('message')}
                    placeholder="Tell us how we can help…"
                    rows={5}
                    className="w-full rounded-xl border border-black/10 px-4 py-3 text-[15px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/40 focus:border-[hsl(var(--blue-700))] outline-none transition resize-none"
                  />
                </FormField>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full h-12 rounded-full bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-500))] text-white font-bold text-[15px] transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Sending…' : 'Send message'}
                </button>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="lg:col-span-2 space-y-5"
            >
              <div className="rounded-3xl bg-[hsl(var(--blue-900))] text-white p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 h-[200px] w-[200px] rounded-full bg-[hsl(var(--accent))]/20 blur-3xl" />
                <div className="relative">
                  <h3 className="font-display font-extrabold text-[22px] tracking-[-0.02em]">Other ways to reach us</h3>
                  <div className="mt-5 space-y-4">
                    <a href="tel:+919000734326" className="flex items-center gap-3 text-[14px] hover:text-[hsl(var(--accent))] transition">
                      <Phone className="w-4 h-4 text-[hsl(var(--accent))] shrink-0" />
                      +91 90007 34326
                    </a>
                    <a href="mailto:info@wehive.co.in" className="flex items-center gap-3 text-[14px] hover:text-[hsl(var(--accent))] transition">
                      <Mail className="w-4 h-4 text-[hsl(var(--accent))] shrink-0" />
                      info@wehive.co.in
                    </a>
                  </div>
                  <div className="mt-6 pt-5 border-t border-white/10">
                    <p className="text-[12px] text-white/60">Office hours</p>
                    <p className="text-[14px] mt-1">Mon – Sat, 9:00 AM – 7:00 PM IST</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8">
<<<<<<< Updated upstream
                <h3 className="font-display font-extrabold text-[18px] text-[hsl(var(--blue-900))]">Visit us</h3>
=======
                <h3 className="font-display font-extrabold text-[18px] text-[hsl(var(--blue-900))]">Fly with WeHive – India</h3>
>>>>>>> Stashed changes
                <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/65 leading-relaxed">
                  Shanti Plaza, 1st floor, Moka Road, Gandhi Nagar, Ballari, Karnataka 583103
                </p>
                <a
<<<<<<< Updated upstream
                  href="https://maps.google.com/?q=Shanti+Plaza+Moka+Road+Ballari"
=======
                  href="https://maps.google.com/?q=WeHive+Flat+201+Mathrusree+Nagar+Miyapur+Hyderabad+Telangana+500049"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline"
                >
                  Open in Maps →
                </a>
              </div>

              <div className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8">
                <h3 className="font-display font-extrabold text-[18px] text-[hsl(var(--blue-900))]">Fly with WeHive – Ballari</h3>
                <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/65 leading-relaxed">
                  Shanti Plaza, 1st floor, Moka Road, Gandhi Nagar, Ballari, Karnataka 583103
                </p>
                <a
                  href="https://maps.google.com/?q=Shanti+Plaza+Moka+Road+Gandhi+Nagar+Ballari+Karnataka+583103"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline"
                >
                  Open in Maps →
                </a>
              </div>

              <div className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8">
                <h3 className="font-display font-extrabold text-[18px] text-[hsl(var(--blue-900))]">Fly with WeHive – USA</h3>
                <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/65 leading-relaxed">
                  Building B 339, Princeton-Hightstown Road, East Windsor, NJ 08512
                </p>
                <a
                  href="https://maps.google.com/?q=Building+B+339+Princeton-Hightstown+Road+East+Windsor+NJ+08512"
>>>>>>> Stashed changes
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline"
                >
                  Open in Maps →
                </a>
              </div>

              <div className="rounded-3xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-100))] p-6 sm:p-8">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--blue-700))] text-white text-[14px] font-bold">
                  Eva
                </div>
                <h3 className="mt-4 font-display font-extrabold text-[16px] text-[hsl(var(--blue-900))]">Chat with Eva</h3>
                <p className="mt-1 text-[13px] text-[hsl(var(--blue-900))]/65">Our AI visa assistant is available 24/7 to answer your questions instantly.</p>
                <a
                  href="https://wa.me/919000734326"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-[12px] font-bold text-white transition"
                >
                  Start WhatsApp chat
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
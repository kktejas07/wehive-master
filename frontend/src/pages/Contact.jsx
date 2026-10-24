import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Send, User, Mail, Phone, MessageSquare, MessageCircle, ChevronDown } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';
import { API } from '../context/AuthContext';
import { BRAND, BRANCHES } from '../data/mock';

const WHATSAPP = [
  { id: 'wa1', label: 'WhatsApp (primary)', number: BRAND.whatsapp, raw: BRAND.whatsappRaw },
  { id: 'wa2', label: 'WhatsApp (secondary)', number: BRAND.whatsappSecondary, raw: BRAND.whatsappSecondaryRaw },
];

const SUBJECTS = [
  { id: 'general', label: 'General inquiry' },
  { id: 'visa', label: 'Visa consultation' },
  { id: 'application', label: 'Application support' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'complaint', label: 'Complaint' },
  { id: 'partnership', label: 'Partnership opportunity' },
];

const FIELD_CLS = 'w-full h-12 rounded-xl border border-[hsl(var(--border))] bg-white pl-11 pr-4 text-[16px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/45 outline-none transition-colors duration-200 hover:border-[hsl(var(--blue-200))] focus:border-[hsl(var(--blue-700))] focus:ring-[3px] focus:ring-[hsl(var(--blue-700))]/20';

function FormField({ label, children, required }) {
  return (
    <label className="block">
      <span className="block text-[14px] font-semibold text-[hsl(var(--blue-900))] mb-1.5">
        {label} {required && <span className="text-red-700" aria-hidden="true">*</span>}
      </span>
      <div className="relative">{children}</div>
    </label>
  );
}

function InputIcon({ icon: Icon }) {
  return <Icon aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />;
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
      // Contact messages are stored as leads (backend POST /api/leads: name, surname, email, message).
      await axios.post(`${API}/leads`, {
        name: form.name,
        email: form.email,
        message: `[Contact form] Subject: ${selectedSubject?.label || form.subject}${form.phone ? `\nPhone: ${form.phone}` : ''}\n\n${form.message}`,
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
      <main className="min-h-[calc(100vh-72px)] pt-28 md:pt-36 pb-16 md:pb-24 bg-[hsl(var(--soft-bg))]">
        <div className="container-page">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="max-w-2xl mb-10 md:mb-12"
          >
            <div className="eyebrow">Fly with WeHive</div>
            <h1 className="h-display mt-4">
              Let's plan your fly{' '}
              <span className="text-[hsl(var(--red-500))]">over a nice coffee</span>
            </h1>
            <p className="lead mt-4 max-w-lg">
              Have a question about your visa or passport? Grab a coffee, and let's chat about your travel dreams.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-3">
              <form onSubmit={handleSubmit} className="card-surface p-6 sm:p-8 space-y-5" noValidate>
                <div className="grid sm:grid-cols-2 gap-5">
                  <FormField label="Your name" required>
                    <input
                      value={form.name}
                      onChange={set('name')}
                      placeholder="Priya Sharma"
                      autoComplete="name"
                      required
                      className={FIELD_CLS}
                    />
                    <InputIcon icon={User} />
                  </FormField>
                  <FormField label="Email address" required>
                    <input
                      value={form.email}
                      onChange={set('email')}
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      className={FIELD_CLS}
                    />
                    <InputIcon icon={Mail} />
                  </FormField>
                </div>

                <FormField label="Phone number">
                  <input
                    value={form.phone}
                    onChange={set('phone')}
                    type="tel"
                    placeholder="+91 9XXXX XXXXX"
                    autoComplete="tel"
                    className={FIELD_CLS}
                  />
                  <InputIcon icon={Phone} />
                </FormField>

                <FormField label="What is this about" required>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSubjectOpen(!subjectOpen)}
                      aria-expanded={subjectOpen}
                      aria-haspopup="listbox"
                      className={`${FIELD_CLS} pr-10 text-left flex items-center justify-between`}
                    >
                      <span className={selectedSubject ? 'text-[hsl(var(--blue-900))]' : 'text-muted-foreground'}>
                        {selectedSubject ? selectedSubject.label : 'Select a topic'}
                      </span>
                    </button>
                    <InputIcon icon={MessageSquare} />
                    <ChevronDown aria-hidden="true" className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none transition-transform duration-200 ${subjectOpen ? 'rotate-180' : ''}`} />
                    {subjectOpen && (
                      <div role="listbox" className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-[hsl(var(--border))] bg-white shadow-lg z-10 overflow-hidden p-1">
                        {SUBJECTS.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            role="option"
                            aria-selected={form.subject === s.id}
                            // preventDefault: the wrapping <label> would otherwise re-click the toggle (Safari reopens the list)
                            onClick={(e) => { e.preventDefault(); setForm((f) => ({ ...f, subject: s.id })); setSubjectOpen(false); }}
                            className={`w-full px-3 py-2.5 rounded-lg text-[15px] text-left transition-colors duration-200 hover:bg-[hsl(var(--blue-50))] ${form.subject === s.id ? 'text-[hsl(var(--blue-700))] font-semibold bg-[hsl(var(--blue-50))]' : 'text-[hsl(var(--blue-900))]'}`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </FormField>

                <FormField label="Your message" required>
                  <textarea
                    value={form.message}
                    onChange={set('message')}
                    placeholder="Tell us how we can help…"
                    rows={5}
                    required
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-white px-4 py-3 text-[16px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/45 outline-none transition-colors duration-200 hover:border-[hsl(var(--blue-200))] focus:border-[hsl(var(--blue-700))] focus:ring-[3px] focus:ring-[hsl(var(--blue-700))]/20 resize-y"
                  />
                </FormField>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full sm:w-auto h-12 px-6 rounded-xl btn-accent font-semibold text-[15px] inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" aria-hidden="true" />}
                  {sending ? 'Sending…' : 'Send message'}
                </button>
              </form>
            </div>

            <aside className="lg:col-span-2 space-y-4">
              <div className="card-surface p-6">
                <h2 className="h-card">Other ways to reach us</h2>
                <ul className="mt-4 space-y-3">
                  <li>
                    <a href={`tel:${BRAND.phoneRaw}`} className="flex items-center gap-3 text-[15px] text-[hsl(var(--blue-900))] hover:text-[hsl(var(--blue-700))] transition-colors duration-200">
                      <span className="icon-tile h-9 w-9 rounded-lg"><Phone className="w-4 h-4" aria-hidden="true" /></span>
                      {BRAND.phone}
                    </a>
                  </li>
                  {WHATSAPP.map((w) => (
                    <li key={w.id}>
                      <a href={`https://wa.me/${w.raw}`} target="_blank" rel="noopener noreferrer" aria-label={`${w.label}: ${w.number}`} className="flex items-center gap-3 text-[15px] text-[hsl(var(--blue-900))] hover:text-[hsl(var(--blue-700))] transition-colors duration-200">
                        <span className="icon-tile h-9 w-9 rounded-lg"><MessageCircle className="w-4 h-4" aria-hidden="true" /></span>
                        <span>{w.number} <span className="text-[13px] text-muted-foreground">· {w.label}</span></span>
                      </a>
                    </li>
                  ))}
                  <li>
                    <a href={`mailto:${BRAND.email}`} className="flex items-center gap-3 text-[15px] text-[hsl(var(--blue-900))] hover:text-[hsl(var(--blue-700))] transition-colors duration-200">
                      <span className="icon-tile h-9 w-9 rounded-lg"><Mail className="w-4 h-4" aria-hidden="true" /></span>
                      {BRAND.email}
                    </a>
                  </li>
                </ul>
                <div className="mt-5 pt-4 border-t border-[hsl(var(--border))]">
                  <p className="text-[13px] text-muted-foreground">Office hours</p>
                  <p className="text-[15px] mt-0.5 text-[hsl(var(--blue-900))]">Mon – Sat, 9:00 AM – 7:00 PM IST</p>
                </div>
              </div>

              <div className="card-surface p-6">
                <h2 className="h-card">Visit us</h2>
                <ul className="mt-2 divide-y divide-[hsl(var(--border))]">
                  {BRANCHES.map((o) => (
                    <li key={o.id} className="py-4 last:pb-0">
                      <div className="flex items-center gap-2 text-[15px] font-semibold text-[hsl(var(--blue-900))]">
                        {o.city}
                        {o.isNew && <span className="text-[11px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-700">New</span>}
                        {!o.address && <span className="text-[11px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 bg-amber-50 text-amber-700">Coming soon</span>}
                      </div>
                      {o.address ? (
                        <>
                          <p className="mt-1 text-[14px] text-muted-foreground leading-relaxed">{o.address}</p>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-[14px] link-primary"
                          >
                            Open in Maps <span aria-hidden="true">→</span>
                          </a>
                        </>
                      ) : (
                        <p className="mt-1 text-[14px] text-muted-foreground leading-relaxed">Opening soon.</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-100))] p-6">
                <h2 className="h-card">Chat with Hive</h2>
                <p className="mt-1.5 text-[15px] text-muted-foreground">Our AI visa assistant is available 24/7 to answer your questions instantly.</p>
                <a
                  href={`https://wa.me/${BRAND.whatsappRaw}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center justify-center h-11 px-4 rounded-xl btn-outline text-[14px] font-semibold"
                >
                  Start WhatsApp chat
                </a>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

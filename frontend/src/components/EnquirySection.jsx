import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Plane, Briefcase, GraduationCap, HardHat, Users, Home, ArrowRightLeft, HelpCircle, Loader2, CheckCircle2, Tag,
} from 'lucide-react';
import { API } from '../context/AuthContext';
import { COUNTRIES, BRANCHES } from '../data/mock';
import Reveal from './Reveal';

const PURPOSES = [
  { id: 'tourist', label: 'Tourist', hint: 'Holiday or visit', Icon: Plane },
  { id: 'business', label: 'Business', hint: 'Meetings, conferences', Icon: Briefcase },
  { id: 'student_f1', label: 'Student / F-1', hint: 'Study abroad', Icon: GraduationCap },
  { id: 'work', label: 'Work', hint: 'Job or work permit', Icon: HardHat },
  { id: 'family', label: 'Family visit', hint: 'Spouse, parents, relatives', Icon: Users },
  { id: 'immigration', label: 'Immigration / PR', hint: 'Settle abroad', Icon: Home },
  { id: 'transit', label: 'Transit', hint: 'Passing through', Icon: ArrowRightLeft },
  { id: 'other', label: 'Something else', hint: 'Tell us below', Icon: HelpCircle },
];
const EMPTY = { purpose: '', name: '', email: '', phone: '', destination: '', travel_date: '', travellers: 1, message: '', branch: '', consent: false, website: '' };

const inputCls = 'w-full h-12 rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-[16px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/45 outline-none transition-colors hover:border-[hsl(var(--blue-200))] focus:border-[hsl(var(--blue-700))] focus:ring-[3px] focus:ring-[hsl(var(--blue-700))]/20';
const labelCls = 'block text-[14px] font-semibold text-[hsl(var(--blue-900))] mb-1.5';
const today = () => new Date().toISOString().slice(0, 10);

function detailText(d) {
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d.length) {
    const field = d[0]?.loc?.[d[0].loc.length - 1];
    const msg = (d[0]?.msg || '').replace(/^Value error, /, '');
    return field === 'email' ? 'Enter a valid email address.' : msg;
  }
  return 'Something went wrong. Please try again.';
}

export default function EnquirySection({ source = 'landing' }) {
  // ?branch=habsiguda pre-selects the referring location, e.g. from a QR code at that branch.
  const [params] = useSearchParams();
  const initialBranch = BRANCHES.some((b) => b.id === params.get('branch')) ? params.get('branch') : '';
  const [form, setForm] = useState({ ...EMPTY, branch: initialBranch });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const ready = form.purpose && form.name.trim().length >= 2 && form.email.includes('@')
    && form.phone.replace(/\D/g, '').length >= 7 && form.destination.trim().length >= 2 && form.consent;

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) {
      setError(!form.purpose ? 'Choose what the trip is for.' : 'Fill in the required fields and tick the consent box.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await axios.post(`${API}/leads/enquiry`, {
        ...form,
        travel_date: form.travel_date || null,
        travellers: Number(form.travellers) || 1,
        message: form.message.trim() || null,
        branch: form.branch || null,
        source,
      });
      setSent({ name: form.name.trim().split(' ')[0], destination: form.destination.trim() });
      setForm({ ...EMPTY, branch: initialBranch });
    } catch (err) {
      setError(err?.response?.status === 429
        ? 'Too many enquiries from this connection. Please try again in a few minutes.'
        : detailText(err?.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="enquiry" className="section" aria-labelledby="enquiry-title">
      <div className="container-page grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 lg:gap-14 items-start">
        <Reveal>
          <div className="eyebrow">Free visa consultation</div>
          <h2 id="enquiry-title" className="h-section mt-3">Tell us about your trip</h2>
          <p className="lead mt-4">
            Business, study, tourism or a move abroad: share a few details and a visa consultant will call or WhatsApp you
            within one working day with the right visa, documents and timeline.
          </p>
          <ul className="mt-6 space-y-2 text-[15px] text-muted-foreground">
            <li>✓ No charge for the first consultation</li>
            <li>✓ We only use your details to answer this enquiry</li>
          </ul>
        </Reveal>

        <Reveal index={1}>
          <div className="card-surface p-5 sm:p-7">
            {sent ? (
              <div className="py-8 text-center" role="status" data-testid="enquiry-success">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" aria-hidden="true" />
                <h3 className="h-card mt-4">Thanks{sent.name ? `, ${sent.name}` : ''}!</h3>
                <p className="mt-2 text-[15px] text-muted-foreground">
                  We've got your enquiry for {sent.destination}. Expect a call or WhatsApp within one working day, and check your email for a confirmation.
                </p>

                {/* ₹500 off promo */}
                <div className="mt-6 rounded-2xl border border-[hsl(var(--blue-200))] bg-[hsl(var(--blue-50))] px-6 py-5 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-[hsl(var(--blue-700))]" aria-hidden="true" />
                    <span className="text-[13px] font-bold uppercase tracking-wide text-[hsl(var(--blue-700))]">Exclusive offer</span>
                  </div>
                  <p className="text-[16px] font-bold text-[hsl(var(--blue-900))]">
                    Sign in and save <span className="text-[hsl(var(--red-500))]">₹500</span> on your next WeHive service
                  </p>
                  <p className="mt-1 text-[14px] text-muted-foreground">
                    Create a free account to track your application, get reminders, and unlock your discount.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link to="/signup" className="h-11 px-5 rounded-xl btn-accent font-semibold text-[14px] inline-flex items-center justify-center">
                      Create free account
                    </Link>
                    <Link to="/login" className="h-11 px-5 rounded-xl btn-outline font-semibold text-[14px] inline-flex items-center justify-center">
                      Sign in
                    </Link>
                  </div>
                </div>

                <button type="button" onClick={() => setSent(null)} className="mt-5 text-[14px] text-muted-foreground underline-offset-2 hover:underline">
                  Send another enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate data-testid="enquiry-form">
                <fieldset>
                  <legend className={labelCls}>What is the trip for? <span aria-hidden="true">*</span></legend>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PURPOSES.map(({ id, label, hint, Icon }) => (
                      <label
                        key={id}
                        data-testid={`enquiry-purpose-${id}`}
                        // WebKit doesn't reliably forward clicks to a visually hidden radio; set it directly.
                        onClick={() => setForm((f) => ({ ...f, purpose: id }))}
                        className={`relative cursor-pointer rounded-xl border p-3 transition-colors focus-within:ring-[3px] focus-within:ring-[hsl(var(--blue-700))]/25 ${
                          form.purpose === id
                            ? 'border-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))]'
                            : 'border-[hsl(var(--border))] bg-white hover:border-[hsl(var(--blue-200))]'
                        }`}
                      >
                        <input type="radio" name="purpose" value={id} checked={form.purpose === id} onChange={set('purpose')} className="sr-only" />
                        <Icon className="w-5 h-5 text-[hsl(var(--blue-700))]" aria-hidden="true" />
                        <span className="mt-2 block text-[14px] font-semibold text-[hsl(var(--blue-900))]">{label}</span>
                        <span className="block text-[12px] text-muted-foreground leading-snug">{hint}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="mt-5 grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="enq-name" className={labelCls}>Full name *</label>
                    <input id="enq-name" autoComplete="name" value={form.name} onChange={set('name')} maxLength={80} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="enq-email" className={labelCls}>Email *</label>
                    <input id="enq-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="enq-phone" className={labelCls}>Phone / WhatsApp *</label>
                    <input id="enq-phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="enq-destination" className={labelCls}>Destination country *</label>
                    <input id="enq-destination" list="enq-countries" autoComplete="off" placeholder="e.g. United States" value={form.destination} onChange={set('destination')} maxLength={60} className={inputCls} />
                    <datalist id="enq-countries">
                      {COUNTRIES.map((c) => <option key={c.id} value={c.name} />)}
                    </datalist>
                  </div>
                  <div>
                    <label htmlFor="enq-date" className={labelCls}>When do you plan to travel?</label>
                    <input id="enq-date" type="date" min={today()} value={form.travel_date} onChange={set('travel_date')} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="enq-travellers" className={labelCls}>Travellers</label>
                    <select id="enq-travellers" value={form.travellers} onChange={set('travellers')} className={inputCls}>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 10 ? '10+' : n}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="enq-branch" className={labelCls}>Referred by location</label>
                    <select id="enq-branch" value={form.branch} onChange={set('branch')} className={inputCls}>
                      <option value="">None / found you online</option>
                      {BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.city}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="enq-message" className={labelCls}>Anything else we should know?</label>
                    <textarea id="enq-message" rows={3} maxLength={1000} value={form.message} onChange={set('message')}
                      placeholder="Previous refusals, the university you've been admitted to, the event you're attending…"
                      className={`${inputCls} h-auto py-3 resize-y`} />
                  </div>
                </div>

                {/* Honeypot for bots: hidden from people and screen readers */}
                <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
                  <label htmlFor="enq-website">Website</label>
                  <input id="enq-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
                </div>

                <label className="mt-4 flex items-start gap-2.5 text-[14px] text-muted-foreground">
                  <input type="checkbox" checked={form.consent} onChange={set('consent')} className="mt-1 h-4 w-4 accent-[hsl(var(--blue-700))]" data-testid="enquiry-consent" />
                  <span>I agree to be contacted by We Hive by phone, WhatsApp or email about this enquiry. *</span>
                </label>

                {error && <p role="alert" className="mt-4 text-[14px] font-medium text-[#E10600]" data-testid="enquiry-error">{error}</p>}

                <button type="submit" disabled={busy} data-testid="enquiry-submit"
                  className="mt-5 w-full sm:w-auto h-12 px-7 rounded-xl btn-accent font-semibold text-[15px] inline-flex items-center justify-center gap-2 disabled:opacity-60">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Get my free consultation
                </button>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

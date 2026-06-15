/**
 * Two-step "Apply" review modal — runs before any draft is created on the
 * server. Lets the traveller confirm: trip date, primary applicant info, and
 * the live fee total. On confirm we POST /api/users/me/applications and then
 * redirect to /account/applications/:id so the user lands on a useful screen
 * (timeline + document checklist) instead of a silent toast.
 */
import { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  X, Calendar, User as UserIcon, Phone, Mail,
  ShieldCheck, Loader2, ArrowRight, MapPin,
  FileText, CreditCard, Check,
} from 'lucide-react';
import { Button } from './ui/button';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { computeFees } from './FeeBreakdown';
import { inr } from '../lib/utils';

const todayPlus = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export default function ApplicationReviewModal({
  open,
  onClose,
  country,
  category,
  visaType,
  applicants,
}) {
  const { user, token, isAuthed } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const minDate = todayPlus(1);
  const [travelDate, setTravelDate] = useState(todayPlus(21));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Prefill from logged-in user
  useEffect(() => {
    if (open && user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [open, user]);

  if (!country || !category) return null;

  const fees = computeFees({ category, applicants, country, visaType });

  const validate = () => {
    if (!name.trim() || name.trim().length < 2) {
      toast({ title: 'Please enter your full name' });
      return false;
    }
    if (!email && !phone) {
      toast({ title: 'Please share an email or mobile number' });
      return false;
    }
    if (!travelDate) {
      toast({ title: 'Please pick a tentative travel date' });
      return false;
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!isAuthed) {
      onClose?.();
      navigate('/signup');
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const r = await axios.post(
        `${API}/users/me/applications`,
        {
          country_id: country.id,
          visa_type: visaType,
          applicants,
          travel_date: travelDate,
          primary_applicant: { name: name.trim(), email: email.trim(), phone: phone.trim() },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const appId = r.data?.id;
      toast({
        title: 'Application created',
        description: 'Upload your documents and submit when ready.',
      });
      onClose?.();
      if (appId) {
        navigate(`/account/applications/${appId}`);
      } else {
        navigate('/account');
      }
    } catch (e) {
      const detail = e?.response?.data?.detail;
      toast({
        title: 'Could not start application',
        description: detail || 'Please try again in a moment.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="apply-review-modal"
        >
          <div
            className="absolute inset-0 bg-[hsl(var(--blue-900))]/45 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            initial={{ y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <header className="flex items-start justify-between px-5 sm:px-7 pt-5 pb-4 border-b border-black/5 gap-3">
              <div className="min-w-0">
                <ProgressTrail current={1} />
                <h2 className="font-display text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em] text-[hsl(var(--blue-900))] mt-2 truncate">
                  {country.name} · {category.name || visaType}
                </h2>
                <div className="text-[12.5px] text-[hsl(var(--blue-900))]/55 mt-0.5 inline-flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> {country.capital || country.region || 'Apply from anywhere'}
                </div>
              </div>
              <button
                data-testid="apply-review-close"
                onClick={onClose}
                className="h-9 w-9 rounded-full hover:bg-black/5 inline-flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="px-5 sm:px-7 py-5 max-h-[70vh] overflow-y-auto space-y-5">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2.5" data-testid="apply-no-payment-banner">
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-emerald-700" />
                <div className="text-[12.5px] leading-snug text-emerald-900">
                  <strong>You&rsquo;re reviewing — not paying.</strong> No card needed.
                  We&rsquo;ll save a draft application so you can upload documents
                  in the next step.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Travel date" Icon={Calendar}>
                  <input
                    data-testid="apply-travel-date"
                    type="date"
                    min={minDate}
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none focus:outline-none text-[14px] font-bold text-[hsl(var(--blue-900))]"
                  />
                </Field>
                <Field label="Applicants" Icon={UserIcon}>
                  <div data-testid="apply-applicants" className="text-[14px] font-bold text-[hsl(var(--blue-900))]">
                    {applicants} traveller{applicants > 1 ? 's' : ''}
                  </div>
                </Field>
              </div>

              <Field label="Primary applicant name" Icon={UserIcon}>
                <input
                  data-testid="apply-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="As on passport"
                  className="w-full bg-transparent border-0 outline-none focus:outline-none placeholder:text-[hsl(var(--blue-900))]/35 text-[14px] font-bold text-[hsl(var(--blue-900))]"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Email" Icon={Mail}>
                  <input
                    data-testid="apply-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-transparent border-0 outline-none focus:outline-none placeholder:text-[hsl(var(--blue-900))]/35 text-[14px] font-bold text-[hsl(var(--blue-900))]"
                  />
                </Field>
                <Field label="Mobile" Icon={Phone}>
                  <input
                    data-testid="apply-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9XXXX XXXXX"
                    className="w-full bg-transparent border-0 outline-none focus:outline-none placeholder:text-[hsl(var(--blue-900))]/35 text-[14px] font-bold text-[hsl(var(--blue-900))]"
                  />
                </Field>
              </div>

              {/* Compact fee summary */}
              <div className="rounded-2xl bg-[hsl(var(--soft-bg))] border border-black/5 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-2">
                  Estimate
                </div>
                <Row k="Application fee" v={inr(fees.application)} />
                {fees.requiresAppointment && fees.appointment > 0 && (
                  <Row k="Appointment / VFS" v={inr(fees.appointment)} />
                )}
                <Row k="GST (18%)" v={inr(fees.gst)} />
                <div className="mt-2 pt-2 border-t border-black/8 flex items-center justify-between">
                  <span className="text-[14px] font-display font-extrabold tracking-[-0.02em] text-[hsl(var(--blue-900))]">
                    Total payable
                  </span>
                  <span data-testid="apply-total" className="text-[18px] font-display font-extrabold tracking-[-0.02em] text-[hsl(var(--accent))] tabular-nums">
                    {inr(fees.total)}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-[11.5px] text-[hsl(var(--blue-900))]/60 px-1">
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
                <span>
                  Reviewing now creates a draft application. You&rsquo;ll upload
                  documents and pay only when you&rsquo;re ready to submit.
                </span>
              </div>
            </div>

            <footer className="px-5 sm:px-7 py-4 border-t border-black/5 flex items-center justify-between gap-3 bg-white">
              <button
                onClick={onClose}
                className="text-[13.5px] font-bold text-[hsl(var(--blue-900))]/70 hover:text-[hsl(var(--blue-900))]"
                data-testid="apply-review-cancel"
              >
                Cancel
              </button>
              <Button
                data-testid="apply-review-confirm"
                onClick={handleConfirm}
                disabled={submitting}
                className="rounded-full btn-accent text-white h-11 px-5 font-bold"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    Continue to documents <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, Icon, children }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-[hsl(var(--soft-bg))] border border-black/5 px-4 py-2.5 hover:border-[hsl(var(--blue-700))]/25 focus-within:border-[hsl(var(--blue-700))]/35 transition">
      {Icon && <Icon className="w-4 h-4 text-[hsl(var(--blue-900))]/55 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] uppercase tracking-[0.16em] font-bold text-[hsl(var(--blue-900))]/55">
          {label}
        </div>
        <div className="-mt-0.5">{children}</div>
      </div>
    </label>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between text-[13px] py-1">
      <span className="text-[hsl(var(--blue-900))]/65">{k}</span>
      <span className="font-bold text-[hsl(var(--blue-900))] tabular-nums">{v}</span>
    </div>
  );
}

const STEPS = [
  { id: 1, label: 'Review',         Icon: FileText },
  { id: 2, label: 'Documents',      Icon: ShieldCheck },
  { id: 3, label: 'Submit & Pay',   Icon: CreditCard },
];

function ProgressTrail({ current = 1 }) {
  return (
    <div className="flex items-center gap-1.5" data-testid="apply-review-trail">
      {STEPS.map((s, i) => {
        const active = current === s.id;
        const done = current > s.id;
        return (
          <div key={s.id} className="flex items-center gap-1.5">
            <span
              data-testid={`apply-review-step-${s.id}`}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.12em] transition ${
                active
                  ? 'bg-[hsl(var(--accent))] text-white'
                  : done
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))]/55'
              }`}
            >
              {done ? <Check className="w-3 h-3" /> : <s.Icon className="w-3 h-3" />}
              {s.id}. {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                className={`h-px w-3 sm:w-5 transition-colors ${
                  done ? 'bg-emerald-300' : 'bg-black/10'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

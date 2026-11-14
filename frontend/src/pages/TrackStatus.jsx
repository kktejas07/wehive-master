import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SuccessRibbon from '../components/SuccessRibbon';
import { API } from '../context/AuthContext';
import { Loader2, CheckCircle2, Clock, XCircle, AlertCircle, ChevronRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { BRAND } from '../data/mock';

const BLUE = { color: 'blue', bg: 'bg-[hsl(var(--blue-100))]', text: 'text-[hsl(var(--blue-700))]' };
const AMBER = { color: 'amber', bg: 'bg-amber-100', text: 'text-amber-700' };
const GREEN = { color: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-700' };
const RED = { color: 'red', bg: 'bg-red-100', text: 'text-red-700' };

// Every status the backend can set (routes_admin_cases.VALID_STATUSES + draft).
const STATUS_CONFIG = {
  draft: { color: 'slate', bg: 'bg-[hsl(var(--soft-bg))]', text: 'text-slate-700', icon: Clock, label: 'Draft', desc: 'Application started but not yet submitted' },
  submitted: { ...BLUE, icon: Clock, label: 'Submitted', desc: 'We have your application. A consultant will review it before it goes to the embassy.' },
  in_review: { ...AMBER, icon: AlertCircle, label: 'In Consular Review', desc: 'Your application is under review by the embassy/consulate' },
  appointment_scheduled: { ...BLUE, icon: Clock, label: 'Appointment Scheduled', desc: 'Your embassy or visa-centre appointment is booked' },
  docs_pending: { ...AMBER, icon: AlertCircle, label: 'Documents Pending', desc: 'We need more documents from you before this can move forward' },
  awaiting_docs: { ...AMBER, icon: AlertCircle, label: 'Awaiting Documents', desc: 'We need more documents from you before this can move forward' },
  biometrics_done: { ...BLUE, icon: CheckCircle2, label: 'Biometrics Done', desc: 'Your biometrics have been recorded' },
  interview_scheduled: { ...BLUE, icon: Clock, label: 'Interview Scheduled', desc: 'Your visa interview is booked' },
  cancelled: { color: 'slate', bg: 'bg-[hsl(var(--soft-bg))]', text: 'text-slate-700', icon: XCircle, label: 'Cancelled', desc: 'This application was cancelled' },
  approved: { ...GREEN, icon: CheckCircle2, label: 'Application Approved', desc: 'Your application has been approved' },
  visa_approved: { ...GREEN, icon: CheckCircle2, label: 'Visa Approved', desc: 'Congratulations! Your visa has been approved' },
  rejected: { ...RED, icon: XCircle, label: 'Application Rejected', desc: 'Your application was not approved this time' },
  visa_rejected: { ...RED, icon: XCircle, label: 'Visa Rejected', desc: 'Your visa application was not approved this time' },
  withdrawn: { color: 'slate', bg: 'bg-[hsl(var(--soft-bg))]', text: 'text-slate-700', icon: XCircle, label: 'Withdrawn', desc: 'This application was withdrawn' },
};

// A status this page does not know yet is shown by name, never as "Draft".
function statusConfig(status) {
  return STATUS_CONFIG[status] || {
    ...BLUE, icon: Clock, desc: '',
    label: String(status || 'In progress').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
  };
}

function TimelineStep({ step, isLast }) {
  const isDone = true; // every step shown is an event that has happened
  const isCurrent = isLast;
  const cfg = statusConfig(step.status);
  const Icon = cfg.icon;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isDone ? cfg.bg : 'bg-[hsl(var(--soft-bg))]'}`}>
          <Icon className={`w-5 h-5 ${isDone ? cfg.text : 'text-muted-foreground'}`} />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 my-1 bg-emerald-300" />
        )}
      </div>
      <div className="pb-6 flex-1">
        <div className={`text-[14px] font-bold ${isDone ? 'text-[hsl(var(--blue-900))]' : 'text-muted-foreground'}`}>
          {step.label}
        </div>
        {isCurrent && (
          <div className="text-[13px] text-muted-foreground mt-0.5">{cfg.desc}</div>
        )}
        {step.note && (
          <div className="mt-1.5 text-[13px] text-muted-foreground bg-[hsl(var(--soft-bg))] rounded-xl px-3 py-2 italic">
            {step.note}
          </div>
        )}
        {step.at && (
          <div className="text-[12px] text-muted-foreground mt-1">
            {new Date(step.at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackStatus() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSuccessRibbon, setShowSuccessRibbon] = useState(false);
  useEffect(() => {
    axios.get(`${API}/public/track/${id}`)
      .then((r) => {
        setApp(r.data);
        setLoading(false);
        if (r.data.status === 'approved') {
          setTimeout(() => setShowSuccessRibbon(true), 1000);
        }
      })
      .catch((e) => { setError(e?.response?.data?.detail || 'Application not found'); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="bg-[hsl(var(--soft-bg))] min-h-screen">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[hsl(var(--soft-bg))] min-h-screen">
        <Navbar />
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-5">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <div className="text-center">
            <h2 className="font-display font-bold text-[26px] text-[hsl(var(--blue-900))] leading-tight">{error}</h2>
            <p className="mt-2 text-[14px] text-muted-foreground">Please check your application ID and try again.</p>
          </div>
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-xl btn-primary text-white h-11 px-6 font-semibold text-[14px]">
            Go to WeHive <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const cfg = statusConfig(app.status);
  const Icon = cfg.icon;
  // The real history from the server, oldest first; the last entry is the current state.
  const timelineSteps = (app.timeline || []).map((entry, i) => ({
    key: entry.id || i,
    status: entry.status,
    label: entry.label || statusConfig(entry.status).label,
    note: entry.note,
    at: entry.at,
  }));

  return (
    <div className="bg-[hsl(var(--soft-bg))] min-h-screen">
      <SuccessRibbon
        isVisible={showSuccessRibbon}
        onClose={() => setShowSuccessRibbon(false)}
        applicationId={id}
        applicantName={app?.name || app?.applicant_name || 'Traveler'}
      />
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="max-w-2xl mx-auto px-5">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              Visa Application Tracker
            </div>
            <h1 className="font-display font-bold text-[32px] sm:text-[40px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-tight">
              {app.country_name || app.country_id?.toUpperCase()} · {app.visa_type}
            </h1>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Application ID: <span className="font-mono font-bold">#{id?.slice(0, 8).toUpperCase()}</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-2xl ${cfg.bg} border border-[hsl(var(--border))] p-6 sm:p-8 mb-6 text-center`}
          >
            <div className={`inline-flex h-16 w-16 rounded-full ${cfg.bg} items-center justify-center mb-4`}>
              <Icon className={`w-8 h-8 ${cfg.text}`} />
            </div>
            <div className={`text-[22px] font-display font-bold ${cfg.text}`}>{cfg.label}</div>
            <div className="mt-1 text-[14px] text-muted-foreground">{cfg.desc}</div>
            {app.estimated_date && (
              <div className="mt-3 inline-flex items-center gap-1.5 bg-white/80 rounded-full px-4 py-1.5 text-[12px] font-bold text-[hsl(var(--blue-900))]">
                <Clock className="w-3.5 h-3.5" />
                Est. result by: {app.estimated_date}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-white border border-[hsl(var(--border))] p-6 sm:p-8"
          >
            <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground mb-6">
              Application Timeline
            </div>
            <div>
              {timelineSteps.map((step, i) => (
                <TimelineStep
                  key={step.key}
                  step={step}
                  isLast={i === timelineSteps.length - 1}
                />
              ))}
            </div>
          </motion.div>

          <motion.div
          >
            <div className="text-[14px] text-muted-foreground">
              Need help? Contact our consultant team
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
              <a
                href={`https://wa.me/${BRAND.consultantPhoneRaw.slice(1)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-white border border-[hsl(var(--border))] text-[hsl(var(--blue-900))] h-11 px-5 text-[14px] font-semibold hover:border-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-700))] transition-colors"
              >
                <span>WhatsApp Us</span>
              </a>
              <a
                href={`tel:${BRAND.consultantPhoneRaw}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--blue-700))] text-white h-11 px-5 text-[14px] font-semibold hover:bg-[hsl(var(--blue-800))] transition-colors"
              >
                Call {BRAND.consultantPhone}
              </a>
            </div>
          </motion.div>

          <div className="mt-8 text-center">
            <Link to="/" className="inline-flex items-center gap-1.5 min-h-[44px] text-[14px] font-semibold text-[hsl(var(--blue-700))] hover:underline">
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to WeHive
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
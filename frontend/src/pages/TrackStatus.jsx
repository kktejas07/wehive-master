import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SuccessRibbon from '../components/SuccessRibbon';
import { API } from '../context/AuthContext';
import { Loader2, CheckCircle2, Clock, XCircle, AlertCircle, ChevronRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_CONFIG = {
  draft: { color: 'slate', bg: 'bg-slate-100', text: 'text-slate-700', icon: Clock, label: 'Draft', desc: 'Application started but not yet submitted' },
  submitted: { color: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock, label: 'Submitted to Embassy', desc: 'Your application has been submitted and is being processed' },
  in_review: { color: 'amber', bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertCircle, label: 'In Consular Review', desc: 'Your application is under review by the embassy/consulate' },
  approved: { color: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2, label: 'Visa Approved', desc: 'Congratulations! Your visa has been approved' },
  rejected: { color: 'red', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Visa Rejected', desc: 'Your visa application was not approved this time' },
};

const STATUS_ORDER = ['draft', 'submitted', 'in_review', 'approved', 'rejected'];

function TimelineStep({ step, currentStatus, isLast }) {
  const order = STATUS_ORDER.indexOf(currentStatus);
  const stepOrder = STATUS_ORDER.indexOf(step.key);
  const isDone = stepOrder <= order;
  const isCurrent = step.key === currentStatus;
  const cfg = STATUS_CONFIG[step.key];
  const Icon = cfg.icon;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isDone ? cfg.bg : 'bg-slate-100'}`}>
          <Icon className={`w-5 h-5 ${isDone ? cfg.text : 'text-slate-400'}`} />
        </div>
        {!isLast && (
          <div className={`w-0.5 flex-1 my-1 ${isDone && stepOrder < order ? 'bg-emerald-300' : 'bg-slate-200'}`} />
        )}
      </div>
      <div className="pb-6 flex-1">
        <div className={`text-[14px] font-bold ${isDone ? 'text-[hsl(var(--blue-900))]' : 'text-slate-400'}`}>
          {step.label}
        </div>
        {isCurrent && (
          <div className="text-[12.5px] text-[hsl(var(--blue-900))]/55 mt-0.5">{cfg.desc}</div>
        )}
        {step.note && (
          <div className="mt-1.5 text-[12.5px] text-[hsl(var(--blue-900))]/60 bg-[hsl(var(--soft-bg))] rounded-xl px-3 py-2 italic">
            {step.note}
          </div>
        )}
        {step.at && (
          <div className="text-[11px] text-[hsl(var(--blue-900))]/40 mt-1">
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
            <h2 className="font-display font-extrabold text-[26px] text-[hsl(var(--blue-900))]">{error}</h2>
            <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/55">Please check your application ID and try again.</p>
          </div>
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-full btn-primary text-white h-11 px-6 font-bold text-[13px]">
            Go to WeHive <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  const timeline = app.timeline || [];
  const timelineSteps = STATUS_ORDER.map((key) => {
    const entry = timeline.find((t) => t.status === key);
    return { key, label: STATUS_CONFIG[key].label, note: entry?.note, at: entry?.at };
  });

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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-bold text-[hsl(var(--accent))] mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              Visa Application Tracker
            </div>
            <h1 className="font-display font-extrabold text-[32px] sm:text-[40px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
              {app.country_name || app.country_id?.toUpperCase()} · {app.visa_type}
            </h1>
            <p className="mt-2 text-[13px] text-[hsl(var(--blue-900))]/55">
              Application ID: <span className="font-mono font-bold">#{id?.slice(0, 8).toUpperCase()}</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-3xl ${cfg.bg} border border-black/5 p-6 sm:p-8 mb-6 text-center`}
          >
            <div className={`inline-flex h-16 w-16 rounded-full ${cfg.bg} items-center justify-center mb-4`}>
              <Icon className={`w-8 h-8 ${cfg.text}`} />
            </div>
            <div className={`text-[22px] font-display font-extrabold ${cfg.text}`}>{cfg.label}</div>
            <div className="mt-1 text-[14px] text-[hsl(var(--blue-900))]/60">{cfg.desc}</div>
            {app.estimated_date && (
              <div className="mt-3 inline-flex items-center gap-1.5 bg-white/80 rounded-full px-4 py-1.5 text-[12px] font-bold text-[hsl(var(--blue-900))]">
                <Clock className="w-3.5 h-3.5" />
                Est. result by: {app.estimated_date}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8"
          >
            <div className="text-[12px] uppercase tracking-[0.16em] font-bold text-[hsl(var(--blue-900))]/55 mb-6">
              Application Timeline
            </div>
            <div>
              {timelineSteps.map((step, i) => (
                <TimelineStep
                  key={step.key}
                  step={step}
                  currentStatus={app.status}
                  isLast={i === timelineSteps.length - 1}
                />
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 rounded-3xl bg-white border border-black/5 p-6 sm:p-8 text-center"
          >
            <div className="text-[14px] text-[hsl(var(--blue-900))]/60">
              Need help? Contact our consultant team
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://wa.me/919113256726"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 text-white h-10 px-5 text-[13px] font-bold hover:bg-emerald-600 transition"
              >
                <span>WhatsApp Us</span>
              </a>
              <a
                href="tel:+919113256726"
                className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--blue-700))] text-white h-10 px-5 text-[13px] font-bold hover:bg-[hsl(var(--blue-800))] transition"
              >
                Call +91 91132 56726
              </a>
            </div>
          </motion.div>

          <div className="mt-8 text-center">
            <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline">
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to WeHive
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
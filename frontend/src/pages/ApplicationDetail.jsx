import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2, MessageSquare } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import DocumentChecklist, { getReadyCount, DocumentExpirationWarnings } from '../components/DocumentChecklist';
import ApplicationTimeline from '../components/ApplicationTimeline';
import ConsultantChat from '../components/ConsultantChat';
import AIScanModal from '../components/ai/AIScanModal';
import AICoverLetterModal from '../components/ai/AICoverLetterModal';
import AIItineraryModal from '../components/ai/AIItineraryModal';
import AIRiskAnalysisModal from '../components/ai/AIRiskAnalysisModal';
import ApplicationFormCard from '../components/ApplicationFormCard';
import ApplicationHero from '../components/application/ApplicationHero';
import WhatsNextCard from '../components/application/WhatsNextCard';
import ApplicationTimelineSection from '../components/application/ApplicationTimelineSection';

function EmbassyAppointmentCard({ app, id, token, onRefresh }) {
  const { toast } = useToast();
  const [fees, setFees] = useState(null);
  const [bookingDone, setBookingDone] = useState(!!app?.form_data?.visa_appointment?.date);
  const [appt, setAppt] = useState({
    date: app?.form_data?.visa_appointment?.date || '',
    location: app?.form_data?.visa_appointment?.location || '',
    reference: app?.form_data?.visa_appointment?.reference || '',
    time: app?.form_data?.visa_appointment?.time || '',
  });
  const [saving, setSaving] = useState(false);

  const showCard = ['appointment_scheduled', 'awaiting_docs', 'in_review', 'submitted', 'biometrics_done', 'interview_scheduled'].includes(app?.status);

  useEffect(() => {
    if (!showCard || !app?.country_id) return;
    const country = app.country_id;
    const category = app.visa_type || 'tourist';
    axios.get(`${API}/embassy-fees?country=${country}&visa_category=${category}`)
      .then((r) => setFees(r.data?.fees || []))
      .catch(() => setFees([]));
  }, [app?.country_id, app?.visa_type, showCard]);

  if (!showCard) return null;

  const totalRequired = (fees || []).filter((f) => f.required).reduce((s, f) => s + (f.amount || 0), 0);
  const vfsUrl = fees?.[0]?.vfs_booking_url || null;

  const saveAppt = async () => {
    if (!appt.date) { toast({ title: 'Please enter the appointment date' }); return; }
    setSaving(true);
    try {
      await axios.patch(
        `${API}/users/me/applications/${id}/appointment`,
        { date: appt.date, location: appt.location, reference: appt.reference, time: appt.time },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: 'Appointment saved' });
      setBookingDone(true);
      onRefresh?.();
    } catch (e) {
      toast({ title: 'Could not save', description: e?.response?.data?.detail || 'Try again' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white border border-border shadow-sm p-5 sm:p-8">
      <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))]">Embassy Appointment</div>
      <h2 className="mt-1 font-display font-bold text-[22px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
        Book &amp; Record Appointment
      </h2>

      {fees && fees.length > 0 && (
        <div className="mt-4 rounded-xl border border-border overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[hsl(var(--soft-bg))]">
                <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">Fee</th>
                <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">Amount</th>
                <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">Required</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((f, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-2.5 text-[hsl(var(--blue-900))]">{f.label}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-[hsl(var(--blue-900))]">${f.amount?.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {f.required
                      ? <span className="text-emerald-700 font-bold">Yes</span>
                      : <span className="text-muted-foreground">Optional</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-[hsl(var(--soft-bg))] border-t border-border text-[13px] font-bold text-[hsl(var(--blue-900))]">
            Total required: ${totalRequired.toFixed(2)}
          </div>
        </div>
      )}

      {vfsUrl && (
        <a
          href={vfsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-xl btn-primary text-white px-5 h-11 text-[14px] font-bold"
        >
          Book Appointment →
        </a>
      )}

      <div className="mt-5 border-t border-border pt-5">
        <div className="text-[13px] font-bold text-[hsl(var(--blue-900))] mb-3">
          {bookingDone ? 'Appointment Recorded' : 'Record Appointment Details'}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11.5px] uppercase tracking-wide font-bold text-muted-foreground">Date</span>
            <input type="date" value={appt.date} onChange={(e) => setAppt((a) => ({ ...a, date: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-xl border border-border outline-none focus:border-[hsl(var(--blue-700))] text-[14px] text-[hsl(var(--blue-900))]" />
          </label>
          <label className="block">
            <span className="text-[11.5px] uppercase tracking-wide font-bold text-muted-foreground">Time</span>
            <input type="time" value={appt.time} onChange={(e) => setAppt((a) => ({ ...a, time: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-xl border border-border outline-none focus:border-[hsl(var(--blue-700))] text-[14px] text-[hsl(var(--blue-900))]" />
          </label>
          <label className="block">
            <span className="text-[11.5px] uppercase tracking-wide font-bold text-muted-foreground">Location</span>
            <input type="text" placeholder="City / Consulate" value={appt.location} onChange={(e) => setAppt((a) => ({ ...a, location: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-xl border border-border outline-none focus:border-[hsl(var(--blue-700))] text-[14px] text-[hsl(var(--blue-900))] placeholder:text-muted-foreground" />
          </label>
          <label className="block">
            <span className="text-[11.5px] uppercase tracking-wide font-bold text-muted-foreground">Booking Reference</span>
            <input type="text" placeholder="e.g. VFS-123456" value={appt.reference} onChange={(e) => setAppt((a) => ({ ...a, reference: e.target.value }))}
              className="mt-1 w-full h-10 px-3 rounded-xl border border-border outline-none focus:border-[hsl(var(--blue-700))] text-[14px] text-[hsl(var(--blue-900))] placeholder:text-muted-foreground" />
          </label>
        </div>
        <button
          onClick={saveAppt}
          disabled={saving}
          className="mt-4 h-10 px-6 rounded-xl btn-accent text-white text-[13px] font-bold disabled:opacity-60 inline-flex items-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Appointment
        </button>
      </div>
    </section>
  );
}

const PREP_GROUPS = [
  {
    group: 'Documents to bring',
    items: [
      'Original passport + photocopies',
      'Visa application fee receipt',
      'Offer letter from university',
      'Financial proof (bank statement, sponsor letter)',
    ],
  },
  {
    group: 'Questions to prepare',
    items: [
      'Why this university?',
      'How will you fund your studies?',
      'What will you do after graduating?',
      'Do you have family / ties back home?',
    ],
  },
];
const PREP_ALL = PREP_GROUPS.flatMap((g) => g.items);

function InterviewPrepCard({ app }) {
  const [checked, setChecked] = useState(Array(PREP_ALL.length).fill(false));
  const show =
    ['approved', 'visa_approved', 'in_review', 'interview_scheduled'].includes(app?.status) ||
    !!app?.form_data?.visa_appointment?.date;
  if (!show) return null;

  const doneCount = checked.filter(Boolean).length;
  const allDone = doneCount === PREP_ALL.length;
  const toggle = (i) => setChecked((c) => { const n = [...c]; n[i] = !n[i]; return n; });

  let idx = 0;
  return (
    <section className="rounded-2xl bg-white border border-border shadow-sm p-5 sm:p-8">
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="w-4 h-4 text-[hsl(var(--blue-700))]" />
        <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))]">
          Embassy Interview Prep
        </div>
      </div>
      <div className="text-[13px] text-muted-foreground mb-3">{doneCount} of {PREP_ALL.length} prepared</div>
      <div className="h-2 rounded-full bg-[#E8EDF8] overflow-hidden mb-4">
        <div
          className="h-2 bg-[#011CB5] rounded-full transition-all duration-300"
          style={{ width: `${(doneCount / PREP_ALL.length) * 100}%` }}
        />
      </div>
      {allDone && (
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-[13px] font-semibold text-emerald-800">
          ✓ You&apos;re ready for your interview! Good luck.
        </div>
      )}
      {PREP_GROUPS.map((grp) => (
        <div key={grp.group} className="mb-4 last:mb-0">
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-muted-foreground mb-2">
            {grp.group}
          </div>
          <div className="space-y-2">
            {grp.items.map((item) => {
              const i = idx++;
              return (
                <label key={item} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked[i]}
                    onChange={() => toggle(i)}
                    className="mt-0.5 w-4 h-4 rounded accent-[#011CB5] cursor-pointer shrink-0"
                  />
                  <span className={`text-[13.5px] leading-snug ${checked[i] ? 'line-through text-gray-400' : 'text-[hsl(var(--blue-900))]'}`}>
                    {item}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

export default function ApplicationDetail() {
  const { id } = useParams();
  const { token, isAuthed, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [country, setCountry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [docs, setDocs] = useState([]);
  const [scanOpen, setScanOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [itineraryOpen, setItineraryOpen] = useState(false);
  const [riskOpen, setRiskOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthed) navigate('/login', { replace: true });
  }, [authLoading, isAuthed, navigate]);

  const refresh = async () => {
    let r;
    try {
      r = await axios.get(`${API}/users/me/applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404 || status === 403) {
        navigate('/account?tab=applications', { replace: true });
      } else {
        setLoadError(true);
        toast({ title: 'Could not load application', description: 'Please try again.' });
      }
      setLoading(false);
      return;
    }
    setLoadError(false);
    setApp(r.data);
    try {
      const cr = await axios.get(`${API}/countries/${r.data.country_id}`);
      setCountry(cr.data);
    } catch {
      // Country details are secondary — fall back to a minimal shape so the page still renders.
      setCountry((c) => c || { id: r.data.country_id, name: r.data.country_id?.toUpperCase() || 'Destination', flag: '' });
      toast({ title: 'Could not load destination details', description: 'Some document requirements may be missing.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && id) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const requiredDocs = country?.categories?.[app?.visa_type]?.documents || [];
  const readyCount = getReadyCount(docs, requiredDocs);
  const canSubmit = requiredDocs.length > 0 && readyCount === requiredDocs.length && app?.status === 'draft';

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/users/me/applications/${id}/submit`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: 'Submitted', description: 'Your file is on its way to the embassy.' });
      await refresh();
    } catch (e) {
      toast({ title: 'Could not submit', description: e?.response?.data?.detail || 'Try again' });
    } finally {
      setSubmitting(false);
    }
  };

  const onDownloadReceipt = async () => {
    try {
      const r = await axios.get(`${API}/users/me/applications/${id}/receipt.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wehive-receipt-${id.slice(0, 8)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Could not download receipt' });
    }
  };

  if (loadError && !app) {
    return (
      <div className="bg-white">
        <Navbar />
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-[16px] font-semibold text-[hsl(var(--blue-900))]">We couldn&rsquo;t load this application.</p>
          <button
            type="button"
            onClick={() => { setLoading(true); refresh(); }}
            className="rounded-xl btn-accent text-white h-11 px-6 font-semibold"
          >
            Try again
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  if (loading || !app || !country) {
    return (
      <div className="bg-white">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-white">
      <Navbar />

      <ApplicationHero
        app={app}
        country={country}
        readyCount={readyCount}
        requiredDocs={requiredDocs}
        submitting={submitting}
        canSubmit={canSubmit}
        onScan={() => setScanOpen(true)}
        onCoverLetter={() => setCoverOpen(true)}
        onItinerary={() => setItineraryOpen(true)}
        onRiskAnalysis={() => setRiskOpen(true)}
        onDownloadReceipt={onDownloadReceipt}
        onSubmit={onSubmit}
      />

      {/* Visa outcome banners */}
      {app.status === 'visa_approved' && (
        <div className="bg-emerald-50 border-b border-emerald-200 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-emerald-100 border border-emerald-300 p-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <div className="text-emerald-800 font-bold text-[16px]">🎉 Visa Approved!</div>
                {(app.visa_validity_from || app.visa_validity_until) && (
                  <div className="text-[13px] text-emerald-700 mt-1">
                    Valid {app.visa_validity_from ? new Date(app.visa_validity_from).toLocaleDateString() : ''}{app.visa_validity_until ? ` – ${new Date(app.visa_validity_until).toLocaleDateString()}` : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {app.status === 'visa_rejected' && (
        <div className="bg-red-50 border-b border-red-200 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-red-50 border border-red-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="text-red-800 font-bold text-[16px]">Application Not Approved</div>
                <div className="text-[13px] text-red-700 mt-1">
                  {app.rejection_reason || 'Please contact your consultant for details and next steps.'}
                </div>
              </div>
              <button
                onClick={() => navigate('/')}
                className="shrink-0 px-5 py-2.5 rounded-xl bg-[hsl(var(--blue-700))] text-white text-[13px] font-bold hover:bg-[hsl(var(--blue-900))] transition-colors"
              >
                Start New Application
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="py-8 sm:py-12 bg-[hsl(var(--soft-bg))]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-6 lg:gap-8">
          <div className="lg:col-span-7 min-w-0 space-y-6">
            <ApplicationFormCard
              application={app}
              onUpdated={(form) => setApp((a) => ({ ...a, form_data: form }))}
            />
            <DocumentChecklist
              applicationId={id}
              requiredDocs={requiredDocs}
              token={token}
              onDocsChange={setDocs}
            />
            <InterviewPrepCard app={app} />
            <EmbassyAppointmentCard app={app} id={id} token={token} onRefresh={refresh} />
            <ApplicationTimelineSection app={app} TimelineComponent={ApplicationTimeline} />
          </div>
          <aside className="lg:col-span-5 min-w-0 space-y-6">
            <ConsultantChat applicationId={id} token={token} />
            <WhatsNextCard />
          </aside>
        </div>
      </section>

      <Footer />

      <AIScanModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        applicationId={id}
        onApplied={() => refresh()}
      />
      <AICoverLetterModal
        open={coverOpen}
        onClose={() => setCoverOpen(false)}
        applicationId={id}
        country_id={app?.country_id}
        visa_type={app?.visa_type}
        formData={app?.form_data}
      />
      <AIItineraryModal
        open={itineraryOpen}
        onClose={() => setItineraryOpen(false)}
        applicationId={id}
        country_id={app?.country_id}
      />
      <AIRiskAnalysisModal
        open={riskOpen}
        onClose={() => setRiskOpen(false)}
        applicationId={id}
      />
    </div>
  );
}

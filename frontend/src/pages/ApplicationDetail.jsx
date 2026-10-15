import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
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

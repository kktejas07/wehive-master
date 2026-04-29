import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import DocumentChecklist, { getReadyCount } from '../components/DocumentChecklist';
import ApplicationTimeline from '../components/ApplicationTimeline';
import ConsultantChat from '../components/ConsultantChat';
import AIScanModal from '../components/AIScanModal';
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
  const [submitting, setSubmitting] = useState(false);
  const [docs, setDocs] = useState([]);
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthed) navigate('/login', { replace: true });
  }, [authLoading, isAuthed, navigate]);

  const refresh = async () => {
    try {
      const r = await axios.get(`${API}/users/me/applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApp(r.data);
      const cr = await axios.get(`${API}/countries/${r.data.country_id}`);
      setCountry(cr.data);
    } catch {
      navigate('/account?tab=applications', { replace: true });
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
        onDownloadReceipt={onDownloadReceipt}
        onSubmit={onSubmit}
      />

      <section className="py-14">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
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
          <aside className="lg:col-span-5 space-y-6">
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
    </div>
  );
}

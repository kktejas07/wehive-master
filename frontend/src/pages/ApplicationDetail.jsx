import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import {
  ChevronRight, Download, Send, Loader2, FileText, Headphones, Map,
} from 'lucide-react';
import DocumentChecklist, { getReadyCount } from '../components/DocumentChecklist';
import ApplicationTimeline from '../components/ApplicationTimeline';
import ConsultantChat from '../components/ConsultantChat';
import { COUNTRIES } from '../data/mock';

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

  useEffect(() => {
    if (!authLoading && !isAuthed) navigate('/login', { replace: true });
  }, [authLoading, isAuthed, navigate]);

  const refresh = async () => {
    try {
      const r = await axios.get(`${API}/users/me/applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApp(r.data);
      // Fetch country categories to know the document list
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

  const heroImg = COUNTRIES.find((c) => c.id === app.country_id)?.image;

  return (
    <div className="bg-white">
      <Navbar />

      <section className="pt-28 pb-10 bg-[hsl(var(--soft-bg))] border-b border-black/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-1.5 text-[13px] text-[hsl(var(--blue-900))]/55">
            <Link to="/account?tab=applications" className="hover:text-[hsl(var(--blue-700))]">My applications</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[hsl(var(--blue-900))] font-bold">
              {country.name} · {app.visa_type}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div className="flex items-center gap-5">
              {heroImg && (
                <div className="hidden sm:block relative h-20 w-20 rounded-2xl overflow-hidden">
                  <img src={heroImg} alt={country.name} className="absolute inset-0 h-full w-full object-cover" />
                </div>
              )}
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
                  Application #{id.slice(0, 8).toUpperCase()}
                </div>
                <h1 className="mt-1 font-display font-extrabold text-[34px] sm:text-[48px] leading-[1.0] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
                  <span className="text-[28px] sm:text-[40px] mr-2">{country.flag}</span>
                  {country.name}{' '}
                  <span className="text-[hsl(var(--accent))]">{app.visa_type}</span>
                </h1>
                <div className="mt-1 text-[13.5px] text-[hsl(var(--blue-900))]/65">
                  Status: <span className="font-bold capitalize">{(app.status || 'draft').replace('_', ' ')}</span>
                  {' · '}{readyCount}/{requiredDocs.length} docs ready
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={onDownloadReceipt}
                variant="outline"
                className="rounded-full h-11 px-5 font-bold border-black/10 hover:border-[hsl(var(--blue-700))]/30"
              >
                <Download className="w-4 h-4 mr-1" /> Download receipt
              </Button>
              <Button
                onClick={onSubmit}
                disabled={!canSubmit || submitting}
                className="rounded-full btn-accent text-white h-11 px-6 font-bold disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Send className="w-4 h-4" />
                    {app.status === 'draft' ? 'Submit application' : 'Already submitted'}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <DocumentChecklist
              applicationId={id}
              requiredDocs={requiredDocs}
              token={token}
              onDocsChange={setDocs}
            />

            <section className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8">
              <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
                Application timeline
              </div>
              <h2 className="mt-1 font-display font-extrabold text-[24px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
                Track every step
              </h2>
              <div className="mt-6">
                <ApplicationTimeline events={app.timeline || []} currentStatus={app.status} />
              </div>
            </section>
          </div>

          <aside className="lg:col-span-5 space-y-6">
            <ConsultantChat applicationId={id} token={token} />

            <section className="rounded-3xl bg-[hsl(var(--blue-900))] text-white p-6 sm:p-7 relative overflow-hidden">
              <div className="absolute -top-16 -right-16 h-[180px] w-[180px] rounded-full bg-[hsl(var(--accent))]/25 blur-3xl" />
              <div className="relative">
                <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-white/70 inline-flex items-center gap-2">
                  <Map className="w-3.5 h-3.5 text-[hsl(var(--accent))]" /> What happens next
                </div>
                <h3 className="mt-2 font-display font-extrabold text-[22px] tracking-[-0.025em]">
                  We take it from here.
                </h3>
                <ul className="mt-4 space-y-3 text-[13.5px] text-white/85">
                  {[
                    { id: 'n1', Icon: FileText, t: 'We verify every document', d: 'Your consultant double-checks each upload before submission.' },
                    { id: 'n2', Icon: Send, t: 'Embassy filing', d: 'We file with the consulate and lock your appointment slot.' },
                    { id: 'n3', Icon: Headphones, t: 'Real-time updates', d: 'You\'ll see status changes live and on email/WhatsApp.' },
                  ].map((n) => {
                    const Icon = n.Icon;
                    return (
                      <li key={n.id} className="flex gap-3">
                        <span className="h-9 w-9 shrink-0 rounded-lg bg-white/10 inline-flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="text-[14px] font-bold">{n.t}</div>
                          <div className="text-[12.5px] text-white/65">{n.d}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          </aside>
        </div>
      </section>

      <Footer />
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, AlertCircle, Loader2, MailX, Home } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import StatusRibbon from '../components/ui/StatusRibbon';
import { API } from '../lib/apiBase';

const COPY = {
  confirm: {
    working: 'Confirming your subscription…',
    okTitle: 'You’re subscribed',
    okBody: 'We’ll email you when visa rules change, slots open up or deadlines get close.',
    ribbon: 'Subscription confirmed',
  },
  unsubscribe: {
    working: 'Unsubscribing…',
    okTitle: 'You’ve been unsubscribed',
    okBody: 'You won’t get any more newsletter emails or WhatsApp updates from us. You can sign up again from the footer at any time.',
    ribbon: 'Unsubscribed',
  },
};

export default function NewsletterStatus() {
  const { action } = useParams();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const mode = action === 'unsubscribe' ? 'unsubscribe' : 'confirm';
  const copy = COPY[mode];
  const [state, setState] = useState({ status: 'working', error: '' });
  const [ribbonOpen, setRibbonOpen] = useState(false);
  const closeRibbon = useCallback(() => setRibbonOpen(false), []);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    if (!token) {
      setState({ status: 'error', error: 'This link is missing its token. Open the link from your email again.' });
      setRibbonOpen(true);
      return;
    }
    axios
      .post(`${API}/newsletter/${mode}`, { token })
      .then(() => setState({ status: 'ok', error: '' }))
      .catch((err) => {
        const detail = err?.response?.data?.detail;
        setState({
          status: 'error',
          error: typeof detail === 'string' ? detail : 'We couldn’t reach the server. Please try the link again.',
        });
      })
      .finally(() => setRibbonOpen(true));
  }, [mode, token]);

  const ok = state.status === 'ok';
  const working = state.status === 'working';

  return (
    <div className="bg-white">
      <Navbar />
      <StatusRibbon
        open={ribbonOpen && !working}
        variant={ok ? 'success' : 'error'}
        title={ok ? copy.ribbon : 'Link didn’t work'}
        message={ok ? null : state.error}
        onClose={closeRibbon}
      />
      <main className="min-h-[70vh] flex items-center px-4 pt-28 md:pt-36 pb-16 md:pb-24" data-testid={`newsletter-${mode}`}>
        <div className="max-w-xl w-full mx-auto text-center" aria-live="polite">
          <span className="icon-tile h-14 w-14 rounded-2xl">
            {working && <Loader2 className="w-7 h-7 animate-spin" aria-hidden="true" />}
            {ok && mode === 'confirm' && <CheckCircle2 className="w-7 h-7" aria-hidden="true" />}
            {ok && mode === 'unsubscribe' && <MailX className="w-7 h-7" aria-hidden="true" />}
            {state.status === 'error' && <AlertCircle className="w-7 h-7" aria-hidden="true" />}
          </span>
          <div className="eyebrow mt-6">Newsletter</div>
          <h1 className="h-display mt-3">
            {working ? copy.working : ok ? copy.okTitle : 'This link didn’t work'}
          </h1>
          {!working && <p className="lead mt-4">{ok ? copy.okBody : state.error}</p>}
          {!working && (
            <div className="mt-8 flex justify-center">
              <Button variant="accent" asChild className="h-12 px-6 text-[15px]">
                <Link to="/">
                  <Home className="w-4 h-4" aria-hidden="true" />
                  Go to We Hive
                </Link>
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { useCallback, useState } from 'react';
import axios from 'axios';
import { Mail, Loader2, ArrowRight } from 'lucide-react';
import { API } from '../lib/apiBase';
import { BRAND } from '../data/mock';
import StatusRibbon from './ui/StatusRibbon';

function WhatsAppIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.22 4.25-9.47 9.48-9.47 2.53 0 4.91.99 6.7 2.78a9.4 9.4 0 0 1 2.77 6.7c0 5.22-4.25 9.47-9.47 9.47zm8.06-17.53A11.32 11.32 0 0 0 12.04.62C5.76.62.65 5.73.65 12.01c0 2 .52 3.96 1.52 5.69L.55 23.6l6.04-1.58a11.36 11.36 0 0 0 5.44 1.39h.01c6.28 0 11.39-5.11 11.39-11.39 0-3.04-1.18-5.9-3.33-8.05z" />
    </svg>
  );
}

// Pull a readable message out of the API's error shape ({detail: string | [{msg}]}).
function errorMessage(err) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) {
    const field = detail[0]?.loc?.[detail[0].loc.length - 1];
    if (field === 'email') return 'Enter a valid email address.';
    return String(detail[0].msg || '').replace(/^Value error,\s*/i, '');
  }
  if (err?.response?.status === 429) return 'Too many attempts. Please wait a minute and try again.';
  return 'We couldn’t reach the server. Check your connection and try again.';
}

const inputClass =
  'w-full h-12 rounded-xl border border-white/15 bg-white/5 px-4 text-[16px] text-white placeholder:text-white/45 ' +
  'focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25 transition-colors duration-200';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ribbon, setRibbon] = useState(null);
  const closeRibbon = useCallback(() => setRibbon(null), []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!consent) {
      setRibbon({ variant: 'error', title: 'One more step', message: 'Tick the box to agree to receive updates.' });
      return;
    }
    setBusy(true);
    setRibbon(null);
    try {
      const { data } = await axios.post(`${API}/newsletter/subscribe`, {
        email: email.trim(),
        whatsapp: whatsapp.trim() || null,
        consent: true,
        source: 'footer',
      });
      setRibbon({ variant: 'success', title: 'Almost there!', message: data?.message });
      setEmail('');
      setWhatsapp('');
      setConsent(false);
    } catch (err) {
      setRibbon({ variant: 'error', title: 'Subscription failed', message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="newsletter-heading" className="border-b border-white/10 pb-12 mb-12" data-testid="newsletter-signup">
      <StatusRibbon
        open={!!ribbon}
        variant={ribbon?.variant}
        title={ribbon?.title}
        message={ribbon?.message}
        onClose={closeRibbon}
      />
      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-5">
          <p className="text-[12px] uppercase tracking-[0.14em] font-semibold text-white/60">Newsletter</p>
          <h2 id="newsletter-heading" className="mt-2 font-display font-bold text-[24px] sm:text-[28px] leading-tight text-white">
            Visa news before it affects your trip
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/75 max-w-md">
            Rule changes, appointment-slot openings and study-abroad deadlines. About two emails a month; unsubscribe any time.
          </p>
          <a
            href={`https://wa.me/${BRAND.whatsappRaw}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-white hover:underline underline-offset-4"
            data-testid="newsletter-whatsapp-link"
          >
            <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
            Prefer WhatsApp? Message us on {BRAND.whatsapp}
          </a>
        </div>

        <form onSubmit={onSubmit} noValidate className="lg:col-span-7 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label htmlFor="newsletter-email" className="block text-[13px] font-semibold text-white/85 mb-1.5">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" aria-hidden="true" />
              <input
                id="newsletter-email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`${inputClass} pl-11`}
                data-testid="newsletter-email"
              />
            </div>
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="newsletter-whatsapp" className="block text-[13px] font-semibold text-white/85 mb-1.5">
              WhatsApp number <span className="font-normal text-white/60">(optional)</span>
            </label>
            <div className="relative">
              <WhatsAppIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                id="newsletter-whatsapp"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+91 98765 43210"
                aria-describedby="newsletter-whatsapp-hint"
                className={`${inputClass} pl-11`}
                data-testid="newsletter-whatsapp"
              />
            </div>
            <p id="newsletter-whatsapp-hint" className="mt-1.5 text-[12px] text-white/60">
              Add it to get urgent slot alerts on WhatsApp too.
            </p>
          </div>

          <label htmlFor="newsletter-consent" className="sm:col-span-2 flex items-start gap-3 cursor-pointer text-[13px] leading-5 text-white/75">
            <input
              id="newsletter-consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-white/30 accent-[hsl(var(--red-500))]"
              data-testid="newsletter-consent"
            />
            <span>I agree to receive We Hive updates by email{whatsapp.trim() ? ' and WhatsApp' : ''}. We never share your details.</span>
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl btn-accent text-white text-[15px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto"
              data-testid="newsletter-submit"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
              {busy ? 'Subscribing…' : 'Subscribe'}
              {!busy && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

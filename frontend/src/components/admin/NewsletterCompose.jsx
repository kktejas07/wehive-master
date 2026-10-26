import { useEffect, useState, useCallback } from 'react';
import { Loader2, Send, FlaskConical, Eye, MessageCircle, Clock, Users, Mail, CheckCircle2, XCircle } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { apiClient } from '../../lib/admin';
import { Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

const errMsg = (e) => e?.response?.data?.detail || e.message;
const STATUS_PILL = {
  sending: 'bg-amber-500/15 text-amber-300',
  scheduled: 'bg-sky-500/15 text-sky-300',
  sent: 'bg-emerald-500/15 text-emerald-300',
  partial: 'bg-amber-500/15 text-amber-300',
  failed: 'bg-red-500/15 text-red-300',
  interrupted: 'bg-red-500/15 text-red-300',
};
const btn = 'inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-[13px] font-semibold disabled:opacity-50';
const field = 'w-full px-3 rounded-xl bg-black/30 border border-white/10 text-[14px] text-white placeholder:text-slate-500 outline-none focus:border-[hsl(var(--blue-700))]';
const label = 'block text-[12px] font-semibold text-slate-300 mb-1';

function Stat({ icon: Icon, name, value }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
      <span className="w-9 h-9 rounded-xl bg-[hsl(var(--blue-700))]/20 flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-blue-300" />
      </span>
      <span>
        <span className="block text-[11px] uppercase tracking-[0.12em] text-slate-400 font-bold">{name}</span>
        <span className="block text-[20px] font-bold text-white tabular-nums leading-tight">{value ?? '…'}</span>
      </span>
    </div>
  );
}

function Toggle({ on, onChange, label: text }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={text} onClick={() => onChange(!on)}
      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-[hsl(var(--blue-700))]' : 'bg-white/15'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

// Compose → preview → test (email + WhatsApp) → send now or schedule (super admin).
export default function NewsletterCompose() {
  const { token, admin } = useAdminAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [intro, setIntro] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [chEmail, setChEmail] = useState(true);
  const [chWhatsapp, setChWhatsapp] = useState(false);
  const [waNumber, setWaNumber] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [audience, setAudience] = useState(null);
  const [totals, setTotals] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState('');
  const [confirming, setConfirming] = useState(false);
  const isSuper = !!admin?.is_super_admin;
  const ready = subject.trim().length >= 3 && body.trim().length >= 10 && (chEmail || chWhatsapp);
  const sending = campaigns.some((c) => c.status === 'sending');

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient(token).get('/newsletter/admin/campaigns');
      setCampaigns(data.items);
      setAudience(data.active_subscribers);
      setTotals(data.totals || null);
    } catch {
      /* the subscriber list below already reports load errors */
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  // While a campaign is going out, keep its counters moving.
  useEffect(() => {
    if (!sending) return undefined;
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [sending, load]);

  const act = async (name, fn) => {
    setBusy(name);
    try { await fn(); } catch (e) { toast({ title: 'Failed', description: errMsg(e), variant: 'destructive' }); } finally { setBusy(''); }
  };
  const payload = {
    subject: subject.trim(), body,
    intro: intro.trim(), hero_image_url: heroImage.trim(),
    button_text: buttonText.trim(), button_url: buttonUrl.trim(),
    channels: { email: chEmail, whatsapp: chWhatsapp },
  };
  const scheduledISO = scheduledAt ? new Date(scheduledAt).toISOString() : null;

  const resetForm = () => {
    setSubject(''); setBody(''); setIntro(''); setHeroImage('');
    setButtonText(''); setButtonUrl(''); setScheduledAt(''); setPreview('');
  };

  return (
    <Panel className="mb-4">
      <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-3">Send a newsletter</div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
        <Stat icon={Users} name="Subscribers" value={audience} />
        <Stat icon={Send} name="Campaigns" value={totals?.campaigns} />
        <Stat icon={Mail} name="Emails sent" value={totals?.emails_sent} />
        <Stat icon={XCircle} name="Failed" value={(totals?.emails_failed || 0) + (totals?.whatsapp_failed || 0)} />
        <Stat icon={MessageCircle} name="WhatsApp" value={totals?.whatsapp_sent} />
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        <div className="space-y-3" data-testid="newsletter-compose">
          <div>
            <label htmlFor="nl-subject" className={label}>Subject *</label>
            <input id="nl-subject" value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} className={`${field} h-10`} placeholder="What's new on WeHive" />
          </div>
          <div>
            <label htmlFor="nl-intro" className={label}>Intro text <span className="text-slate-500 font-normal">(optional)</span></label>
            <input id="nl-intro" value={intro} maxLength={500} onChange={(e) => setIntro(e.target.value)} className={`${field} h-10`} placeholder="A brief introduction…" />
          </div>
          <div>
            <label htmlFor="nl-hero" className={label}>Hero image URL <span className="text-slate-500 font-normal">(optional)</span></label>
            <input id="nl-hero" value={heroImage} onChange={(e) => setHeroImage(e.target.value)} className={`${field} h-10`} placeholder="https://…" inputMode="url" />
          </div>
          <div>
            <label htmlFor="nl-body" className={label}>Body *</label>
            <textarea id="nl-body" rows={7} value={body} maxLength={20000} onChange={(e) => setBody(e.target.value)} className={`${field} py-2`}
              placeholder={'Write in plain text. A blank line starts a new paragraph, **double stars** make bold, and links become clickable.'} />
            <p className="mt-1 text-[11.5px] text-slate-400">An unsubscribe link is added to every email automatically.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="nl-btn-text" className={label}>Button text <span className="text-slate-500 font-normal">(optional)</span></label>
              <input id="nl-btn-text" value={buttonText} maxLength={40} onChange={(e) => setButtonText(e.target.value)} className={`${field} h-10`} placeholder="Read more" />
            </div>
            <div>
              <label htmlFor="nl-btn-url" className={label}>Button link</label>
              <input id="nl-btn-url" value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} className={`${field} h-10`} placeholder="https://example.com" inputMode="url" />
            </div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-2">Delivery channels</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-[13px] text-slate-200">
                <span className="inline-flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> Email <span className="text-slate-500">· {audience ?? '…'} recipients</span></span>
                <Toggle on={chEmail} onChange={setChEmail} label="Email channel" />
              </div>
              <div className="flex items-center justify-between gap-3 text-[13px] text-slate-200">
                <span className="inline-flex items-center gap-2"><MessageCircle className="w-4 h-4 text-slate-400" /> WhatsApp <span className="text-slate-500">· opt-in subscribers only</span></span>
                <Toggle on={chWhatsapp} onChange={setChWhatsapp} label="WhatsApp channel" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="nl-schedule" className={label}>Schedule for later <span className="text-slate-500 font-normal">(leave empty to send now)</span></label>
            <input id="nl-schedule" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={`${field} h-10 [color-scheme:dark]`} />
          </div>

          <div className="flex flex-wrap gap-2">
            <button className={`${btn} bg-white/10 hover:bg-white/20 text-white`} disabled={!ready || !!busy}
              onClick={() => act('preview', async () => setPreview((await apiClient(token).post('/newsletter/admin/campaigns/preview', payload)).data.html))}>
              {busy === 'preview' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Preview
            </button>
            <button className={`${btn} bg-white/10 hover:bg-white/20 text-white`} disabled={!ready || !!busy} data-testid="newsletter-test"
              onClick={() => act('test', async () => {
                const { data } = await apiClient(token).post('/newsletter/admin/campaigns/test', payload);
                toast({ title: 'Test sent', description: `Check ${data.sent_to}` });
              })}>
              {busy === 'test' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />} Send test to me
            </button>
            {isSuper && !confirming && (
              <button className={`${btn} bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white`} disabled={!ready || !!busy || sending || !audience}
                data-testid="newsletter-send" onClick={() => setConfirming(true)}>
                {scheduledISO ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {scheduledISO ? ` Schedule for ${audience} subscribers` : ` Send to ${audience ?? '…'} subscribers`}
              </button>
            )}
          </div>
          {!isSuper && <p className="text-[12px] text-slate-400">Only a super admin can send to the whole list. You can preview and send yourself a test.</p>}
          {confirming && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 flex flex-wrap items-center gap-3" data-testid="newsletter-confirm">
              <span className="text-[13px] text-amber-100">
                {scheduledISO ? `Schedule “${subject.trim()}” for ${audience} confirmed subscribers?` : `Send “${subject.trim()}” to ${audience} confirmed subscribers now?`} This can&apos;t be undone.
              </span>
              <button className={`${btn} bg-red-600 hover:bg-red-700 text-white h-9`} disabled={!!busy} data-testid="newsletter-confirm-send"
                onClick={() => act('send', async () => {
                  await apiClient(token).post('/newsletter/admin/campaigns', { ...payload, expected_recipients: audience, scheduled_at: scheduledISO });
                  toast({ title: scheduledISO ? 'Scheduled' : 'Sending started', description: scheduledISO ? 'It will go out automatically.' : 'Progress shows below.' });
                  setConfirming(false); resetForm();
                  await load();
                }).finally(() => { setConfirming(false); load(); })}>
                {busy === 'send' && <Loader2 className="w-4 h-4 animate-spin" />} Yes, {scheduledISO ? 'schedule' : 'send'}
              </button>
              <button className={`${btn} bg-white/10 hover:bg-white/20 text-white h-9`} onClick={() => setConfirming(false)}>Cancel</button>
            </div>
          )}
          {preview && (
            <iframe title="Newsletter preview" srcDoc={preview} sandbox="" className="w-full h-[420px] rounded-xl bg-white" />
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-2">Test send</div>
            <label htmlFor="nl-test-email" className={label}>Email</label>
            <div className="flex gap-2 mb-3">
              <button className={`${btn} bg-white/10 hover:bg-white/20 text-white flex-1 justify-center`} disabled={!ready || !!busy}
                onClick={() => act('test2', async () => {
                  const { data } = await apiClient(token).post('/newsletter/admin/campaigns/test', payload);
                  toast({ title: 'Test sent', description: `Check ${data.sent_to}` });
                })}>
                {busy === 'test2' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />} Send test email
              </button>
            </div>
            <label htmlFor="nl-test-wa" className={label}>WhatsApp</label>
            <input id="nl-test-wa" value={waNumber} onChange={(e) => setWaNumber(e.target.value)} placeholder="+919876543210" className={`${field} h-10 mb-2`} inputMode="tel" />
            <button className={`${btn} bg-white/10 hover:bg-white/20 text-white w-full justify-center`} disabled={!ready || !!busy || !waNumber.trim()}
              onClick={() => act('testwa', async () => {
                const { data } = await apiClient(token).post('/newsletter/admin/campaigns/test-whatsapp', { ...payload, whatsapp: waNumber.trim() });
                toast({ title: 'WhatsApp test sent', description: `Check ${data.sent_to}` });
              })}>
              {busy === 'testwa' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />} Send test WhatsApp
            </button>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-2">How it works</div>
            <ul className="text-[12.5px] text-slate-300 space-y-1.5 leading-relaxed">
              <li className="flex gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> Emails carry each subscriber&apos;s own unsubscribe link.</li>
              <li className="flex gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> WhatsApp reaches subscribers who shared a number and opted in.</li>
              <li className="flex gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> Scheduled sends go out automatically, about a minute after their time.</li>
            </ul>
          </div>
        </div>
      </div>

      {campaigns.length > 0 && (
        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-2">Campaigns</div>
          <ul className="divide-y divide-white/5" data-testid="newsletter-campaigns">
            {campaigns.map((c) => (
              <li key={c.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <span className="text-white">{c.subject}</span>
                <span className="flex items-center gap-2 text-slate-400">
                  {c.sent}/{c.recipients} email{(c.whatsapp_sent > 0 || c.whatsapp_failed > 0) ? ` · ${c.whatsapp_sent} WhatsApp` : ''}{c.failed ? ` · ${c.failed} failed` : ''}
                  {c.status === 'scheduled' && c.scheduled_at ? ` · ${new Date(c.scheduled_at).toLocaleString('en-IN')}` : ` · ${new Date(c.created_at + 'Z').toLocaleDateString('en-IN')}`}
                  <span className={`px-2 py-0.5 rounded-full text-[10.5px] uppercase tracking-[0.12em] font-bold ${STATUS_PILL[c.status] || 'bg-white/10 text-slate-300'}`}>{c.status}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Send, FlaskConical, Eye, MessageCircle, Clock, Megaphone, Mail, Bell, CheckCircle2 } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { apiClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
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

const AUDIENCES = [
  { id: 'all', name: 'All users', hint: 'Every registered user' },
  { id: 'regular', name: 'Regular users', hint: 'Standard accounts only' },
  { id: 'admins', name: 'Admins', hint: 'Admin and staff accounts' },
  { id: 'subscribers', name: 'Subscribers', hint: 'Newsletter list (email only)' },
];

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

// New announcement → live preview → test → send now or schedule (super admin).
export default function AnnouncementsTab() {
  const { token, admin } = useAdminAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [image, setImage] = useState('');
  const [audience, setAudience] = useState('all');
  const [chInapp, setChInapp] = useState(true);
  const [chEmail, setChEmail] = useState(true);
  const [chWhatsapp, setChWhatsapp] = useState(false);
  const [waNumber, setWaNumber] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [items, setItems] = useState([]);
  const [sizes, setSizes] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState('');
  const [confirming, setConfirming] = useState(false);
  const isSuper = !!admin?.is_super_admin;
  const ready = title.trim().length >= 3 && message.trim().length >= 10 && (chInapp || chEmail || chWhatsapp);
  const sending = items.some((a) => a.status === 'sending');
  const count = sizes?.[audience] ?? null;

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient(token).get('/announcements/admin');
      setItems(data.items);
      setSizes(data.audiences);
    } catch (e) {
      toast({ title: 'Could not load announcements', description: errMsg(e), variant: 'destructive' });
    }
  }, [token, toast]);

  useEffect(() => { load(); }, [load]);
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
    title: title.trim(), message,
    link: link.trim(), image_url: image.trim(), audience,
    channels: { inapp: chInapp, email: chEmail, whatsapp: chWhatsapp },
  };
  const scheduledISO = scheduledAt ? new Date(scheduledAt).toISOString() : null;

  const totals = items.reduce((t, a) => ({
    inapp: t.inapp + (a.inapp || 0),
    email: t.email + (a.emails_sent || 0),
    whatsapp: t.whatsapp + (a.whatsapp_sent || 0),
  }), { inapp: 0, email: 0, whatsapp: 0 });

  return (
    <div data-testid="admin-announcements-tab">
      <AdminHeader
        title="Announcements"
        subtitle="Send a message to users in the app, by email or WhatsApp."
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Stat icon={Megaphone} name="Announcements" value={items.length} />
        <Stat icon={Bell} name="In-app delivered" value={totals.inapp} />
        <Stat icon={Mail} name="Emails sent" value={totals.email} />
        <Stat icon={MessageCircle} name="WhatsApp sent" value={totals.whatsapp} />
      </div>

      <Panel className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-3">New announcement</div>
        <div className="grid lg:grid-cols-[1fr_340px] gap-4">
          <div className="space-y-3" data-testid="announcement-compose">
            <div>
              <label htmlFor="an-title" className={label}>Title *</label>
              <input id="an-title" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} className={`${field} h-10`} placeholder="Platform maintenance scheduled" />
              <p className="mt-1 text-[11.5px] text-slate-500 tabular-nums">{title.trim().length}/100</p>
            </div>
            <div>
              <label htmlFor="an-image" className={label}>Image <span className="text-slate-500 font-normal">(optional)</span></label>
              <input id="an-image" value={image} onChange={(e) => setImage(e.target.value)} className={`${field} h-10`} placeholder="https://…" inputMode="url" />
            </div>
            <div>
              <label htmlFor="an-message" className={label}>Message *</label>
              <textarea id="an-message" rows={6} value={message} maxLength={5000} onChange={(e) => setMessage(e.target.value)} className={`${field} py-2`}
                placeholder={'Write your announcement… A blank line starts a new paragraph, **double stars** make bold.'} />
            </div>
            <div>
              <label htmlFor="an-link" className={label}>Link <span className="text-slate-500 font-normal">(optional)</span></label>
              <input id="an-link" value={link} onChange={(e) => setLink(e.target.value)} className={`${field} h-10`} placeholder="https://wehive.co.in/…" inputMode="url" />
            </div>

            <div>
              <span className={label}>Send to</span>
              <div className="grid sm:grid-cols-2 gap-2">
                {AUDIENCES.map((a) => {
                  const on = audience === a.id;
                  return (
                    <button key={a.id} type="button" onClick={() => setAudience(a.id)}
                      className={`text-left rounded-xl border px-3.5 py-2.5 transition-colors ${on ? 'border-[hsl(var(--blue-700))] bg-[hsl(var(--blue-700))]/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                      <span className="block text-[13.5px] font-semibold text-white">{a.name}
                        <span className="ml-1.5 text-[11.5px] text-slate-400 tabular-nums">{sizes ? `· ${sizes[a.id] ?? 0}` : ''}</span>
                      </span>
                      <span className="block text-[12px] text-slate-400">{a.hint}</span>
                    </button>
                  );
                })}
              </div>
              {audience === 'subscribers' && (chInapp || chWhatsapp) && (
                <p className="mt-1.5 text-[12px] text-amber-200">Subscribers have no login — only the email channel applies to them.</p>
              )}
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-2">Delivery channels</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-[13px] text-slate-200">
                  <span className="inline-flex items-center gap-2"><Bell className="w-4 h-4 text-slate-400" /> In-app notification</span>
                  <Toggle on={chInapp} onChange={setChInapp} label="In-app channel" />
                </div>
                <div className="flex items-center justify-between gap-3 text-[13px] text-slate-200">
                  <span className="inline-flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> Email</span>
                  <Toggle on={chEmail} onChange={setChEmail} label="Email channel" />
                </div>
                <div className="flex items-center justify-between gap-3 text-[13px] text-slate-200">
                  <span className="inline-flex items-center gap-2"><MessageCircle className="w-4 h-4 text-slate-400" /> WhatsApp <span className="text-slate-500">· opt-in users only</span></span>
                  <Toggle on={chWhatsapp} onChange={setChWhatsapp} label="WhatsApp channel" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="an-schedule" className={label}>Schedule for later <span className="text-slate-500 font-normal">(leave empty to send now)</span></label>
              <input id="an-schedule" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={`${field} h-10 [color-scheme:dark]`} />
            </div>

            <div className="flex flex-wrap gap-2">
              <button className={`${btn} bg-white/10 hover:bg-white/20 text-white`} disabled={!ready || !!busy}
                onClick={() => act('preview', async () => setPreview((await apiClient(token).post('/announcements/admin/preview', payload)).data.html))}>
                {busy === 'preview' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Preview
              </button>
              <button className={`${btn} bg-white/10 hover:bg-white/20 text-white`} disabled={!ready || !!busy}
                onClick={() => act('test', async () => {
                  const { data } = await apiClient(token).post('/announcements/admin/test', payload);
                  toast({ title: 'Test sent', description: `Check ${data.sent_to}` });
                })}>
                {busy === 'test' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />} Send test to me
              </button>
              {isSuper && !confirming && (
                <button className={`${btn} bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white`} disabled={!ready || !!busy || sending || count === 0}
                  data-testid="announcement-send" onClick={() => setConfirming(true)}>
                  {scheduledISO ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {scheduledISO ? ` Schedule for ${count ?? '…'} recipients` : ` Send to ${count ?? '…'} recipients`}
                </button>
              )}
            </div>
            {!isSuper && <p className="text-[12px] text-slate-400">Only a super admin can broadcast. You can preview and send yourself a test.</p>}
            {confirming && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 flex flex-wrap items-center gap-3" data-testid="announcement-confirm">
                <span className="text-[13px] text-amber-100">
                  {scheduledISO ? `Schedule “${title.trim()}” for ${count} recipients?` : `Send “${title.trim()}” to ${count} recipients now?`} This can&apos;t be undone.
                </span>
                <button className={`${btn} bg-red-600 hover:bg-red-700 text-white h-9`} disabled={!!busy} data-testid="announcement-confirm-send"
                  onClick={() => act('send', async () => {
                    await apiClient(token).post('/announcements/admin', { ...payload, scheduled_at: scheduledISO });
                    toast({ title: scheduledISO ? 'Scheduled' : 'Sending started', description: scheduledISO ? 'It will go out automatically.' : 'Progress shows below.' });
                    setConfirming(false); setTitle(''); setMessage(''); setLink(''); setImage(''); setScheduledAt(''); setPreview('');
                    await load();
                  }).finally(() => { setConfirming(false); load(); })}>
                  {busy === 'send' && <Loader2 className="w-4 h-4 animate-spin" />} Yes, {scheduledISO ? 'schedule' : 'send'}
                </button>
                <button className={`${btn} bg-white/10 hover:bg-white/20 text-white h-9`} onClick={() => setConfirming(false)}>Cancel</button>
              </div>
            )}
            {preview && (
              <iframe title="Announcement preview" srcDoc={preview} sandbox="" className="w-full h-[420px] rounded-xl bg-white" />
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-2">Live preview</div>
              <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                <p className="text-[14px] font-bold text-white">{title.trim() || '(no title)'}</p>
                <p className="text-[13px] text-slate-300 mt-1 whitespace-pre-wrap">{message.trim() || '(no message)'}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {chInapp && <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">In-app</span>}
                  {chEmail && <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">Email</span>}
                  {chWhatsapp && <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">WhatsApp</span>}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-2">Test WhatsApp</div>
              <input value={waNumber} onChange={(e) => setWaNumber(e.target.value)} placeholder="+919876543210" className={`${field} h-10 mb-2`} inputMode="tel" aria-label="Test WhatsApp number" />
              <button className={`${btn} bg-white/10 hover:bg-white/20 text-white w-full justify-center`} disabled={!ready || !!busy || !waNumber.trim()}
                onClick={() => act('testwa', async () => {
                  const { data } = await apiClient(token).post('/announcements/admin/test-whatsapp', { ...payload, whatsapp: waNumber.trim() });
                  toast({ title: 'WhatsApp test sent', description: `Check ${data.sent_to}` });
                })}>
                {busy === 'testwa' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />} Send test WhatsApp
              </button>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-2">How it works</div>
              <ul className="text-[12.5px] text-slate-300 space-y-1.5 leading-relaxed">
                <li className="flex gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> In-app lands in the user&apos;s notification bell instantly.</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> Email skips users who turned notifications off; WhatsApp needs opt-in.</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> Re-sends are deduped per user, and schedules fire automatically.</li>
              </ul>
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-2">History</div>
            <ul className="divide-y divide-white/5" data-testid="announcements-history">
              {items.map((a) => (
                <li key={a.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <span className="text-white">{a.title} <span className="text-slate-500">· {a.audience}</span></span>
                  <span className="flex items-center gap-2 text-slate-400">
                    {a.inapp > 0 ? `${a.inapp} in-app · ` : ''}{a.emails_sent}/{a.recipients} email
                    {(a.whatsapp_sent > 0 || a.whatsapp_failed > 0) ? ` · ${a.whatsapp_sent} WhatsApp` : ''}
                    {a.status === 'scheduled' && a.scheduled_at ? ` · ${new Date(a.scheduled_at).toLocaleString('en-IN')}` : ` · ${new Date(a.created_at + 'Z').toLocaleDateString('en-IN')}`}
                    <span className={`px-2 py-0.5 rounded-full text-[10.5px] uppercase tracking-[0.12em] font-bold ${STATUS_PILL[a.status] || 'bg-white/10 text-slate-300'}`}>{a.status}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  );
}

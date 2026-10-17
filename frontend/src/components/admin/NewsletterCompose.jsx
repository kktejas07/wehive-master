import { useEffect, useState, useCallback } from 'react';
import { Loader2, Send, FlaskConical, Eye } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { apiClient } from '../../lib/admin';
import { Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

const errMsg = (e) => e?.response?.data?.detail || e.message;
const STATUS_PILL = {
  sending: 'bg-amber-500/15 text-amber-300',
  sent: 'bg-emerald-500/15 text-emerald-300',
  partial: 'bg-amber-500/15 text-amber-300',
  failed: 'bg-red-500/15 text-red-300',
  interrupted: 'bg-red-500/15 text-red-300',
};
const btn = 'inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-[13px] font-semibold disabled:opacity-50';
const field = 'w-full px-3 rounded-xl bg-black/30 border border-white/10 text-[14px] text-white placeholder:text-slate-500 outline-none focus:border-[hsl(var(--blue-700))]';

// Compose → preview → test to yourself → send to every confirmed subscriber (super admin).
export default function NewsletterCompose() {
  const { token, admin } = useAdminAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [audience, setAudience] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState('');
  const [confirming, setConfirming] = useState(false);
  const isSuper = !!admin?.is_super_admin;
  const ready = subject.trim().length >= 3 && body.trim().length >= 10;
  const sending = campaigns.some((c) => c.status === 'sending');

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient(token).get('/newsletter/admin/campaigns');
      setCampaigns(data.items);
      setAudience(data.active_subscribers);
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
  const payload = { subject: subject.trim(), body };

  return (
    <Panel className="mb-4">
      <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-3">Send a newsletter</div>
      <div className="space-y-3" data-testid="newsletter-compose">
        <div>
          <label htmlFor="nl-subject" className="block text-[12px] font-semibold text-slate-300 mb-1">Subject</label>
          <input id="nl-subject" value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} className={`${field} h-10`} placeholder="Schengen rule changes for October" />
        </div>
        <div>
          <label htmlFor="nl-body" className="block text-[12px] font-semibold text-slate-300 mb-1">Message</label>
          <textarea id="nl-body" rows={8} value={body} maxLength={20000} onChange={(e) => setBody(e.target.value)} className={`${field} py-2`}
            placeholder={'Write in plain text. A blank line starts a new paragraph, **double stars** make bold, and links become clickable.'} />
          <p className="mt-1 text-[11.5px] text-slate-400">An unsubscribe link is added to every email automatically.</p>
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
              <Send className="w-4 h-4" /> Send to {audience ?? '…'} subscribers
            </button>
          )}
        </div>
        {!isSuper && <p className="text-[12px] text-slate-400">Only a super admin can send to the whole list. You can preview and send yourself a test.</p>}
        {confirming && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 flex flex-wrap items-center gap-3" data-testid="newsletter-confirm">
            <span className="text-[13px] text-amber-100">Send “{subject.trim()}” to {audience} confirmed subscribers now? This can't be undone.</span>
            <button className={`${btn} bg-red-600 hover:bg-red-700 text-white h-9`} disabled={!!busy} data-testid="newsletter-confirm-send"
              onClick={() => act('send', async () => {
                await apiClient(token).post('/newsletter/admin/campaigns', { ...payload, expected_recipients: audience });
                toast({ title: 'Sending started', description: 'Progress shows below.' });
                setConfirming(false); setSubject(''); setBody(''); setPreview('');
                await load();
              }).finally(() => { setConfirming(false); load(); })}>
              {busy === 'send' && <Loader2 className="w-4 h-4 animate-spin" />} Yes, send
            </button>
            <button className={`${btn} bg-white/10 hover:bg-white/20 text-white h-9`} onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        )}
        {preview && (
          <iframe title="Newsletter preview" srcDoc={preview} sandbox="" className="w-full h-[420px] rounded-xl bg-white" />
        )}
      </div>

      {campaigns.length > 0 && (
        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-2">Sent campaigns</div>
          <ul className="divide-y divide-white/5" data-testid="newsletter-campaigns">
            {campaigns.map((c) => (
              <li key={c.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <span className="text-white">{c.subject}</span>
                <span className="flex items-center gap-2 text-slate-400">
                  {c.sent}/{c.recipients} sent{c.failed ? ` · ${c.failed} failed` : ''} · {new Date(c.created_at + 'Z').toLocaleDateString('en-IN')}
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

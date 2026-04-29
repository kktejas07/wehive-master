import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plug, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

const CHANNELS = [
  { id: 'mock',             label: 'Mock (123456)',         hint: 'Dev-friendly — always uses the code `123456`.' },
  { id: 'auto',             label: 'Auto',                  hint: 'Route email → SMTP, phone → WhatsApp; falls back to mock if creds missing.' },
  { id: 'twilio_sms',       label: 'Twilio SMS',            hint: 'Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.' },
  { id: 'twilio_whatsapp',  label: 'Twilio WhatsApp',       hint: 'Requires sandbox opt-in or an approved WA sender.' },
  { id: 'email',            label: 'Email (SMTP)',          hint: 'Gmail requires an App Password.' },
];

function StatusBadge({ status }) {
  if (status === 'configured') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-bold uppercase tracking-[0.14em]"><CheckCircle2 className="w-3 h-3" /> Configured</span>;
  }
  if (status === 'mock') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-bold uppercase tracking-[0.14em]"><AlertTriangle className="w-3 h-3" /> Mock</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 text-[11px] font-bold uppercase tracking-[0.14em]"><AlertTriangle className="w-3 h-3" /> Missing</span>;
}

export default function IntegrationsTab() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await adminClient(token).get('/integrations');
    setData(r.data);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const setChannel = async (id) => {
    setBusy(true);
    try {
      await adminClient(token).patch('/integrations', { OTP_CHANNEL: id });
      toast({ title: `OTP channel set to ${id}` });
      await load();
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message });
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <>
        <AdminHeader title="Integrations" />
        <Panel><Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--accent))]" /></Panel>
      </>
    );
  }

  return (
    <div data-testid="admin-integrations-tab">
      <AdminHeader
        title="API integrations"
        subtitle="Connect Twilio, SMTP and the Emergent LLM key. Switch OTP routing in one click."
      />

      <Panel className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400">Active OTP channel</div>
        <div className="mt-1 text-[22px] font-display font-extrabold text-white capitalize">
          {data.otp_channel.replace('_', ' ')}
        </div>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {CHANNELS.map((c) => {
            const active = data.otp_channel === c.id;
            return (
              <button
                key={c.id}
                data-testid={`otp-channel-${c.id}`}
                disabled={busy || active}
                onClick={() => setChannel(c.id)}
                className={`text-left rounded-xl border p-3 transition ${
                  active
                    ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/10'
                    : 'border-white/10 bg-white/5 hover:border-[hsl(var(--accent))]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[13.5px] font-bold text-white">{c.label}</div>
                  {active && <CheckCircle2 className="w-4 h-4 text-[hsl(var(--accent))]" />}
                </div>
                <div className="mt-1 text-[12px] text-slate-400">{c.hint}</div>
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="grid lg:grid-cols-3 gap-4">
        {data.services.map((s) => (
          <Panel key={s.id} data-testid={`integration-${s.id}`}>
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <span className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-[hsl(var(--accent))]">
                  <Plug className="w-4 h-4" />
                </span>
                <div className="text-[13px] font-bold text-white">{s.name}</div>
              </div>
              <StatusBadge status={s.status} />
            </div>
            <dl className="mt-4 space-y-2">
              {Object.entries(s.details).map(([k, v]) => (
                <div key={k} className="flex justify-between items-center gap-2 text-[12.5px]">
                  <dt className="text-slate-500 uppercase tracking-[0.14em] font-bold text-[10.5px]">{k.replace(/_/g, ' ')}</dt>
                  <dd className="text-slate-200 font-mono truncate">{v || '—'}</dd>
                </div>
              ))}
            </dl>
            {s.action && (
              <div className="mt-4 rounded-lg bg-white/5 p-2.5 text-[11.5px] text-slate-400 leading-snug">
                {s.action}
              </div>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}

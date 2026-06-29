import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plug, CheckCircle2, AlertTriangle, Trash2, TestTube, X, KeyRound, ChevronDown, Cpu } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, apiClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

const CHANNELS = [
  { id: 'mock',             label: 'Mock (123456)',        hint: 'Dev-friendly — always uses the code `123456`.' },
  { id: 'auto',            label: 'Auto',                hint: 'Route email → SMTP/Postal, phone → WhatsApp; falls back to mock if creds missing.' },
  { id: 'twilio_sms',      label: 'Twilio SMS',           hint: 'Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.' },
  { id: 'twilio_whatsapp', label: 'Twilio WhatsApp',       hint: 'Requires sandbox opt-in or an approved WA sender.' },
  { id: 'whatsapp',        label: 'WhatsApp (OpenWA)',     hint: 'Uses OpenWA API for WhatsApp OTP delivery. Set up in Admin → Settings → OpenWA.' },
  { id: 'email',           label: 'Email (SMTP / Postal)',  hint: 'Uses SMTP or Postal API. Configure in Admin → Settings → Email or Postal.' },
];

const CATEGORY_ICONS = {
  visa_apis: 'Visa APIs',
  travel_booking: 'Travel',
  payments_forex: 'Payments',
  travel_insurance: 'Insurance',
  appt_slots: 'Slots',
};

function StatusBadge({ status }) {
  if (status === 'configured') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-bold uppercase tracking-[0.14em]"><CheckCircle2 className="w-3 h-3" /> Configured</span>;
  }
  if (status === 'mock') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-bold uppercase tracking-[0.14em]"><AlertTriangle className="w-3 h-3" /> Mock</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 text-[11px] font-bold uppercase tracking-[0.14em]"><AlertTriangle className="w-3 h-3" /> Missing</span>;
}

function ServiceRow({ svc, isConnected, isDefault, onConnect, onDisconnect, onTest, onSetDefault, connecting, testing }) {
  const [showForm, setShowForm] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(svc.base_url || '');

  const handleTest = async () => {
    if (!apiKey && !isConnected) return;
    await onTest(svc.id, apiKey, baseUrl);
  };

  const handleConnect = async () => {
    if (svc.requires_key && !apiKey) return;
    await onConnect(svc.id, apiKey, baseUrl);
    setApiKey('');
    setShowForm(false);
  };

  return (
    <div className="border-b border-white/5 last:border-0 py-3 px-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-bold text-white">{svc.name}</div>
          <div className="text-[11.5px] text-slate-400 mt-0.5">{svc.description}</div>
          {svc.features && svc.features.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {svc.features.map(f => (
                <span key={f} className="text-[10px] font-semibold bg-white/5 text-slate-400 px-2 py-0.5 rounded-full">
                  {f.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
          {svc.powered_by_tagline && (
            <div className="text-[10px] text-slate-500 mt-1">{svc.powered_by_tagline}</div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isConnected ? (
            <button
              onClick={() => setShowForm(v => !v)}
              className="text-[11px] font-bold text-[hsl(var(--accent))] hover:text-white px-3 py-1.5 rounded-lg border border-[hsl(var(--accent))]/30 hover:border-[hsl(var(--accent))] transition"
            >
              Connect
            </button>
          ) : (
            <>
              {isDefault && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">Default</span>}
              {!isDefault && (
                <button onClick={() => onSetDefault(svc.id)} className="text-[11px] font-bold text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition">Set Default</button>
              )}
              <button onClick={() => onDisconnect(svc.id)} className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {showForm && (
        <div className="mt-3 bg-white/5 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-slate-300">Connect {svc.name}</span>
            <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-white/10 transition"><X className="w-3.5 h-3.5 text-slate-400" /></button>
          </div>
          {svc.requires_key && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">{svc.key_label}</label>
              <div className="relative">
                <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={svc.key_placeholder}
                  className="w-full h-9 pl-8 pr-3 rounded-lg bg-white/5 border border-white/10 text-[12px] text-white placeholder-slate-600 focus:border-[hsl(var(--accent))]/50 outline-none" />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={handleTest} disabled={testing || (svc.requires_key && !apiKey)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-[11px] font-bold text-slate-400 hover:bg-white/5 disabled:opacity-40 transition">
              {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />} Test
            </button>
            <button onClick={handleConnect} disabled={connecting || (svc.requires_key && !apiKey)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[hsl(var(--accent))] text-white text-[11px] font-bold hover:bg-[hsl(var(--accent))]/80 disabled:opacity-40 transition">
              {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plug className="w-3 h-3" />} Connect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntegrationsTab() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [otpData, setOtpData] = useState(null);
  const [thirdPartyData, setThirdPartyData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);

  // Platform Default LLM
  const [llmConfig, setLlmConfig] = useState(null);
  const [llmProvider, setLlmProvider] = useState('groq');
  const [llmKey, setLlmKey] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [llmSaving, setLlmSaving] = useState(false);
  const [llmTesting, setLlmTesting] = useState(false);
  const [providers, setProviders] = useState([]);

  const loadProviders = useCallback(async () => {
    try {
      const r = await apiClient(token).get('/ai-marketplace/providers');
      setProviders(r.data?.providers || []);
    } catch (e) {
      // backend unreachable — fine, dropdown stays limited
    }
  }, [token]);

  const loadIntegrations = useCallback(async () => {
    const r = await adminClient(token).get('/integrations');
    setOtpData(r.data);
  }, [token]);

  const loadThirdParty = useCallback(async () => {
    try {
      const [catRes, svcRes] = await Promise.all([
        apiClient(token).get('/third-party/categories'),
        apiClient(token).get('/third-party/admin/my-services'),
      ]);
      setCategories(catRes.data.categories || []);
      setThirdPartyData(svcRes.data);
    } catch (e) {
      console.error('third party load error', e?.response?.data);
    }
  }, [token]);

  const loadDefaultLlm = useCallback(async () => {
    try {
      const r = await adminClient(token).get('/settings/default_llm');
      const cfg = r.data?.config || {};
      setLlmConfig(cfg);
      if (cfg.provider) setLlmProvider(cfg.provider);
      if (cfg.model) setLlmModel(cfg.model);
      if (cfg.key) setLlmKey(cfg.key);
    } catch (e) {
      // not configured yet — fine
    }
  }, [token]);

  useEffect(() => {
    loadIntegrations();
    loadThirdParty();
    loadDefaultLlm();
    loadProviders();
  }, [loadIntegrations, loadThirdParty, loadDefaultLlm, loadProviders]);

  const setChannel = async (id) => {
    setBusy(true);
    try {
      await adminClient(token).patch('/integrations', { OTP_CHANNEL: id });
      toast({ title: `OTP channel set to ${id}` });
      await loadIntegrations();
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message });
    } finally {
      setBusy(false);
    }
  };

  const saveDefaultLlm = async () => {
    if (!llmKey.trim()) return;
    setLlmSaving(true);
    try {
      await adminClient(token).put('/settings/default_llm', {
        config: { provider: llmProvider, key: llmKey.trim(), model: llmModel.trim() },
      });
      toast({ title: 'Default LLM saved' });
      setLlmConfig({ provider: llmProvider, key: llmKey.trim(), model: llmModel.trim() });
    } catch (e) {
      toast({ title: 'Failed to save', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setLlmSaving(false);
    }
  };

  const testDefaultLlm = async () => {
    if (!llmKey.trim()) return;
    setLlmTesting(true);
    try {
      const r = await apiClient(token).post('/ai-marketplace/test', {
        provider_id: llmProvider,
        api_key: llmKey.trim(),
        model: llmModel.trim(),
        prompt: 'Say hello in one word.',
      });
      if (r.data.ok) {
        toast({ title: 'Connection successful', description: r.data.reply?.slice(0, 120) });
      } else {
        toast({ title: 'Test failed', description: r.data.error, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Test failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setLlmTesting(false);
    }
  };

  const handleConnect = async (serviceId, apiKey, baseUrl) => {
    setConnecting(true);
    try {
      await apiClient(token).post('/third-party/admin/connect', { service_id: serviceId, api_key: apiKey, base_url: baseUrl });
      toast({ title: 'Service connected' });
      await loadThirdParty();
    } catch (e) {
      toast({ title: 'Connection failed', description: e?.response?.data?.detail });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (serviceId) => {
    try {
      await apiClient(token).delete(`/third-party/admin/disconnect/${serviceId}`);
      toast({ title: 'Disconnected' });
      await loadThirdParty();
    } catch {
      toast({ title: 'Failed to disconnect', variant: 'destructive' });
    }
  };

  const handleTest = async (serviceId, apiKey, baseUrl) => {
    setTesting(true);
    try {
      const res = await apiClient(token).post('/third-party/admin/test', { service_id: serviceId, api_key: apiKey, base_url: baseUrl });
      if (res.data.ok) {
        toast({ title: 'Connection successful' });
      } else {
        toast({ title: 'Test failed', description: res.data.error, variant: 'destructive' });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSetDefault = async (serviceId) => {
    try {
      await apiClient(token).post('/third-party/admin/set-default', { service_id: serviceId });
      toast({ title: 'Default updated' });
      await loadThirdParty();
    } catch {
      toast({ title: 'Failed', variant: 'destructive' });
    }
  };

  const connectedIds = new Set((thirdPartyData?.services || []).map(s => s.service_id));

  return (
    <div data-testid="admin-integrations-tab">
      <AdminHeader
        title="Integrations"
        subtitle="Manage OTP channels, third-party APIs, and AI provider connections."
      />

      {/* OTP Channel */}
      <Panel className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400">Active OTP channel</div>
        <div className="mt-1 text-[22px] font-display font-extrabold text-white capitalize">
          {(otpData?.otp_channel || 'unknown').replace('_', ' ')}
        </div>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {CHANNELS.map((c) => {
            const active = otpData?.otp_channel === c.id;
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

      {/* Platform Default LLM */}
      <Panel className="mb-4">
        <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-white/5">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-[13.5px] font-bold text-white">Default LLM Provider</div>
            <div className="text-[11.5px] text-slate-400">Platform-wide default AI provider used when users haven't connected their own key</div>
          </div>
          {llmConfig?.key && (
            <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-bold uppercase tracking-[0.14em]">
              <CheckCircle2 className="w-3 h-3" /> Configured
            </span>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Provider</label>
            <select value={llmProvider} onChange={e => { setLlmProvider(e.target.value); setLlmModel(''); }}
              className="w-full h-9 rounded-lg bg-white/5 border border-white/10 px-3 text-[12px] text-white outline-none focus:border-[hsl(var(--accent))]/50">
              {providers.length === 0 && <option value="">Loading…</option>}
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Model</label>
            <select value={llmModel} onChange={e => setLlmModel(e.target.value)}
              className="w-full h-9 rounded-lg bg-white/5 border border-white/10 px-3 text-[12px] text-white outline-none focus:border-[hsl(var(--accent))]/50">
              {(!llmModel || !(providers.find(p => p.id === llmProvider)?.models || []).includes(llmModel)) && llmModel && (
                <option value={llmModel}>{llmModel}</option>
              )}
              {(providers.find(p => p.id === llmProvider)?.models || []).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-2">
          <label className="block text-[11px] font-bold text-slate-400 mb-1">API Key</label>
          <div className="relative">
            <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input type="password" value={llmKey} onChange={e => setLlmKey(e.target.value)} placeholder={llmConfig?.key ? '(key saved — enter new value to replace)' : 'gsk_...'}
              className="w-full h-9 pl-8 pr-3 rounded-lg bg-white/5 border border-white/10 text-[12px] text-white placeholder-slate-600 outline-none focus:border-[hsl(var(--accent))]/50" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={testDefaultLlm} disabled={llmTesting || !llmKey.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-[11px] font-bold text-slate-400 hover:bg-white/5 disabled:opacity-40 transition">
            {llmTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />} Test
          </button>
          <button onClick={saveDefaultLlm} disabled={llmSaving || !llmKey.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[hsl(var(--accent))] text-white text-[11px] font-bold hover:bg-[hsl(var(--accent))]/80 disabled:opacity-40 transition">
            {llmSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plug className="w-3 h-3" />} Save
          </button>
        </div>
      </Panel>

      {/* Third-party Services */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[14px] font-bold text-white">Third-Party Services</div>
          <div className="text-[12px] text-slate-400 mt-0.5">Platform-wide API connections managed by admin</div>
        </div>
        {thirdPartyData?.connected && (
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full">
            {thirdPartyData.services.length} connected
          </span>
        )}
      </div>

      <div className="space-y-3">
        {(categories || []).map(cat => (
          <Panel key={cat.id}>
            <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{CATEGORY_ICONS[cat.id] || 'API'}</span>
              <div>
                <div className="text-[13.5px] font-bold text-white">{cat.name}</div>
                <div className="text-[11.5px] text-slate-400">{cat.description}</div>
              </div>
            </div>
            <div>
              {cat.services.map(svc => (
                <ServiceRow
                  key={svc.id}
                  svc={svc}
                  isConnected={connectedIds.has(svc.id)}
                  isDefault={thirdPartyData?.default_service === svc.id}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  onTest={handleTest}
                  onSetDefault={handleSetDefault}
                  connecting={connecting}
                  testing={testing}
                />
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
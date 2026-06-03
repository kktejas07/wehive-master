import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import {
  Plug,
  Loader2,
  Check,
  X,
  Zap,
  Globe,
  Server,
  CreditCard,
  ShieldCheck,
  CalendarDays,
  Trash2,
  ChevronDown,
  ExternalLink,
  TestTube,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

const CATEGORY_ICONS = {
  visa_apis: Zap,
  travel_booking: Globe,
  payments_forex: CreditCard,
  travel_insurance: ShieldCheck,
  appt_slots: CalendarDays,
};

const SERVICE_ICONS: Record<string, React.ElementType> = {
  atlys: Zap,
  visahq: Globe,
  ivisa: Zap,
  skyscanner: Globe,
  amadeus: Globe,
  bookingcom: Globe,
  razorpay: CreditCard,
  wise: CreditCard,
  stripe: CreditCard,
  travelex: ShieldCheck,
  godigit: ShieldCheck,
  policybazaar: ShieldCheck,
  vfsglobal: CalendarDays,
  blsintl: CalendarDays,
};

function CategorySection({ category, connectedIds, activeServiceId, onConnect, onDisconnect, onTest, onSetDefault, connecting, testing }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = CATEGORY_ICONS[category.id] || Globe;
  const connectedCount = category.services.filter(s => connectedIds.includes(s.id)).length;

  return (
    <div className="border border-black/5 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between p-4 bg-[hsl(var(--soft-bg))] hover:bg-[hsl(var(--blue-50))] transition text-left"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-white border border-black/5 flex items-center justify-center">
            <Icon className="w-4 h-4 text-[hsl(var(--blue-700))]" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{category.name}</div>
            <div className="text-[12px] text-[hsl(var(--blue-900))]/50">{category.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {connectedCount > 0 && (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
              {connectedCount} connected
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-[hsl(var(--blue-900))]/40 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-black/5">
          {category.services.map(svc => {
            const isConnected = connectedIds.includes(svc.id);
            const isDefault = activeServiceId === svc.id;
            const IconSvc = SERVICE_ICONS[svc.id] || Server;
            return (
              <ServiceRow
                key={svc.id}
                svc={svc}
                isConnected={isConnected}
                isDefault={isDefault}
                onConnect={onConnect}
                onDisconnect={onDisconnect}
                onTest={onTest}
                onSetDefault={onSetDefault}
                connecting={connecting}
                testing={testing}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ServiceRow({ svc, isConnected, isDefault, onConnect, onDisconnect, onTest, onSetDefault, connecting, testing }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(svc.base_url || '');
  const [testingThis, setTestingThis] = useState(false);
  const [connectingThis, setConnectingThis] = useState(false);
  const IconSvc = SERVICE_ICONS[svc.id] || Server;

  const handleTest = async () => {
    if (!apiKey && !isConnected) {
      toast({ title: 'Enter API key first', variant: 'destructive' });
      return;
    }
    setTestingThis(true);
    try {
      const res = await onTest(svc.id, apiKey, baseUrl);
      if (res.ok) {
        toast({ title: 'Connection successful', description: `${svc.name} is reachable.` });
      } else {
        toast({ title: 'Connection failed', description: res.error || 'Check your API key.', variant: 'destructive' });
      }
    } finally {
      setTestingThis(false);
    }
  };

  const handleConnect = async () => {
    if (svc.requires_key && !apiKey) {
      toast({ title: 'API key required', description: `${svc.key_label} needed for ${svc.name}`, variant: 'destructive' });
      return;
    }
    setConnectingThis(true);
    try {
      await onConnect(svc.id, apiKey, baseUrl);
      setApiKey('');
      setShowForm(false);
    } finally {
      setConnectingThis(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-[hsl(var(--blue-50))] flex items-center justify-center mt-0.5">
            <IconSvc className="w-4 h-4 text-[hsl(var(--blue-700))]" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">{svc.name}</div>
            <div className="text-[12px] text-[hsl(var(--blue-900))]/50 mt-0.5">{svc.description}</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {svc.features.map(f => (
                <span key={f} className="text-[10px] font-semibold bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] px-2 py-0.5 rounded-full">
                  {f.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
            {isDefault && (
              <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                <Check className="w-3 h-3" /> Default
              </span>
            )}
            {svc.powered_by_tagline && (
              <div className="text-[10px] text-[hsl(var(--blue-900))]/40 mt-1">{svc.powered_by_tagline}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isConnected ? (
            <button
              onClick={() => setShowForm(v => !v)}
              className="text-[12px] font-bold text-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-800))] px-3 py-1.5 rounded-lg border border-[hsl(var(--blue-700))]/30 hover:bg-[hsl(var(--blue-50))] transition"
            >
              Connect
            </button>
          ) : (
            <>
              {!isDefault && (
                <button
                  onClick={() => onSetDefault(svc.id)}
                  className="text-[12px] font-bold text-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-800))] px-3 py-1.5 rounded-lg border border-[hsl(var(--blue-700))]/30 hover:bg-[hsl(var(--blue-50))] transition"
                >
                  Set Default
                </button>
              )}
              <button
                onClick={() => onDisconnect(svc.id)}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition"
                title="Disconnect"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {showForm && (
        <div className="mt-4 bg-[hsl(var(--soft-bg))] rounded-xl border border-black/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-bold text-[hsl(var(--blue-900))]">Connect {svc.name}</h4>
            <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-black/5 transition">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {svc.requires_key && (
            <div>
              <label className="block text-[12px] font-bold text-[hsl(var(--blue-900))]/70 mb-1">{svc.key_label}</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--blue-900))]/30" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={svc.key_placeholder}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-black/10 text-[13px] focus:border-[hsl(var(--blue-700))] outline-none transition"
                />
              </div>
            </div>
          )}
          {baseUrl !== undefined && (
            <div>
              <label className="block text-[12px] font-bold text-[hsl(var(--blue-900))]/70 mb-1">Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder={svc.base_url || 'https://'}
                className="w-full h-10 px-3 rounded-lg border border-black/10 text-[13px] focus:border-[hsl(var(--blue-700))] outline-none transition"
              />
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleTest}
              disabled={testingThis || (!apiKey && svc.requires_key)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black/10 text-[12px] font-bold text-[hsl(var(--blue-900))]/70 hover:bg-white disabled:opacity-50 transition"
            >
              {testingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" />}
              Test
            </button>
            <button
              onClick={handleConnect}
              disabled={connectingThis || (svc.requires_key && !apiKey)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[hsl(var(--blue-700))] text-white text-[12px] font-bold hover:bg-[hsl(var(--blue-800))] disabled:opacity-50 transition"
            >
              {connectingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />}
              Connect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ThirdPartySettings() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [connectedServices, setConnectedServices] = useState([]);
  const [defaultService, setDefaultService] = useState('');
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [catRes, svcRes] = await Promise.all([
        axios.get(`${API}/third-party/categories`, { headers }),
        axios.get(`${API}/third-party/my-services`, { headers }),
      ]);
      setCategories(catRes.data.categories || []);
      setConnectedServices(svcRes.data.services || []);
      setDefaultService(svcRes.data.default_service || '');
    } catch {
      toast({ title: 'Failed to load services', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleConnect = async (serviceId, apiKey, baseUrl) => {
    setConnecting(true);
    try {
      await axios.post(`${API}/third-party/connect`, { service_id: serviceId, api_key: apiKey, base_url: baseUrl }, { headers });
      toast({ title: 'Service connected' });
      await fetchData();
    } catch (e) {
      toast({ title: 'Connection failed', description: e?.response?.data?.detail, variant: 'destructive' });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (serviceId) => {
    try {
      await axios.delete(`${API}/third-party/disconnect/${serviceId}`, { headers });
      toast({ title: 'Service disconnected' });
      await fetchData();
    } catch {
      toast({ title: 'Failed to disconnect', variant: 'destructive' });
    }
  };

  const handleTest = async (serviceId, apiKey, baseUrl) => {
    setTesting(true);
    try {
      const res = await axios.post(`${API}/third-party/test`, { service_id: serviceId, api_key: apiKey, base_url: baseUrl }, { headers });
      return res.data;
    } catch (e) {
      return { ok: false, error: e?.response?.data?.detail || 'Unknown error' };
    } finally {
      setTesting(false);
    }
  };

  const handleSetDefault = async (serviceId) => {
    try {
      await axios.post(`${API}/third-party/set-default`, { service_id: serviceId }, { headers });
      toast({ title: 'Default service updated' });
      await fetchData();
    } catch {
      toast({ title: 'Failed to set default', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[hsl(var(--blue-900))]/60">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading integrations...
      </div>
    );
  }

  const connectedIds = connectedServices.map(s => s.service_id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-extrabold text-[26px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
          Third-Party Integrations
        </h2>
        <p className="mt-1 text-[13.5px] text-[hsl(var(--blue-900))]/55">
          Connect visa APIs, travel booking, payment, insurance, and appointment slot services.
        </p>
      </div>

      {connectedServices.length > 0 && (
        <div className="bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-700))]/20 rounded-xl p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-[hsl(var(--blue-700))]" />
          <div className="text-[13px] font-semibold text-[hsl(var(--blue-800))]">
            {connectedServices.length} service{connectedServices.length !== 1 ? 's' : ''} connected
          </div>
        </div>
      )}

      <div className="space-y-3">
        {categories.map(cat => (
          <CategorySection
            key={cat.id}
            category={cat}
            connectedIds={connectedIds}
            activeServiceId={defaultService}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onTest={handleTest}
            onSetDefault={handleSetDefault}
            connecting={connecting}
            testing={testing}
          />
        ))}
      </div>
    </div>
  );
}

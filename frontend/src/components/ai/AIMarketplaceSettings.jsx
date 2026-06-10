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
  Cloud,
  Cpu,
  KeyRound,
  ExternalLink,
  ChevronDown,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';

const ICONS = {
  ollama: Server,
  openrouter: Globe,
  huggingface: Cloud,
  mistral: Zap,
  groq: Cpu,
  cohere: Cloud,
  anthropic: Cloud,
  openai: Cloud,
};

export default function AIMarketplaceSettings() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [providers, setProviders] = useState([]);
  const [myProviders, setMyProviders] = useState([]);
  const [activeProvider, setActiveProvider] = useState('');
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');

  const [status, setStatus] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [pRes, mRes, sRes] = await Promise.all([
        axios.get(`${API}/ai-marketplace/providers`, { headers }),
        axios.get(`${API}/ai-marketplace/my-providers`, { headers }),
        axios.get(`${API}/ai-marketplace/status`, { headers }),
      ]);
      setProviders(pRes.data.providers || []);
      setMyProviders(mRes.data.providers || []);
      setActiveProvider(mRes.data.active_provider || '');
      setStatus(sRes.data);
    } catch {
      toast({ title: 'Failed to load AI providers', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const openConnectModal = (p) => {
    const meta = providers.find(pr => pr.id === p.id);
    setSelectedProvider(p.id);
    setApiKey('');
    setBaseUrl(p.id === 'ollama' ? 'http://localhost:11434' : '');
    setModel(meta?.models?.[0] || '');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedProvider(null);
    setApiKey('');
    setBaseUrl('');
    setModel('');
  };

  const handleConnect = async () => {
    if (!selectedProvider) return;
    setConnecting(true);
    try {
      const meta = providers.find(p => p.id === selectedProvider);
      await axios.post(
        `${API}/ai-marketplace/connect`,
        {
          provider_id: selectedProvider,
          api_key: apiKey,
          base_url: baseUrl,
          model: model || (meta?.models?.[0] || ''),
        },
        { headers }
      );
      toast({ title: `${meta?.name} connected successfully` });
      closeModal();
      await fetchData();
    } catch (e) {
      console.error('AI Marketplace connect error:', e?.response?.data);
      toast({ title: 'Connection failed', description: e?.response?.data?.detail || 'Try again', variant: 'destructive' });
    } finally {
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    if (!selectedProvider) return;
    setTesting(true);
    try {
      const meta = providers.find(p => p.id === selectedProvider);
      const res = await axios.post(
        `${API}/ai-marketplace/test`,
        {
          provider_id: selectedProvider,
          api_key: apiKey,
          base_url: baseUrl,
          model: model || (meta?.models?.[0] || ''),
        },
        { headers }
      );
      if (res.data.ok) {
        toast({ title: 'Test successful', description: `Reply: "${res.data.reply}"` });
      } else {
        toast({ title: 'Test failed', description: res.data.error, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Test failed', description: e?.response?.data?.error || 'Unknown error', variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const handleSetActive = async (pid) => {
    try {
      await axios.post(`${API}/ai-marketplace/set-active`, { provider_id: pid }, { headers });
      toast({ title: 'Active provider updated' });
      await fetchData();
    } catch (e) {
      toast({ title: 'Failed to set active provider', description: e?.response?.data?.detail, variant: 'destructive' });
    }
  };

  const handleDisconnect = async (pid) => {
    try {
      await axios.delete(`${API}/ai-marketplace/disconnect/${pid}`, { headers });
      toast({ title: 'Provider disconnected' });
      await fetchData();
    } catch {
      toast({ title: 'Failed to disconnect', variant: 'destructive' });
    }
  };

  const connectedIds = myProviders.map(p => p.provider_id);
  const selectedMeta = providers.find(p => p.id === selectedProvider);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[hsl(var(--blue-900))]/60">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading AI Marketplace...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-extrabold text-[26px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
          AI Marketplace
        </h2>
        <p className="mt-1 text-[13.5px] text-[hsl(var(--blue-900))]/55">
          Connect any open-source or commercial AI provider. Your data, your choice.
        </p>
      </div>

      {status?.active ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-600" />
          <div>
            <div className="text-[13px] font-bold text-emerald-800">
              Active: {status.provider?.name}
            </div>
            <div className="text-[12px] text-emerald-700/70">
              Model: {status.provider?.model || 'default'}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <div className="text-[13px] text-amber-800">
            No AI provider configured. Connect one below to enable AI features.
          </div>
        </div>
      )}

      {myProviders.length > 0 && (
        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/60 mb-3">
            Connected Providers
          </h3>
          <div className="space-y-2">
            {myProviders.map(p => {
              const meta = providers.find(pr => pr.id === p.provider_id);
              const isActive = activeProvider === p.provider_id;
              const Icon = ICONS[p.provider_id] || Plug;
              return (
                <div
                  key={p.provider_id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition ${
                    isActive
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-black/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-[hsl(var(--blue-700))]" />
                    <div>
                      <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">
                        {meta?.name || p.provider_id}
                      </div>
                      <div className="text-[11px] text-[hsl(var(--blue-900))]/50">
                        Key: {p.masked_key} · Model: {p.model || 'default'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isActive && (
                      <button
                        onClick={() => handleSetActive(p.provider_id)}
                        className="text-[12px] font-bold text-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-800))] px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--blue-50))] transition"
                      >
                        Set Active
                      </button>
                    )}
                    {isActive && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                        Active
                      </span>
                    )}
                    <button
                      onClick={() => handleDisconnect(p.provider_id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Disconnect"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/60 mb-3">
          Add Provider
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {providers.map(p => {
            const isConnected = connectedIds.includes(p.id);
            const Icon = ICONS[p.id] || Plug;
            return (
              <button
                key={p.id}
                onClick={() => !isConnected && openConnectModal(p)}
                disabled={isConnected}
                className={`text-left p-4 rounded-xl border transition ${
                  isConnected
                    ? 'bg-emerald-50/50 border-emerald-100 opacity-60 cursor-default'
                    : 'bg-white border-black/5 hover:border-[hsl(var(--blue-700))]/30 cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-[hsl(var(--blue-50))] flex items-center justify-center">
                      <Icon className="w-4 h-4 text-[hsl(var(--blue-700))]" />
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">{p.name}</div>
                      <div className="text-[11px] text-[hsl(var(--blue-900))]/50 mt-0.5">{p.description}</div>
                    </div>
                  </div>
                  {isConnected && <Check className="w-4 h-4 text-emerald-500" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={open => !open && closeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-[18px] text-[hsl(var(--blue-900))]">
              Connect {selectedMeta?.name}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[hsl(var(--blue-900))]/55">
              Enter your credentials to connect to {selectedMeta?.name}.
              {selectedMeta?.website && (
                <a
                  href={selectedMeta.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 inline-flex items-center gap-0.5 text-[hsl(var(--blue-700))] hover:underline"
                >
                  Visit website <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedMeta?.requires_key && (
              <div>
                <label className="block text-[12px] font-bold text-[hsl(var(--blue-900))]/70 mb-1.5">
                  {selectedMeta.key_label}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--blue-900))]/30" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={selectedMeta.key_placeholder}
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-black/10 text-[13px] focus:border-[hsl(var(--blue-700))] outline-none transition"
                  />
                </div>
              </div>
            )}

            {selectedProvider === 'ollama' && (
              <div>
                <label className="block text-[12px] font-bold text-[hsl(var(--blue-900))]/70 mb-1.5">
                  Base URL
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full h-10 px-3 rounded-lg border border-black/10 text-[13px] focus:border-[hsl(var(--blue-700))] outline-none transition"
                />
              </div>
            )}

            {selectedMeta?.models?.length > 0 && (
              <div>
                <label className="block text-[12px] font-bold text-[hsl(var(--blue-900))]/70 mb-1.5">
                  Model
                </label>
                <div className="relative">
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--blue-900))]/30 pointer-events-none" />
                  <select
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    className="w-full h-10 px-3 pr-8 rounded-lg border border-black/10 text-[13px] focus:border-[hsl(var(--blue-700))] outline-none transition bg-white appearance-none"
                  >
                    {selectedMeta.models.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              onClick={handleTest}
              disabled={testing || (selectedMeta?.requires_key && !apiKey)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-black/10 text-[13px] font-bold text-[hsl(var(--blue-900))]/70 hover:bg-white disabled:opacity-50 transition"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Test
            </button>
            <button
              onClick={handleConnect}
              disabled={connecting || (selectedMeta?.requires_key && !apiKey)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[hsl(var(--blue-700))] text-white text-[13px] font-bold hover:bg-[hsl(var(--blue-800))] disabled:opacity-50 transition"
            >
              {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />}
              Connect
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
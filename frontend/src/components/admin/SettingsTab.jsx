import { useEffect, useState, useCallback } from 'react';
import { Loader2, Save, Eye, EyeOff } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

const FIREBASE_FIELDS = [
  { key: 'apiKey', label: 'API Key', required: true },
  { key: 'authDomain', label: 'Auth Domain', required: true },
  { key: 'projectId', label: 'Project ID', required: true },
  { key: 'storageBucket', label: 'Storage Bucket', required: false },
  { key: 'messagingSenderId', label: 'Messaging Sender ID', required: false },
  { key: 'appId', label: 'App ID', required: true },
  { key: 'measurementId', label: 'Measurement ID', required: false },
];

function Field({ label, value, onChange, secret }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-1.5">{label}</span>
      <div className="relative">
        <input
          type={secret && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 px-4 rounded-xl bg-black/30 border border-white/10 focus:border-[hsl(var(--accent))] focus:bg-black/40 text-[14px] text-white placeholder:text-slate-600 outline-none transition pr-10"
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </label>
  );
}

export default function SettingsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({});
  const [original, setOriginal] = useState({});

  const fetchSettings = useCallback(async () => {
    try {
      const client = adminClient();
      const res = await client.get('/settings/firebase');
      const cfg = res.data.config || {};
      setConfig(cfg);
      setOriginal(JSON.parse(JSON.stringify(cfg)));
    } catch (e) {
      toast({ title: 'Failed to load settings', description: e.message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const setField = (key, val) => setConfig((prev) => ({ ...prev, [key]: val }));

  const hasChanges = JSON.stringify(config) !== JSON.stringify(original);

  const handleSave = async () => {
    setSaving(true);
    try {
      const client = adminClient();
      await client.put('/settings/firebase', config);
      setOriginal(JSON.parse(JSON.stringify(config)));
      toast({ title: 'Firebase settings saved', variant: 'success' });
    } catch (e) {
      toast({ title: 'Save failed', description: e.response?.data?.detail || e.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--accent))]" />
      </div>
    );
  }

  return (
    <div>
      <AdminHeader
        title="Settings"
        subtitle="Configure Firebase authentication and other platform settings"
      />

      <Panel className="max-w-2xl">
        <h2 className="text-[15px] font-bold text-white mb-1">Firebase Configuration</h2>
        <p className="text-[12.5px] text-slate-400 mb-6">
          These values are used for phone OTP authentication. 
          Create a Firebase project, enable Phone Authentication, and add your web app credentials below.
        </p>

        <div className="space-y-4">
          {FIREBASE_FIELDS.map((f) => (
            <Field
              key={f.key}
              label={`${f.label}${f.required ? ' *' : ''}`}
              value={config[f.key] || ''}
              onChange={(v) => setField(f.key, v)}
              secret={f.key === 'apiKey'}
            />
          ))}
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-60 text-white font-bold text-[14px] transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {!hasChanges && (
            <span className="text-[12px] text-slate-500">No changes to save</span>
          )}
        </div>
      </Panel>

      <Panel className="max-w-2xl mt-6">
        <h2 className="text-[15px] font-bold text-white mb-3">Setup Instructions</h2>
        <ol className="text-[13px] text-slate-400 space-y-2 list-decimal list-inside">
          <li>Go to the <span className="text-slate-200">Firebase Console</span> → Create or select your project</li>
          <li>Enable <span className="text-slate-200">Phone Authentication</span> in Authentication → Sign-in methods</li>
          <li>Add authorized domains: <span className="text-slate-200">wehive.co.in</span> and <span className="text-slate-200">localhost</span></li>
          <li>Go to Project Settings → General → Your apps → Add a web app to get the config values</li>
          <li>Copy the config values and paste them above. The most important fields are <span className="text-slate-200">apiKey</span>, <span className="text-slate-200">authDomain</span>, <span className="text-slate-200">projectId</span>, and <span className="text-slate-200">appId</span>.</li>
          <li>Also set <span className="text-slate-200">FIREBASE_CREDENTIALS</span> env var on the server with the service account JSON for backend verification.</li>
        </ol>
      </Panel>
    </div>
  );
}

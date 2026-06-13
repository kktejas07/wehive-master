import { useEffect, useState } from 'react';
import {
  Loader2, Save, Eye, EyeOff, Info,
  CreditCard, MessageSquare, Globe, Bell, Mail, Smartphone,
} from 'lucide-react';
import { adminClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

function Tooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex ml-1.5">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-slate-500 hover:text-slate-300 transition"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-[11px] text-slate-300 whitespace-nowrap z-50 shadow-lg pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-r border-b border-white/10 rotate-45" />
        </div>
      )}
    </span>
  );
}

function SecretField({ label, tooltip, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="flex items-center text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-1.5">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </span>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 px-4 rounded-xl bg-black/30 border border-white/10 focus:border-[hsl(var(--accent))] focus:bg-black/40 text-[14px] text-white placeholder:text-slate-600 outline-none transition pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </label>
  );
}

function Field({ label, tooltip, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="flex items-center text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-1.5">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-4 rounded-xl bg-black/30 border border-white/10 focus:border-[hsl(var(--accent))] focus:bg-black/40 text-[14px] text-white placeholder:text-slate-600 outline-none transition"
      />
    </label>
  );
}

const NAMESPACES = ['firebase', 'razorpay', 'smtp', 'twilio', 'general', 'notifications'];

const SECTION_META = {
  firebase: { label: 'Firebase', icon: Globe, title: 'Firebase Authentication' },
  razorpay: { label: 'Razorpay', icon: CreditCard, title: 'Razorpay Payments' },
  smtp: { label: 'SMTP Email', icon: Mail, title: 'SMTP Email' },
  twilio: { label: 'Twilio', icon: Smartphone, title: 'Twilio SMS / WhatsApp' },
  notifications: { label: 'Notifications', icon: Bell, title: 'Notifications (Telegram / Discord / WhatsApp)' },
  general: { label: 'General', icon: MessageSquare, title: 'General' },
};

const FIELDS = {
  firebase: [
    { type: 'secret', key: 'apiKey', label: 'API Key', tooltip: 'Public Firebase Web API key from Project Settings → General → Web apps' },
    { type: 'text', key: 'authDomain', label: 'Auth Domain', tooltip: 'Usually your-project-id.firebaseapp.com' },
    { type: 'text', key: 'projectId', label: 'Project ID', tooltip: 'Firebase project identifier' },
    { type: 'text', key: 'storageBucket', label: 'Storage Bucket', tooltip: 'Your-project-id.appspot.com or .firebasestorage.app' },
    { type: 'secret', key: 'messagingSenderId', label: 'Messaging Sender ID', tooltip: 'Found in Firebase Cloud Messaging settings' },
    { type: 'secret', key: 'appId', label: 'App ID', tooltip: 'Web app identifier — 1:xxxx:web:yyyy' },
  ],
  razorpay: [
    { type: 'secret', key: 'key_id', label: 'Key ID', tooltip: 'Razorpay API Key ID (rzp_live_... or rzp_test_...)' },
    { type: 'secret', key: 'key_secret', label: 'Key Secret', tooltip: 'Razorpay API Key Secret — keep this confidential' },
    { type: 'secret', key: 'webhook_secret', label: 'Webhook Secret', tooltip: 'Secret set in Razorpay Dashboard → Settings → Webhooks for signature verification' },
  ],
  smtp: [
    { type: 'text', key: 'host', label: 'SMTP Host', tooltip: 'Email server e.g. smtp.gmail.com, smtp.sendgrid.net' },
    { type: 'text', key: 'port', label: 'SMTP Port', tooltip: 'Usually 587 (TLS) or 465 (SSL)' },
    { type: 'text', key: 'user', label: 'Username', tooltip: 'Full email address or SMTP login user' },
    { type: 'secret', key: 'password', label: 'Password', tooltip: 'SMTP password or App Password (Google requires an App Password)' },
    { type: 'text', key: 'from_address', label: 'From Address', tooltip: 'Sender email e.g. noreply@wehive.co.in' },
    { type: 'text', key: 'from_name', label: 'From Name', tooltip: 'Display name e.g. We Hive' },
  ],
  twilio: [
    { type: 'secret', key: 'account_sid', label: 'Account SID', tooltip: 'Twilio Account SID from twilio.com/console' },
    { type: 'secret', key: 'auth_token', label: 'Auth Token', tooltip: 'Twilio Auth Token — keep this confidential' },
    { type: 'text', key: 'sms_from', label: 'SMS From Number', tooltip: 'Twilio phone number for SMS e.g. +1234567890' },
    { type: 'text', key: 'whatsapp_from', label: 'WhatsApp From Number', tooltip: 'Twilio WhatsApp sender e.g. whatsapp:+14155238886' },
  ],
  notifications: [
    { type: 'secret', key: 'telegram_bot_token', label: 'Telegram Bot Token', tooltip: 'From BotFather — used to send admin notifications via Telegram' },
    { type: 'text', key: 'telegram_chat_id', label: 'Telegram Chat ID', tooltip: 'Chat ID to receive notifications (get from @userinfobot)' },
    { type: 'secret', key: 'discord_webhook_url', label: 'Discord Webhook URL', tooltip: 'Full Discord webhook URL for admin notifications' },
    { type: 'text', key: 'whatsapp_group_invite', label: 'WhatsApp Group Invite', tooltip: 'Public WhatsApp group invite link for customer support' },
  ],
  general: [
    { type: 'text', key: 'frontend_url', label: 'Frontend URL', tooltip: 'Public site URL used in emails and redirects' },
    { type: 'text', key: 'whatsapp_number', label: 'Contact WhatsApp Number', tooltip: 'Business WhatsApp number for customer enquiries' },
    { type: 'text', key: 'contact_email', label: 'Contact Email', tooltip: 'Support email displayed on contact pages' },
    { type: 'text', key: 'consultant_name', label: 'Consultant Name', tooltip: 'Default consultant name shown in chatbot auto-reply' },
  ],
};

export default function SettingsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [settings, setSettings] = useState({});
  const [originals, setOriginals] = useState({});
  const [activeTab, setActiveTab] = useState('firebase');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const client = adminClient();
        const results = {};
        for (const ns of NAMESPACES) {
          const res = await client.get(`/settings/${ns}`);
          results[ns] = res.data.config || {};
        }
        setSettings(results);
        setOriginals(JSON.parse(JSON.stringify(results)));
      } catch (e) {
        toast({ title: 'Failed to load settings', variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const ns = activeTab;
  const meta = SECTION_META[ns];
  const TabIcon = meta.icon;
  const fields = FIELDS[ns] || [];
  const values = settings[ns] || {};
  const hasChanges = JSON.stringify(values) !== JSON.stringify(originals[ns]);

  const setField = (key, val) =>
    setSettings((prev) => ({ ...prev, [ns]: { ...prev[ns], [key]: val } }));

  const handleSave = async () => {
    setSaving(ns);
    try {
      const client = adminClient();
      await client.put(`/settings/${ns}`, { config: settings[ns] });
      setOriginals((prev) => ({ ...prev, [ns]: JSON.parse(JSON.stringify(settings[ns])) }));
      toast({ title: `${meta.label} settings saved`, variant: 'success' });
    } catch (e) {
      toast({ title: `Failed to save ${meta.label}`, description: e.response?.data?.detail || e.message, variant: 'error' });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--accent))]" />
      </div>
    );
  }

  const changedTabs = NAMESPACES.filter((n) => JSON.stringify(settings[n]) !== JSON.stringify(originals[n]));

  return (
    <div>
      <AdminHeader
        title="Settings"
        subtitle="Configure all platform integrations — saved to database, applied instantly without redeployment"
      />

      <div className="sticky top-0 z-10 bg-[#0b1020] pt-4 pb-3 flex gap-1 overflow-x-auto scrollbar-none border-b border-white/5 mb-6">
        {NAMESPACES.map((n) => {
          const m = SECTION_META[n] || { label: n, icon: Globe };
          const Icon = m.icon;
          const dirty = changedTabs.includes(n);
          return (
            <button
              key={n}
              onClick={() => setActiveTab(n)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-bold transition-all ${
                activeTab === n
                  ? 'bg-[hsl(var(--accent))] text-white shadow-[0_4px_20px_-6px_hsl(var(--accent))]'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${dirty && activeTab !== n ? 'text-amber-400' : ''}`} />
              {m.label}
              {dirty && activeTab !== n && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-400" />}
            </button>
          );
        })}
      </div>

      <div className="animate-[fadeIn_0.2s_ease]">
        <Panel className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[hsl(var(--accent))]/15 flex items-center justify-center">
                <TabIcon className="w-4.5 h-4.5 text-[hsl(var(--accent))]" />
              </div>
              <h3 className="text-[16px] font-bold text-white">{meta.title}</h3>
            </div>
            <div className="flex items-center gap-3">
              {changedTabs.length > 1 && (
                <span className="text-[11px] text-amber-400 font-semibold">
                  {changedTabs.length} tabs unsaved
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving === ns || !hasChanges}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-50 text-white font-bold text-[13px] transition"
              >
                {saving === ns ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save {meta.label}
              </button>
              {!hasChanges && <span className="text-[12px] text-emerald-400 font-semibold">All saved</span>}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key}>
                {field.type === 'secret' ? (
                  <SecretField
                    label={field.label}
                    tooltip={field.tooltip}
                    value={values[field.key] || ''}
                    onChange={(v) => setField(field.key, v)}
                  />
                ) : (
                  <Field
                    label={field.label}
                    tooltip={field.tooltip}
                    value={values[field.key] || ''}
                    onChange={(v) => setField(field.key, v)}
                  />
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

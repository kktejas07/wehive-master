import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Loader2, Save, Eye, EyeOff, Info,
  CreditCard, MessageSquare, Globe, Bell, Mail, Smartphone, Cloud, ShieldCheck,
  Palette, Upload as UploadIcon, Key, Server, ChevronDown,
} from 'lucide-react';
import { adminClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

function Tooltip({ text }) {
  const [show, setShow] = useState(false);
  const triggerRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
    }
  };

  useEffect(() => {
    if (show) { updatePosition(); window.addEventListener('scroll', updatePosition, true); }
    return () => window.removeEventListener('scroll', updatePosition, true);
  }, [show]);

  return (
    <span className="inline-flex ml-1.5">
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={() => { updatePosition(); setShow(true); }}
        onMouseLeave={() => setShow(false)}
        className="text-slate-500 hover:text-slate-300 transition"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && createPortal(
        <div
          className="fixed z-[99999] -translate-x-1/2 px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-[11px] text-slate-300 whitespace-nowrap shadow-lg pointer-events-none"
          style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -100%)' }}
        >
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-r border-b border-white/10 rotate-45" />
        </div>,
        document.body
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

function ToggleField({ label, tooltip, value, onChange }) {
  return (
    <label className="block">
      <span className="flex items-center text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-1.5">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
          value ? 'bg-emerald-500' : 'bg-white/15'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

const NAMESPACES = ['firebase', 'razorpay', 'email', 'twilio', 'auth_methods', 'general', 'notifications', 'r2', 'branding', 'openwa'];

const SECTION_META = {
  firebase: { label: 'Firebase', icon: Globe, title: 'Firebase Authentication' },
  razorpay: { label: 'Razorpay', icon: CreditCard, title: 'Razorpay Payments' },
  email: { label: 'Email', icon: Mail, title: 'Email (SMTP / Postal)' },
  twilio: { label: 'Twilio', icon: Smartphone, title: 'Twilio SMS / WhatsApp' },
  auth_methods: { label: 'Auth Methods', icon: ShieldCheck, title: 'Authentication Methods' },
  notifications: { label: 'Notifications', icon: Bell, title: 'Notifications (Telegram / Discord / WhatsApp)' },
  general: { label: 'General', icon: MessageSquare, title: 'General' },
  r2: { label: 'R2 Storage', icon: Cloud, title: 'Cloudflare R2 Image Storage' },
  branding: { label: 'Branding', icon: Palette, title: 'Site Branding & Assets' },
  openwa: { label: 'OpenWA', icon: MessageSquare, title: 'OpenWA WhatsApp API' },
};

const FIELDS = {
  firebase: [
    { type: 'secret', key: 'apiKey', label: 'API Key', tooltip: 'Public Firebase Web API key from Project Settings → General → Web apps' },
    { type: 'text', key: 'authDomain', label: 'Auth Domain', tooltip: 'Usually your-project-id.firebaseapp.com' },
    { type: 'text', key: 'projectId', label: 'Project ID', tooltip: 'Firebase project identifier' },
    { type: 'text', key: 'storageBucket', label: 'Storage Bucket', tooltip: 'Your-project-id.appspot.com or .firebasestorage.app' },
    { type: 'secret', key: 'messagingSenderId', label: 'Messaging Sender ID', tooltip: 'Found in Firebase Cloud Messaging settings' },
    { type: 'secret', key: 'appId', label: 'App ID', tooltip: 'Web app identifier — 1:xxxx:web:yyyy' },
    { type: 'secret', key: 'service_account_key', label: 'Service Account Key (JSON)', tooltip: 'Download from Firebase Console → Project Settings → Service Accounts → Generate new private key. Paste the entire JSON content. Required for Google/Email auth to work on backend.' },
  ],
  razorpay: [
    { type: 'secret', key: 'key_id', label: 'Key ID', tooltip: 'Razorpay API Key ID (rzp_live_... or rzp_test_...)' },
    { type: 'secret', key: 'key_secret', label: 'Key Secret', tooltip: 'Razorpay API Key Secret — keep this confidential' },
    { type: 'secret', key: 'webhook_secret', label: 'Webhook Secret', tooltip: 'Secret set in Razorpay Dashboard → Settings → Webhooks for signature verification' },
  ],
  email: [
    { type: 'select', key: 'provider', label: 'Provider', tooltip: 'Choose SMTP or Postal for sending all emails (OTP, welcome, payments, invoices, password reset)',
      options: [{ value: 'smtp', label: 'SMTP (Gmail, SendGrid, etc.)' }, { value: 'postal', label: 'Postal (self-hosted email API)' }] },
    { type: 'text', key: 'from_address', label: 'From Address', tooltip: 'Sender email for all outgoing mail e.g. noreply@wehive.co.in' },
    { type: 'text', key: 'from_name', label: 'From Name', tooltip: 'Display name for outgoing mail e.g. We Hive' },
    { type: 'divider', key: 'smtp_divider', label: 'SMTP Settings', visibleWhen: { key: 'provider', value: 'smtp' } },
    { type: 'text', key: 'smtp_host', label: 'SMTP Host', tooltip: 'e.g. smtp.gmail.com, smtp.sendgrid.net', visibleWhen: { key: 'provider', value: 'smtp' } },
    { type: 'text', key: 'smtp_port', label: 'SMTP Port', tooltip: 'Usually 587 (TLS) or 465 (SSL)', visibleWhen: { key: 'provider', value: 'smtp' } },
    { type: 'text', key: 'smtp_user', label: 'SMTP Username', tooltip: 'Full email address or SMTP login user', visibleWhen: { key: 'provider', value: 'smtp' } },
    { type: 'secret', key: 'smtp_password', label: 'SMTP Password', tooltip: 'SMTP password or App Password (Google requires an App Password)', visibleWhen: { key: 'provider', value: 'smtp' } },
    { type: 'divider', key: 'postal_divider', label: 'Postal Settings', visibleWhen: { key: 'provider', value: 'postal' } },
    { type: 'text', key: 'postal_api_url', label: 'Postal API URL', tooltip: 'e.g. https://postal.yourdomain.com', visibleWhen: { key: 'provider', value: 'postal' } },
    { type: 'secret', key: 'postal_api_key', label: 'Postal API Key', tooltip: 'From Postal admin panel → Credentials', visibleWhen: { key: 'provider', value: 'postal' } },
  ],
  twilio: [
    { type: 'secret', key: 'account_sid', label: 'Account SID', tooltip: 'Twilio Account SID from twilio.com/console' },
    { type: 'secret', key: 'auth_token', label: 'Auth Token', tooltip: 'Twilio Auth Token — keep this confidential' },
    { type: 'text', key: 'sms_from', label: 'SMS From Number', tooltip: 'Twilio phone number for SMS e.g. +1234567890' },
    { type: 'text', key: 'whatsapp_from', label: 'WhatsApp From Number', tooltip: 'Twilio WhatsApp sender e.g. whatsapp:+14155238886' },
  ],
  auth_methods: [
    { type: 'toggle', key: 'google_enabled', label: 'Google Sign-In', tooltip: 'Enable Google one-click sign-in via Firebase Auth (must be enabled in Firebase Console first)' },
    { type: 'toggle', key: 'email_password_enabled', label: 'Email / Password', tooltip: 'Enable email + password sign-in via Firebase Auth (must be enabled in Firebase Console first)' },
    { type: 'toggle', key: 'otp_enabled', label: 'OTP (Email)', tooltip: 'Enable OTP-based login via email (uses configured SMTP provider)' },
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
  r2: [
    { type: 'text', key: 'account_id', label: 'Account ID', tooltip: 'Cloudflare Account ID from dashboard URL: dash.cloudflare.com/{account_id}/r2' },
    { type: 'secret', key: 'access_key_id', label: 'Access Key ID', tooltip: 'R2 API token Access Key ID — create in R2 → Manage R2 API Tokens' },
    { type: 'secret', key: 'secret_access_key', label: 'Secret Access Key', tooltip: 'R2 API token Secret — keep this confidential' },
    { type: 'text', key: 'bucket', label: 'Bucket Name', tooltip: 'R2 bucket name e.g. wehive' },
    { type: 'text', key: 'public_url', label: 'Public URL', tooltip: 'R2 public bucket URL e.g. https://pub-xxxxx.r2.dev or a custom domain' },
    { type: 'text', key: 'endpoint', label: 'Endpoint (optional)', tooltip: 'S3 endpoint — defaults to https://{account_id}.r2.cloudflarestorage.com' },
  ],
  branding: [
    { type: 'file', key: 'logo', label: 'Logo', tooltip: 'Main site logo — uploaded to R2, PNG/SVG recommended. On dark backgrounds (footer, admin) auto-renders as white.', accept: 'image/png,image/svg+xml,image/jpeg,image/webp' },
    { type: 'file', key: 'favicon', label: 'Favicon', tooltip: 'Browser tab icon — uploaded to R2. PNG (32x32 or 48x48) recommended.', accept: 'image/png,image/x-icon,image/svg+xml' },
    { type: 'file', key: 'og-image', label: 'OG Image', tooltip: 'Social sharing preview image (1200x630 recommended).', accept: 'image/png,image/jpeg,image/webp' },
    { type: 'text', key: 'site_name', label: 'Site Name', tooltip: 'Used in page titles and SEO metadata (e.g. "We Hive")' },
    { type: 'text', key: 'tagline', label: 'Tagline', tooltip: 'Short description shown in hero section and meta description' },
  ],
  postal: [
    { type: 'text', key: 'api_url', label: 'API URL', tooltip: 'Postal server URL e.g. https://postal.yourdomain.com' },
    { type: 'secret', key: 'api_key', label: 'API Key', tooltip: 'Postal server API key from Postal admin panel → Credentials' },
    { type: 'text', key: 'from_address', label: 'From Address', tooltip: 'Verified sender email in Postal e.g. noreply@wehive.co.in' },
    { type: 'text', key: 'from_name', label: 'From Name', tooltip: 'Display name e.g. We Hive' },
  ],
  openwa: [
    { type: 'text', key: 'api_url', label: 'API URL', tooltip: 'OpenWA server URL e.g. http://167.233.39.15:2785' },
    { type: 'secret', key: 'api_key', label: 'API Key', tooltip: 'OpenWA API key (starts with owa_k1_...)' },
    { type: 'text', key: 'instance_id', label: 'Instance ID', tooltip: 'OpenWA session ID from dashboard' },
  ],
};

export default function SettingsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [settings, setSettings] = useState({});
  const [originals, setOriginals] = useState({});
  const [activeTab, setActiveTab] = useState('firebase');
  const [uploading, setUploading] = useState(null);
  const [brandingAssets, setBrandingAssets] = useState({});

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const client = adminClient();
        const results = {};
        const nsResults = await Promise.all(
          NAMESPACES.map(async (ns) => {
            const res = await client.get(`/settings/${ns}`);
            return { ns, config: res.data.config || {} };
          })
        );
        for (const { ns, config } of nsResults) results[ns] = config;

        // Also load smtp and postal for the consolidated email tab
        const smtpRes = await client.get('/settings/smtp').catch(() => ({ data: { config: {} } }));
        const postalRes = await client.get('/settings/postal').catch(() => ({ data: { config: {} } }));
        const smtpCfg = smtpRes.data.config || {};
        const postalCfg = postalRes.data.config || {};

        // Merge into email: SMTP fields prefixed with smtp_, Postal with postal_
        if (!results.email) results.email = {};
        if (smtpCfg.host) results.email.smtp_host = smtpCfg.host;
        if (smtpCfg.port) results.email.smtp_port = smtpCfg.port;
        if (smtpCfg.user) results.email.smtp_user = smtpCfg.user;
        if (smtpCfg.password) results.email.smtp_password = smtpCfg.password;
        if (postalCfg.api_url) results.email.postal_api_url = postalCfg.api_url;
        if (postalCfg.api_key) results.email.postal_api_key = postalCfg.api_key;
        // Fall back from_address/from_name from smtp/postal if email namespace doesn't have them
        if (!results.email.from_address && smtpCfg.from_address) results.email.from_address = smtpCfg.from_address;
        if (!results.email.from_name && smtpCfg.from_name) results.email.from_name = smtpCfg.from_name;
        if (!results.email.from_address && postalCfg.from_address) results.email.from_address = postalCfg.from_address;
        if (!results.email.from_name && postalCfg.from_name) results.email.from_name = postalCfg.from_name;

        setSettings(results);
        setOriginals(JSON.parse(JSON.stringify(results)));
        const brandingRes = await client.get('/branding');
        if (brandingRes.data?.assets) setBrandingAssets(brandingRes.data.assets);
      } catch (e) {
        toast({ title: 'Failed to load settings', variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleFileUpload = async (key, file) => {
    setUploading(key);
    try {
      const client = adminClient();
      const form = new FormData();
      form.append('file', file);
      form.append('key', key);
      await client.post('/branding/upload', form);
      toast({ title: `${key} uploaded to R2 successfully`, variant: 'success' });
      const brandingRes = await client.get('/branding');
      if (brandingRes.data?.assets) setBrandingAssets(brandingRes.data.assets);
    } catch (e) {
      toast({ title: `Upload ${key} failed`, description: e.response?.data?.detail || e.message, variant: 'error' });
    } finally {
      setUploading(null);
    }
  };

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
      if (ns === 'email') {
        // Split config into email, smtp, postal namespaces
        const vals = settings.email || {};
        const emailCfg = {};
        if (vals.provider) emailCfg.provider = vals.provider;
        if (vals.from_address) emailCfg.from_address = vals.from_address;
        if (vals.from_name) emailCfg.from_name = vals.from_name;

        const smtpCfg = {};
        if (vals.smtp_host) smtpCfg.host = vals.smtp_host;
        if (vals.smtp_port) smtpCfg.port = vals.smtp_port;
        if (vals.smtp_user) smtpCfg.user = vals.smtp_user;
        if (vals.smtp_password) smtpCfg.password = vals.smtp_password;
        if (vals.from_address) smtpCfg.from_address = vals.from_address;
        if (vals.from_name) smtpCfg.from_name = vals.from_name;

        const postalCfg = {};
        if (vals.postal_api_url) postalCfg.api_url = vals.postal_api_url;
        if (vals.postal_api_key) postalCfg.api_key = vals.postal_api_key;
        if (vals.from_address) postalCfg.from_address = vals.from_address;
        if (vals.from_name) postalCfg.from_name = vals.from_name;

        await client.put(`/settings/email`, { config: emailCfg });
        await client.put(`/settings/smtp`, { config: smtpCfg });
        await client.put(`/settings/postal`, { config: postalCfg });
        toast({ title: 'Email settings saved', variant: 'success' });
      } else {
        await client.put(`/settings/${ns}`, { config: settings[ns] });
        toast({ title: `${meta.label} settings saved`, variant: 'success' });
      }
      setOriginals((prev) => ({ ...prev, [ns]: JSON.parse(JSON.stringify(settings[ns])) }));
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
            {fields.map((field) => {
              if (field.visibleWhen) {
                const depVal = values[field.visibleWhen.key];
                if (depVal !== field.visibleWhen.value) return null;
              }
              if (field.type === 'divider') {
                return (
                  <div key={field.key} className="sm:col-span-2 pt-2 border-t border-white/10">
                    <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-400">{field.label}</div>
                  </div>
                );
              }
              return (
                <div key={field.key}>
                  {field.type === 'select' ? (
                    <label className="block">
                      <span className="flex items-center text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-1.5">
                        {field.label}
                        {field.tooltip && <Tooltip text={field.tooltip} />}
                      </span>
                      <div className="relative">
                        <select
                          value={values[field.key] || ''}
                          onChange={(e) => setField(field.key, e.target.value)}
                          className="w-full h-11 px-4 pr-10 rounded-xl bg-black/30 border border-white/10 focus:border-[hsl(var(--accent))] text-[14px] text-white outline-none transition appearance-none"
                        >
                          <option value="">Select provider...</option>
                          {field.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      </div>
                    </label>
                  ) : field.type === 'secret' ? (
                    <SecretField
                      label={field.label}
                      tooltip={field.tooltip}
                      value={values[field.key] || ''}
                      onChange={(v) => setField(field.key, v)}
                    />
                  ) : field.type === 'toggle' ? (
                    <ToggleField
                      label={field.label}
                      tooltip={field.tooltip}
                      value={values[field.key] ?? true}
                      onChange={(v) => setField(field.key, v)}
                    />
                  ) : field.type === 'file' ? (
                    <div>
                      <label className="block">
                        <span className="flex items-center text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-1.5">
                          {field.label}
                          {field.tooltip && <Tooltip text={field.tooltip} />}
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold transition cursor-pointer shrink-0">
                          {uploading === field.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadIcon className="w-3.5 h-3.5" />}
                          {uploading === field.key ? 'Uploading...' : `Upload ${field.label}`}
                          <input
                            type="file"
                            accept={field.accept || 'image/*'}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(field.key, file);
                            }}
                          />
                        </label>
                        {brandingAssets[field.key]?.url && (
                          <img src={brandingAssets[field.key].url} alt={field.label} className="h-10 w-auto max-w-[120px] rounded-lg object-contain border border-white/10 bg-white/5" />
                        )}
                      </div>
                      {brandingAssets[field.key] && (
                        <p className="mt-1 text-[10px] text-slate-500">
                          Uploaded • {(brandingAssets[field.key].size / 1024).toFixed(1)} KB
                        </p>
                      )}
                    </div>
                  ) : (
                    <Field
                      label={field.label}
                      tooltip={field.tooltip}
                      value={values[field.key] || ''}
                      onChange={(v) => setField(field.key, v)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

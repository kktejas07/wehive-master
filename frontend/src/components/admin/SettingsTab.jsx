import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Save, Eye, EyeOff, Info, ChevronDown, ChevronRight,
  CreditCard, MessageSquare, Globe, Bell, Mail, Smartphone,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
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

function Section({ title, icon: Icon, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen !== false);
  return (
    <Panel className="mb-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[hsl(var(--accent))]/15 flex items-center justify-center">
            <Icon className="w-4 h-4 text-[hsl(var(--accent))]" />
          </div>
          <h3 className="text-[14px] font-bold text-white">{title}</h3>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="mt-5 space-y-4">{children}</div>}
    </Panel>
  );
}

export default function SettingsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [settings, setSettings] = useState({});
  const [originals, setOriginals] = useState({});

  const NAMESPACES = ['firebase', 'razorpay', 'smtp', 'twilio', 'general', 'notifications', 'getotp'];

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

  const setField = (ns, key, val) =>
    setSettings((prev) => ({ ...prev, [ns]: { ...prev[ns], [key]: val } }));

  const hasChanges = (ns) =>
    JSON.stringify(settings[ns]) !== JSON.stringify(originals[ns]);

  const handleSave = async (ns) => {
    setSaving(ns);
    try {
      const client = adminClient();
      await client.put(`/settings/${ns}`, { config: settings[ns] });
      setOriginals((prev) => ({ ...prev, [ns]: JSON.parse(JSON.stringify(settings[ns])) }));
      toast({ title: `${ns} settings saved`, variant: 'success' });
    } catch (e) {
      toast({ title: `Failed to save ${ns}`, description: e.response?.data?.detail || e.message, variant: 'error' });
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

  const s = (ns) => settings[ns] || {};

  return (
    <div>
      <AdminHeader
        title="Settings"
        subtitle="Configure all platform integrations — saved to database, applied instantly without redeployment"
      />

      {/* Firebase */}
      <Section title="Firebase Authentication" icon={Globe}>
        <SecretField
          label="API Key"
          tooltip="Public Firebase Web API key from Project Settings → General → Web apps"
          value={s('firebase').apiKey || ''}
          onChange={(v) => setField('firebase', 'apiKey', v)}
        />
        <Field
          label="Auth Domain"
          tooltip="Usually your-project-id.firebaseapp.com"
          value={s('firebase').authDomain || ''}
          onChange={(v) => setField('firebase', 'authDomain', v)}
        />
        <Field
          label="Project ID"
          tooltip="Firebase project identifier"
          value={s('firebase').projectId || ''}
          onChange={(v) => setField('firebase', 'projectId', v)}
        />
        <Field
          label="Storage Bucket"
          tooltip="Your-project-id.appspot.com or .firebasestorage.app"
          value={s('firebase').storageBucket || ''}
          onChange={(v) => setField('firebase', 'storageBucket', v)}
        />
        <SecretField
          label="Messaging Sender ID"
          tooltip="Found in Firebase Cloud Messaging settings"
          value={s('firebase').messagingSenderId || ''}
          onChange={(v) => setField('firebase', 'messagingSenderId', v)}
        />
        <SecretField
          label="App ID"
          tooltip="Web app identifier — 1:xxxx:web:yyyy"
          value={s('firebase').appId || ''}
          onChange={(v) => setField('firebase', 'appId', v)}
        />
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleSave('firebase')}
            disabled={saving === 'firebase' || !hasChanges('firebase')}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-60 text-white font-bold text-[13px] transition"
          >
            {saving === 'firebase' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Firebase
          </button>
          {!hasChanges('firebase') && <span className="text-[11px] text-slate-500">Saved</span>}
        </div>
      </Section>

      {/* Razorpay */}
      <Section title="Razorpay Payments" icon={CreditCard}>
        <SecretField
          label="Key ID"
          tooltip="Razorpay API Key ID (rzp_live_... or rzp_test_...)"
          value={s('razorpay').key_id || ''}
          onChange={(v) => setField('razorpay', 'key_id', v)}
        />
        <SecretField
          label="Key Secret"
          tooltip="Razorpay API Key Secret — keep this confidential"
          value={s('razorpay').key_secret || ''}
          onChange={(v) => setField('razorpay', 'key_secret', v)}
        />
        <SecretField
          label="Webhook Secret"
          tooltip="Secret set in Razorpay Dashboard → Settings → Webhooks for signature verification"
          value={s('razorpay').webhook_secret || ''}
          onChange={(v) => setField('razorpay', 'webhook_secret', v)}
        />
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleSave('razorpay')}
            disabled={saving === 'razorpay' || !hasChanges('razorpay')}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-60 text-white font-bold text-[13px] transition"
          >
            {saving === 'razorpay' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Razorpay
          </button>
          {!hasChanges('razorpay') && <span className="text-[11px] text-slate-500">Saved</span>}
        </div>
      </Section>

      {/* SMTP */}
      <Section title="SMTP Email" icon={Mail}>
        <Field
          label="SMTP Host"
          tooltip="Email server e.g. smtp.gmail.com, smtp.sendgrid.net"
          value={s('smtp').host || ''}
          onChange={(v) => setField('smtp', 'host', v)}
        />
        <Field
          label="SMTP Port"
          tooltip="Usually 587 (TLS) or 465 (SSL)"
          value={s('smtp').port || ''}
          onChange={(v) => setField('smtp', 'port', v)}
        />
        <Field
          label="Username"
          tooltip="Full email address or SMTP login user"
          value={s('smtp').user || ''}
          onChange={(v) => setField('smtp', 'user', v)}
        />
        <SecretField
          label="Password"
          tooltip="SMTP password or App Password (Google requires an App Password)"
          value={s('smtp').password || ''}
          onChange={(v) => setField('smtp', 'password', v)}
        />
        <Field
          label="From Address"
          tooltip="Sender email e.g. noreply@wehive.co.in"
          value={s('smtp').from_address || ''}
          onChange={(v) => setField('smtp', 'from_address', v)}
        />
        <Field
          label="From Name"
          tooltip="Display name e.g. We Hive"
          value={s('smtp').from_name || ''}
          onChange={(v) => setField('smtp', 'from_name', v)}
        />
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleSave('smtp')}
            disabled={saving === 'smtp' || !hasChanges('smtp')}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-60 text-white font-bold text-[13px] transition"
          >
            {saving === 'smtp' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save SMTP
          </button>
          {!hasChanges('smtp') && <span className="text-[11px] text-slate-500">Saved</span>}
        </div>
      </Section>

      {/* Twilio */}
      <Section title="Twilio SMS / WhatsApp" icon={Smartphone}>
        <SecretField
          label="Account SID"
          tooltip="Twilio Account SID from twilio.com/console"
          value={s('twilio').account_sid || ''}
          onChange={(v) => setField('twilio', 'account_sid', v)}
        />
        <SecretField
          label="Auth Token"
          tooltip="Twilio Auth Token — keep this confidential"
          value={s('twilio').auth_token || ''}
          onChange={(v) => setField('twilio', 'auth_token', v)}
        />
        <Field
          label="SMS From Number"
          tooltip="Twilio phone number for SMS e.g. +1234567890"
          value={s('twilio').sms_from || ''}
          onChange={(v) => setField('twilio', 'sms_from', v)}
        />
        <Field
          label="WhatsApp From Number"
          tooltip="Twilio WhatsApp sender e.g. whatsapp:+14155238886"
          value={s('twilio').whatsapp_from || ''}
          onChange={(v) => setField('twilio', 'whatsapp_from', v)}
        />
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleSave('twilio')}
            disabled={saving === 'twilio' || !hasChanges('twilio')}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-60 text-white font-bold text-[13px] transition"
          >
            {saving === 'twilio' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Twilio
          </button>
          {!hasChanges('twilio') && <span className="text-[11px] text-slate-500">Saved</span>}
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications (Telegram / Discord / WhatsApp)" icon={Bell}>
        <SecretField
          label="Telegram Bot Token"
          tooltip="From BotFather — used to send admin notifications via Telegram"
          value={s('notifications').telegram_bot_token || ''}
          onChange={(v) => setField('notifications', 'telegram_bot_token', v)}
        />
        <Field
          label="Telegram Chat ID"
          tooltip="Chat ID to receive notifications (get from @userinfobot)"
          value={s('notifications').telegram_chat_id || ''}
          onChange={(v) => setField('notifications', 'telegram_chat_id', v)}
        />
        <SecretField
          label="Discord Webhook URL"
          tooltip="Full Discord webhook URL for admin notifications"
          value={s('notifications').discord_webhook_url || ''}
          onChange={(v) => setField('notifications', 'discord_webhook_url', v)}
        />
        <Field
          label="WhatsApp Group Invite"
          tooltip="Public WhatsApp group invite link for customer support"
          value={s('notifications').whatsapp_group_invite || ''}
          onChange={(v) => setField('notifications', 'whatsapp_group_invite', v)}
        />
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleSave('notifications')}
            disabled={saving === 'notifications' || !hasChanges('notifications')}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-60 text-white font-bold text-[13px] transition"
          >
            {saving === 'notifications' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Notifications
          </button>
          {!hasChanges('notifications') && <span className="text-[11px] text-slate-500">Saved</span>}
        </div>
      </Section>

      {/* WhatsApp OTP (GetOTP.co) */}
      <Section title="WhatsApp OTP (GetOTP.co)" icon={Smartphone}>
        <SecretField
          label="RapidAPI Key"
          tooltip="Your RapidAPI key for the GetOTP.co API — get it from rapidapi.com/getotpco"
          value={s('getotp').rapidapi_key || ''}
          onChange={(v) => setField('getotp', 'rapidapi_key', v)}
        />
        <Field
          label="RapidAPI Host"
          tooltip="RapidAPI host e.g. getotp-co-send-otps-via-whatsapp-globally-for-free.p.rapidapi.com"
          value={s('getotp').rapidapi_host || ''}
          onChange={(v) => setField('getotp', 'rapidapi_host', v)}
        />
        <SecretField
          label="GetOTP.co API Key"
          tooltip="Your GetOTP.co API key (different from the RapidAPI key) — passed as &key= in the API call"
          value={s('getotp').api_key || ''}
          onChange={(v) => setField('getotp', 'api_key', v)}
        />
        <Field
          label="Base URL"
          tooltip="API base URL (optional — defaults to the RapidAPI endpoint)"
          value={s('getotp').base_url || ''}
          onChange={(v) => setField('getotp', 'base_url', v)}
        />
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleSave('getotp')}
            disabled={saving === 'getotp' || !hasChanges('getotp')}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-60 text-white font-bold text-[13px] transition"
          >
            {saving === 'getotp' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save GetOTP
          </button>
          {!hasChanges('getotp') && <span className="text-[11px] text-slate-500">Saved</span>}
        </div>
      </Section>

      {/* General */}
      <Section title="General" icon={MessageSquare}>
        <Field
          label="Frontend URL"
          tooltip="Public site URL used in emails and redirects"
          value={s('general').frontend_url || ''}
          onChange={(v) => setField('general', 'frontend_url', v)}
        />
        <Field
          label="Contact WhatsApp Number"
          tooltip="Business WhatsApp number for customer enquiries"
          value={s('general').whatsapp_number || ''}
          onChange={(v) => setField('general', 'whatsapp_number', v)}
        />
        <Field
          label="Contact Email"
          tooltip="Support email displayed on contact pages"
          value={s('general').contact_email || ''}
          onChange={(v) => setField('general', 'contact_email', v)}
        />
        <Field
          label="Consultant Name"
          tooltip="Default consultant name shown in chatbot auto-reply"
          value={s('general').consultant_name || ''}
          onChange={(v) => setField('general', 'consultant_name', v)}
        />
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleSave('general')}
            disabled={saving === 'general' || !hasChanges('general')}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-60 text-white font-bold text-[13px] transition"
          >
            {saving === 'general' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save General
          </button>
          {!hasChanges('general') && <span className="text-[11px] text-slate-500">Saved</span>}
        </div>
      </Section>
    </div>
  );
}

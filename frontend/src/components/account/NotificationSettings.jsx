import { useState } from 'react';
import axios from 'axios';
import { Bell } from 'lucide-react';
import { API } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';

// Which channels application updates, reminders and slot alerts use.
// In-app is always on. WhatsApp is opt-in and needs a phone number on the account.
export default function NotificationSettings({ user, token, onUpdated }) {
  const [prefs, setPrefs] = useState({
    notify_email: user.notify_email !== false,
    notify_whatsapp: !!user.notify_whatsapp,
  });
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setBusy(true);
    try {
      await axios.put(`${API}/users/me`, { [key]: next[key] }, { headers: { Authorization: `Bearer ${token}` } });
      onUpdated?.();
    } catch {
      setPrefs(prefs);
      toast({ title: 'Could not save your preference', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const row = (key, title, help, disabled = false) => (
    <label className={`flex items-start justify-between gap-4 py-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <span>
        <span className="block font-semibold text-[14px] text-[hsl(var(--blue-900))]">{title}</span>
        <span className="block text-[13px] text-muted-foreground">{help}</span>
      </span>
      <input type="checkbox" className="mt-1 h-5 w-5" checked={prefs[key]} disabled={busy || disabled} onChange={() => toggle(key)} />
    </label>
  );

  return (
    <div className="mt-10 pt-8 border-t border-border">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-4 h-4 text-[hsl(var(--blue-700))]" aria-hidden="true" />
        <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-700))]">Notifications</span>
      </div>
      <p className="text-[13px] text-muted-foreground mb-2">
        Application updates, appointment and deadline reminders, and visa slot alerts always appear in WeHive. Choose where else to get them.
      </p>
      <div className="divide-y divide-border">
        {row('notify_email', 'Email', user.email ? `Sent to ${user.email}` : 'Add an email address in your profile first', !user.email)}
        {row('notify_whatsapp', 'WhatsApp', user.phone ? `Sent to ${user.phone}` : 'Add a phone number in your profile first', !user.phone)}
      </div>
    </div>
  );
}

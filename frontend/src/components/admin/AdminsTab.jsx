import { useEffect, useState, useCallback } from 'react';
import { Loader2, UserPlus, ShieldCheck, Trash2, Mail, Copy } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { apiClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

const errText = (e) => {
  const d = e?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d.length) return d[0]?.loc?.includes('email') ? 'Enter a valid email address.' : d[0].msg;
  return e.message;
};

function StatusPill({ a }) {
  if (a.env_managed) return <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11.5px] font-semibold text-slate-200">Server setting</span>;
  if (!a.has_password) return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11.5px] font-semibold text-amber-300">Invite pending</span>;
  return <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-300">Active</span>;
}

export default function AdminsTab() {
  const { token, admin: me } = useAdminAuth();
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await apiClient(token).get('/admin-auth/admins');
      setItems(r.data.items);
    } catch (e) {
      setItems([]);
      toast({ title: 'Could not load admins', description: errText(e) });
    }
  }, [token, toast]);

  useEffect(() => { load(); }, [load]);

  const invite = async (targetEmail, targetName) => {
    setBusy(true);
    setLink(null);
    try {
      const { data } = await apiClient(token).post('/admin-auth/admins', { email: targetEmail, name: targetName || null });
      if (!data.invited) toast({ title: 'Admin added', description: `${targetEmail} can now sign in to the dashboard.` });
      else if (data.email_sent) toast({ title: 'Invite sent', description: `${targetEmail} will get an email to set their password.` });
      else {
        toast({ title: 'Admin added, but the email could not be sent', description: 'Copy the invite link below and send it to them.' });
        setLink({ email: targetEmail, url: data.invite_link });
      }
      setEmail(''); setName('');
      await load();
    } catch (e) {
      toast({ title: 'Could not add admin', description: errText(e) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a) => {
    if (!window.confirm(`Remove admin access from ${a.email}? They will be signed out of the dashboard.`)) return;
    try {
      await apiClient(token).delete(`/admin-auth/admins/${a.id}`);
      toast({ title: 'Admin access removed', description: a.email });
      await load();
    } catch (e) {
      toast({ title: 'Could not remove admin', description: errText(e) });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      toast({ title: 'Invite link copied' });
    } catch {
      toast({ title: 'Copy failed', description: 'Select the link and copy it manually.' });
    }
  };

  return (
    <div data-testid="admin-admins-tab">
      <AdminHeader
        title="Admins"
        subtitle="People with full access to this dashboard. Add an existing user by email, or invite someone new to set a password."
      />

      <Panel className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-3">Add an admin</div>
        <form
          className="grid sm:grid-cols-[1fr_1fr_auto] gap-3"
          onSubmit={(e) => { e.preventDefault(); if (email.trim()) invite(email.trim(), name.trim()); }}
        >
          <input
            data-testid="admin-admins-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email"
            className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-[13.5px] text-white placeholder:text-slate-500"
          />
          <input
            data-testid="admin-admins-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (for new people)"
            aria-label="Name"
            className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-[13.5px] text-white placeholder:text-slate-500"
          />
          <button
            data-testid="admin-admins-add-btn"
            type="submit"
            disabled={busy || !email.trim()}
            className="h-10 px-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white text-[13.5px] font-bold disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-3.5 h-3.5" /> Add admin</>}
          </button>
        </form>
        <p className="mt-3 text-[11.5px] text-slate-400">
          New admins get an email with a link to set their password. The link works once and expires in 72 hours.
        </p>
        {link && (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3" data-testid="admin-admins-invite-link">
            <div className="text-[12.5px] font-semibold text-amber-200 mb-2">Invite link for {link.email}. Send it to them privately.</div>
            <div className="flex gap-2">
              <input readOnly value={link.url} onFocus={(e) => e.target.select()} aria-label="Invite link"
                className="h-9 flex-1 min-w-0 px-3 rounded-lg bg-black/20 border border-white/10 text-[12px] text-slate-200" />
              <button type="button" onClick={copy} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[12px] font-bold text-white">
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>
          </div>
        )}
      </Panel>

      <Panel className="overflow-x-auto p-0">
        <table className="min-w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-slate-400 bg-white/5">
              <th className="px-5 py-3">Admin</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Added</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline text-blue-300" /></td></tr>
            )}
            {items?.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                <ShieldCheck className="w-5 h-5 inline mr-2" /> No admins found.
              </td></tr>
            )}
            {items?.map((a) => {
              const isMe = me?.id === a.id;
              return (
                <tr key={a.id} data-testid={`admin-admins-row-${a.id}`} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-5 py-3">
                    <div className="font-bold text-white">{a.name || '—'}{isMe && <span className="ml-2 text-[11.5px] font-semibold text-slate-400">(you)</span>}</div>
                    <div className="text-[12px] text-slate-400">{a.email || '—'}</div>
                  </td>
                  <td className="px-5 py-3"><StatusPill a={a} /></td>
                  <td className="px-5 py-3 text-slate-400 text-[12.5px]">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      {!a.has_password && !a.env_managed && (
                        <button
                          onClick={() => invite(a.email, a.name)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/15 px-2.5 py-1.5 text-[11.5px] font-bold text-white disabled:opacity-60"
                        >
                          <Mail className="w-3 h-3" /> Resend invite
                        </button>
                      )}
                      {!a.env_managed && !isMe && (
                        <button
                          data-testid={`admin-admins-remove-${a.id}`}
                          onClick={() => remove(a)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 text-[11.5px] font-bold text-red-300"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
      <p className="mt-3 text-[11.5px] text-slate-400">
        Admins marked “Server setting” come from the ADMIN_EMAILS setting on the server and can only be removed there.
      </p>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Loader2, UserPlus, ShieldCheck, Trash2, Mail, Copy, ShieldOff } from 'lucide-react';
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

const ROLE_LABEL = { manager: 'Manager', support: 'Support', finance: 'Finance', viewer: 'Viewer' };

function StatusPill({ a }) {
  if (a.env_managed) return <span className="rounded-full bg-[var(--glass-hover)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--text-primary)]">Server setting</span>;
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
  const [role, setRole] = useState('manager');
  const [roles, setRoles] = useState({});

  const load = useCallback(async () => {
    try {
      const r = await apiClient(token).get('/admin-auth/admins');
      setItems(r.data.items);
      setRoles(r.data.roles || {});
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
      const { data } = await apiClient(token).post('/admin-auth/admins', { email: targetEmail, name: targetName || null, admin_role: role });
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

  const changeRole = async (a, adminRole) => {
    try {
      await apiClient(token).patch(`/admin-auth/admins/${a.id}/role`, { admin_role: adminRole });
      toast({ title: `${a.email} is now ${ROLE_LABEL[adminRole]}` });
      await load();
    } catch (e) {
      toast({ title: 'Could not change role', description: errText(e) });
    }
  };

  const resetTwoFactor = async (a) => {
    if (!window.confirm(`Turn off two-factor for ${a.email}? Do this only after confirming who they are — they can sign in with just a password until they set it up again.`)) return;
    try {
      await apiClient(token).delete(`/admin-auth/admins/${a.id}/2fa`);
      toast({ title: 'Two-factor reset', description: a.email });
      await load();
    } catch (e) {
      toast({ title: 'Could not reset two-factor', description: errText(e) });
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
        subtitle="People who can open this dashboard. Pick a role to limit what they can change; everyone can view."
      />

      <Panel className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--text-secondary)] mb-3">Add an admin</div>
        <form
          className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-3"
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
            className="h-10 px-3 rounded-xl bg-[var(--glass-hover)] border border-[var(--glass-border)] text-[13.5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
          <input
            data-testid="admin-admins-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (for new people)"
            aria-label="Name"
            className="h-10 px-3 rounded-xl bg-[var(--glass-hover)] border border-[var(--glass-border)] text-[13.5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
          <select
            data-testid="admin-admins-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            aria-label="Role"
            className="h-10 px-3 rounded-xl bg-[var(--glass-hover)] border border-[var(--glass-border)] text-[13.5px] text-[var(--text-primary)]"
          >
            {Object.keys(ROLE_LABEL).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <button
            data-testid="admin-admins-add-btn"
            type="submit"
            disabled={busy || !email.trim()}
            className="h-10 px-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white text-[13.5px] font-bold disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-3.5 h-3.5" /> Add admin</>}
          </button>
        </form>
        {Object.keys(roles).length > 0 && (
          <ul className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-0.5 text-[12px] text-[var(--text-secondary)]">
            {Object.entries(roles).map(([k, v]) => <li key={k}><span className="font-semibold text-[var(--text-primary)]">{ROLE_LABEL[k]}</span> — {v}</li>)}
          </ul>
        )}
        <p className="mt-3 text-[11.5px] text-[var(--text-secondary)]">
          New admins get an email with a link to set their password. The link works once and expires in 72 hours.
        </p>
        {link && (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3" data-testid="admin-admins-invite-link">
            <div className="text-[12.5px] font-semibold text-amber-200 mb-2">Invite link for {link.email}. Send it to them privately.</div>
            <div className="flex gap-2">
              <input readOnly value={link.url} onFocus={(e) => e.target.select()} aria-label="Invite link"
                className="h-9 flex-1 min-w-0 px-3 rounded-lg bg-black/20 border border-[var(--glass-border)] text-[12px] text-[var(--text-primary)]" />
              <button type="button" onClick={copy} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--glass-hover)] hover:bg-[var(--glass-border)] text-[12px] font-bold text-[var(--text-primary)]">
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>
          </div>
        )}
      </Panel>

      <Panel className="overflow-x-auto p-0">
        <table className="min-w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-[var(--text-secondary)] bg-[var(--glass-hover)]">
              <th className="px-5 py-3">Admin</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Added</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-[var(--text-secondary)]"><Loader2 className="w-5 h-5 animate-spin inline text-blue-300" /></td></tr>
            )}
            {items?.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-[var(--text-secondary)]">
                <ShieldCheck className="w-5 h-5 inline mr-2" /> No admins found.
              </td></tr>
            )}
            {items?.map((a) => {
              const isMe = me?.id === a.id;
              return (
                <tr key={a.id} data-testid={`admin-admins-row-${a.id}`} className="border-t border-[var(--glass-border)] hover:bg-[var(--glass-hover)]">
                  <td className="px-5 py-3">
                    <div className="font-bold text-[var(--text-primary)]">{a.name || '—'}{isMe && <span className="ml-2 text-[11.5px] font-semibold text-[var(--text-secondary)]">(you)</span>}</div>
                    <div className="text-[12px] text-[var(--text-secondary)]">{a.email || '—'}</div>
                  </td>
                  <td className="px-5 py-3">
                    {a.env_managed ? (
                      <span className="text-[12.5px] font-semibold text-[var(--text-primary)]">Super admin</span>
                    ) : (
                      <select
                        data-testid={`admin-admins-role-${a.id}`}
                        value={a.admin_role || 'manager'}
                        onChange={(e) => changeRole(a, e.target.value)}
                        aria-label={`Role for ${a.email}`}
                        className="h-8 px-2 rounded-lg bg-[var(--glass-hover)] border border-[var(--glass-border)] text-[12.5px] text-[var(--text-primary)]"
                      >
                        {Object.keys(ROLE_LABEL).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <StatusPill a={a} />
                      {a.totp_enabled && <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[11.5px] font-semibold text-blue-200">2FA</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[var(--text-secondary)] text-[12.5px]">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      {!a.has_password && !a.env_managed && (
                        <button
                          onClick={() => invite(a.email, a.name)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--glass-hover)] hover:bg-[var(--glass-border)] px-2.5 py-1.5 text-[11.5px] font-bold text-[var(--text-primary)] disabled:opacity-60"
                        >
                          <Mail className="w-3 h-3" /> Resend invite
                        </button>
                      )}
                      {a.totp_enabled && !isMe && (
                        <button
                          data-testid={`admin-admins-reset-2fa-${a.id}`}
                          onClick={() => resetTwoFactor(a)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--glass-hover)] hover:bg-[var(--glass-border)] px-2.5 py-1.5 text-[11.5px] font-bold text-[var(--text-primary)]"
                        >
                          <ShieldOff className="w-3 h-3" /> Reset 2FA
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
      <p className="mt-3 text-[11.5px] text-[var(--text-secondary)]">
        Admins marked “Server setting” come from the ADMIN_EMAILS setting on the server and can only be removed there.
      </p>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, User } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import { API } from '../../context/AuthContext';
import axios from 'axios';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_BADGE = {
  pending: { label: 'Pending', Icon: Clock, cls: 'bg-amber-500/15 text-amber-300' },
  approved: { label: 'Approved', Icon: CheckCircle, cls: 'bg-emerald-500/15 text-emerald-300' },
  rejected: { label: 'Rejected', Icon: XCircle, cls: 'bg-red-500/15 text-red-300' },
};

const REQUEST_TYPE_LABELS = {
  profile_update: 'Profile Update',
  info_request: 'Information Request',
  document_request: 'Document Request',
};

function StatusBadge({ status }) {
  const b = STATUS_BADGE[status] || STATUS_BADGE.pending;
  const Icon = b.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-[0.12em] ${b.cls}`}>
      <Icon className="w-3 h-3" />
      {b.label}
    </span>
  );
}

function RequestCard({ req, token, onReviewed }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const review = async (action) => {
    setBusy(true);
    try {
      await axios.put(
        `${API}/admin/profile-requests/${req.id}`,
        { action, admin_note: note || null },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast({ title: action === 'approve' ? 'Request approved' : 'Request rejected' });
      onReviewed();
    } catch (e) {
      toast({ title: 'Could not review', description: e?.response?.data?.detail || 'Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const fields = req.requested_fields || {};
  const hasFields = Object.keys(fields).length > 0;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/8 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/5 transition"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold text-white">
              {REQUEST_TYPE_LABELS[req.request_type] || req.request_type}
            </span>
            <StatusBadge status={req.status} />
          </div>
          <div className="mt-0.5 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[12px] text-slate-400">
              <User className="w-3 h-3" />
              {req.user_name || 'Unknown'} · {req.user_email || req.user_phone || '—'}
            </span>
            <span className="text-[11px] text-slate-500">
              {new Date(req.created_at).toLocaleDateString()} {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-white/8 px-5 py-4 space-y-4">
          {hasFields && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-2">Requested changes</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {Object.entries(fields).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/5 px-4 py-2.5">
                    <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500">{k}</div>
                    <div className="text-[13px] font-bold text-white mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {req.message && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">User message</div>
              <div className="text-[13px] text-slate-300 italic">"{req.message}"</div>
            </div>
          )}

          {req.admin_note && req.status !== 'pending' && (
            <div className={`rounded-xl px-4 py-3 text-[13px] ${req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
              <span className="font-bold">Admin note: </span>{req.admin_note}
            </div>
          )}

          {req.status === 'pending' && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1.5">
                  Note to user (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note explaining your decision…"
                  rows={2}
                  className="w-full rounded-xl bg-white/5 border border-white/10 focus:border-[hsl(var(--accent))]/50 outline-none px-4 py-2.5 text-[13px] text-white placeholder:text-slate-500 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => review('approve')}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-[13px] font-bold text-white transition disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Approve
                </button>
                <button
                  onClick={() => review('reject')}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-600/80 hover:bg-red-600 px-5 py-2 text-[13px] font-bold text-white transition disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  Reject
                </button>
              </div>
            </div>
          )}

          {req.status !== 'pending' && req.reviewed_at && (
            <div className="text-[11.5px] text-slate-500">
              Reviewed {new Date(req.reviewed_at).toLocaleDateString()} {new Date(req.reviewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RequestsTab() {
  const { token } = useAdminAuth();
  const [items, setItems] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');

  const load = useCallback(() => {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    axios
      .get(`${API}/admin/profile-requests${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setItems(r.data))
      .catch(() => setItems([]));
  }, [token, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const pending = items?.filter((r) => r.status === 'pending').length ?? 0;

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Profile Requests"
        subtitle={`User-submitted requests for profile changes and information${pending > 0 ? ` · ${pending} pending` : ''}`}
      />

      <Panel>
        <div className="flex flex-wrap gap-2 p-4 border-b border-white/5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-full px-4 py-1.5 text-[12.5px] font-bold transition ${
                statusFilter === f.value
                  ? 'bg-[hsl(var(--accent))] text-white'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {!items && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          )}

          {items && items.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-[14px]">
              No {statusFilter || ''} requests found.
            </div>
          )}

          {items && items.map((req) => (
            <RequestCard key={req.id} req={req} token={token} onReviewed={load} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Loader2, ArrowLeft, AlertTriangle, FileText, Eye, Check, X, RotateCcw, Send, Lock, ShieldCheck, ShieldAlert, ExternalLink, Shield,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, inr, STATUS_COLORS, SEVERITY_PILL, canWrite } from '../../lib/admin';
import { Panel } from './AdminShell';
import { StatusDialog } from './ApplicationsTab';
import { useToast } from '../../hooks/use-toast';

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_review', label: 'In Review' },
  { value: 'awaiting_docs', label: 'Awaiting Docs' },
  { value: 'appointment_scheduled', label: 'Appointment Scheduled' },
  { value: 'biometrics_done', label: 'Biometrics Done' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'visa_approved', label: 'Visa Approved' },
  { value: 'visa_rejected', label: 'Visa Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];
const DOC_PILL = {
  uploaded: 'bg-blue-50 text-blue-200',
  approved: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-red-500/15 text-red-600',
  reupload_requested: 'bg-amber-50 text-amber-700',
};
const TABS = [
  ['overview', 'Overview'], ['documents', 'Documents'], ['messages', 'Messages'],
  ['notes', 'Internal notes'], ['timeline', 'Timeline'], ['scans', 'AI scans'],
];
const label = (s) => (s || 'draft').replace(/_/g, ' ');
const humanize = (k) => k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const errMsg = (e) => e?.response?.data?.detail || e.message;
const inputCls = 'w-full px-3 py-2 rounded-xl bg-gray-50 border border-[#E8EDF8] focus:border-[hsl(var(--blue-700))] text-[13.5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none';
const btn = 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-bold disabled:opacity-50';

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-t first:border-t-0 border-[#E8EDF8] text-[13px]">
      <span className="text-[var(--text-secondary)]">{k}</span>
      <span className="text-[#1B2B5E] text-right break-all">{v || '—'}</span>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--text-secondary)] mb-2">{children}</div>;
}

function ApptDateInput({ value, onSave }) {
  const [v, setV] = useState(value || '');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const dirty = v !== (value || '');
  const save = async () => {
    setBusy(true);
    try {
      await onSave(v);
      toast({ title: 'Appointment date saved' });
    } catch (e) {
      toast({ title: 'Save failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        type="date"
        data-testid="case-appt-date-input"
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="h-8 px-2 rounded-lg bg-gray-50 border border-[#E8EDF8] text-[12.5px] text-[var(--text-primary)] outline-none"
      />
      {dirty && (
        <button
          data-testid="case-appt-date-save"
          disabled={busy}
          onClick={save}
          className="h-8 px-3 rounded-lg bg-[hsl(var(--blue-700))] text-white text-[12px] font-bold disabled:opacity-50"
        >
          {busy ? '…' : 'Save'}
        </button>
      )}
    </div>
  );
}

function Overview({ c, onPatchAppt, readOnly }) {
  const appt = c.visa_appointment || {};
  const form = Object.entries(c.form_data || {}).filter(([, v]) => v !== null && v !== '' && typeof v !== 'object').slice(0, 14);
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Panel>
        <SectionTitle>Applicant</SectionTitle>
        <Row k="Name" v={c.applicant?.name} />
        <Row k="Email" v={c.applicant?.email && <a className="text-blue-700 hover:underline" href={`mailto:${c.applicant.email}`}>{c.applicant.email}</a>} />
        <Row k="Phone" v={c.applicant?.phone} />
        <Row k="Plan" v={c.applicant?.is_premium ? 'Premium' : 'Free'} />
        <Row k="Joined" v={fmtDate(c.applicant?.joined_at)} />
      </Panel>
      <Panel>
        <SectionTitle>Trip</SectionTitle>
        <Row k="Travel date" v={fmtDate(c.travel_date)} />
        <Row k="Applicants" v={c.applicants} />
        <Row k="Fee" v={c.fee_inr != null ? inr(c.fee_inr) : null} />
        <Row k="Appointment" v={appt.date ? `${fmtDate(appt.date)}${appt.time ? ` · ${appt.time}` : ''}` : null} />
        {!readOnly && (
          <ApptDateInput
            value={appt.date ? appt.date.slice(0, 10) : ''}
            onSave={onPatchAppt}
          />
        )}
        <Row k="Embassy" v={[appt.embassy, appt.city].filter(Boolean).join(', ')} />
        <Row k="Agent" v={c.agent ? `${c.agent.name || c.agent.email}${c.agent.agency_name ? ` · ${c.agent.agency_name}` : ''}` : null} />
      </Panel>
      {form.length > 0 && (
        <Panel className="md:col-span-2">
          <SectionTitle>Form details</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-x-6">
            {form.map(([k, v]) => <Row key={k} k={humanize(k)} v={String(v)} />)}
          </div>
        </Panel>
      )}
    </div>
  );
}

function Documents({ c, token, onChanged, readOnly }) {
  const { toast } = useToast();
  const [review, setReview] = useState(null); // { docId, status }
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(null);

  const view = async (d) => {
    const win = window.open('', '_blank');
    if (win) win.opener = null;
    try {
      const r = await adminClient(token).get(`/applications/${c.id}/documents/${d._id}/file`, { responseType: 'blob' });
      const blob = r.data;
      let href;
      if (blob.type.includes('application/json')) href = JSON.parse(await blob.text()).url;
      else {
        href = URL.createObjectURL(blob);
        setTimeout(() => URL.revokeObjectURL(href), 60000);
      }
      if (win) win.location.href = href;
      else window.open(href, '_blank', 'noopener');
    } catch (e) {
      win?.close();
      let detail = e.message;
      try { detail = JSON.parse(await e.response.data.text()).detail || detail; } catch { /* not JSON */ }
      toast({ title: 'Could not open document', description: detail, variant: 'destructive' });
    }
  };

  const submit = async (d, status, why = '') => {
    setBusy(d._id);
    try {
      await adminClient(token).patch(`/applications/${c.id}/documents/${d._id}`, { status, ...(why ? { reason: why } : {}) });
      toast({ title: `Document ${label(status)}`, description: 'The applicant has been notified.' });
      setReview(null);
      setReason('');
      await onChanged();
    } catch (e) {
      toast({ title: 'Review failed', description: errMsg(e), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  if (!c.documents?.length) return <Panel><p className="text-[13.5px] text-[var(--text-secondary)]">No documents uploaded yet.</p></Panel>;
  return (
    <Panel className="p-0 overflow-hidden">
      {c.documents.map((d) => {
        const open = review?.docId === d._id;
        return (
          <div key={d._id} data-testid={`case-doc-${d._id}`} className="border-t first:border-t-0 border-[#E8EDF8] px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <FileText className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
              <div className="flex-1 min-w-[180px]">
                <div className="font-bold text-[var(--text-primary)] text-[13.5px]">{humanize(d.doc_type || 'document')}</div>
                <div className="text-[12px] text-[var(--text-secondary)] break-all">{d.filename} · uploaded {fmt(d.uploaded_at)}</div>
                {d.review_reason && <div className="text-[12px] text-amber-200 mt-0.5">Reason: {d.review_reason}</div>}
              </div>
              <span data-testid={`case-doc-status-${d._id}`} className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] font-bold ${DOC_PILL[d.status] || DOC_PILL.uploaded}`}>
                {label(d.status || 'uploaded')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button data-testid={`case-doc-view-${d._id}`} onClick={() => view(d)} className={`${btn} bg-[#F5F7FF] hover:bg-[#EEF2FF] text-gray-700`}>
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                {!readOnly && <>
                <button data-testid={`case-doc-approve-${d._id}`} disabled={busy === d._id || d.status === 'approved'} onClick={() => submit(d, 'approved')} className={`${btn} bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300`}>
                  <Check className="w-3.5 h-3.5" /> Approve
                </button>
                <button data-testid={`case-doc-reject-${d._id}`} disabled={busy === d._id} onClick={() => { setReview({ docId: d._id, status: 'rejected' }); setReason(''); }} className={`${btn} bg-red-50 hover:bg-red-50 text-red-600`}>
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
                <button data-testid={`case-doc-reupload-${d._id}`} disabled={busy === d._id} onClick={() => { setReview({ docId: d._id, status: 'reupload_requested' }); setReason(''); }} className={`${btn} bg-amber-50 hover:bg-amber-50 text-amber-700`}>
                  <RotateCcw className="w-3.5 h-3.5" /> Request re-upload
                </button>
                </>}
              </div>
            </div>
            {open && (
              <div className="mt-3 sm:pl-7">
                <label htmlFor={`doc-reason-${d._id}`} className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1">
                  Reason for {review.status === 'rejected' ? 'rejecting' : 'requesting a re-upload'} (required, sent to the applicant)
                </label>
                <textarea id={`doc-reason-${d._id}`} data-testid={`case-doc-reason-${d._id}`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="e.g. The scan is blurry — please upload a clearer copy" />
                <div className="mt-2 flex gap-2">
                  <button data-testid={`case-doc-submit-${d._id}`} disabled={!reason.trim() || busy === d._id} onClick={() => submit(d, review.status, reason.trim())} className={`${btn} h-9 px-3.5 bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white`}>
                    {busy === d._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} {review.status === 'rejected' ? 'Reject document' : 'Request re-upload'}
                  </button>
                  <button onClick={() => setReview(null)} className={`${btn} h-9 px-3.5 bg-[#EEF2FF] hover:bg-[#D0DCFF] text-[var(--text-primary)]`}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </Panel>
  );
}

function Composer({ testid, placeholder, cta, busy, onSubmit }) {
  const [text, setText] = useState('');
  return (
    <div className="flex gap-2 items-start mt-3">
      <textarea data-testid={`${testid}-input`} aria-label={placeholder} rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className={`flex-1 ${inputCls}`} />
      <button
        data-testid={`${testid}-submit`}
        disabled={busy || !text.trim()}
        onClick={async () => { if (await onSubmit(text.trim())) setText(''); }}
        className="h-10 px-4 inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white text-[13px] font-semibold disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />} {cta}
      </button>
    </div>
  );
}

function Messages({ c, token, setCase, readOnly }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const send = async (text) => {
    setBusy(true);
    try {
      const { data } = await adminClient(token).post(`/applications/${c.id}/messages`, { text });
      setCase((p) => ({ ...p, messages: [...(p.messages || []), { _id: data.id, ...data }] }));
      return true;
    } catch (e) {
      toast({ title: 'Message not sent', description: errMsg(e), variant: 'destructive' });
      return false;
    } finally {
      setBusy(false);
    }
  };
  const msgs = c.messages || [];
  return (
    <Panel>
      {msgs.length === 0 && <p className="text-[13.5px] text-[var(--text-secondary)]">No messages yet.</p>}
      <ul className="space-y-2.5">
        {msgs.map((m, i) => {
          const staff = m.from === 'consultant';
          return (
            <li key={m._id || i} className={`flex ${staff ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] ${staff ? 'bg-[hsl(var(--blue-700))] text-white' : 'bg-[#F5F7FF] text-[#1B2B5E]'}`}>
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
                <div className={`mt-1 text-[11px] ${staff ? 'text-[var(--text-secondary)]' : 'text-[var(--text-secondary)]'}`}>{m.name || (staff ? 'Consultant' : 'Applicant')} · {fmt(m.at)}</div>
              </div>
            </li>
          );
        })}
      </ul>
      {!readOnly && <Composer testid="case-message" placeholder="Reply to the applicant…" cta="Send" busy={busy} onSubmit={send} />}
      <p className="mt-1.5 text-[11.5px] text-[var(--text-muted)]">The applicant is notified of every reply.</p>
    </Panel>
  );
}

function Notes({ c, token, setCase, readOnly }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const add = async (text) => {
    setBusy(true);
    try {
      const { data } = await adminClient(token).post(`/applications/${c.id}/internal-notes`, { text });
      setCase((p) => ({ ...p, internal_notes: [data, ...(p.internal_notes || [])] }));
      return true;
    } catch (e) {
      toast({ title: 'Note not saved', description: errMsg(e), variant: 'destructive' });
      return false;
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel>
      <div data-testid="case-notes-private" className="flex items-center gap-2 text-[12.5px] font-semibold text-amber-700 mb-3">
        <Lock className="w-3.5 h-3.5" /> Only visible to staff. Never shown to the applicant.
      </div>
      {(c.internal_notes || []).length === 0 && <p className="text-[13.5px] text-[var(--text-secondary)]">No internal notes yet.</p>}
      <ul className="space-y-2">
        {(c.internal_notes || []).map((n) => (
          <li key={n.id} className="rounded-lg bg-[#F5F7FF] px-3 py-2 text-[13px] text-[#1B2B5E]">
            <div className="whitespace-pre-wrap break-words">{n.text}</div>
            <div className="mt-0.5 text-[11.5px] text-[var(--text-secondary)]">{n.by} · {fmt(n.at)}</div>
          </li>
        ))}
      </ul>
      {!readOnly && <Composer testid="case-note" placeholder="Add an internal note…" cta="Add note" busy={busy} onSubmit={add} />}
    </Panel>
  );
}

function Timeline({ c }) {
  const items = [...(c.timeline || [])].reverse();
  if (!items.length) return <Panel><p className="text-[13.5px] text-[var(--text-secondary)]">No timeline events yet.</p></Panel>;
  return (
    <Panel>
      <ol className="space-y-3 border-l border-[#E8EDF8] pl-4">
        {items.map((t, i) => (
          <li key={t.id || i} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[hsl(var(--blue-700))]" />
            <div className="text-[13.5px] font-semibold text-[var(--text-primary)]">{t.label || label(t.status)}</div>
            {t.note && <div className="text-[12.5px] text-[var(--text-secondary)] break-words">{t.note}</div>}
            <div className="text-[11.5px] text-[var(--text-secondary)]">{fmt(t.at)}</div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function Scans({ c }) {
  if (!c.scans?.length) return <Panel><p className="text-[13.5px] text-[var(--text-secondary)]">No AI scans for this application.</p></Panel>;
  return (
    <div className="space-y-4">
      {c.scans.map((s) => {
        const { issuer_verification: iv, ...rest } = s.extracted || {};
        const fields = Object.entries(rest).filter(([, v]) => v !== null && v !== '');
        return (
          <div key={s.id} data-testid={`case-scan-${s.id}`}><Panel>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-bold text-[var(--text-primary)] text-[13.5px]">{humanize(s.kind || 'scan')}</span>
              <span className="text-[12px] text-[var(--text-secondary)]">{fmt(s.created_at)}</span>
              {iv && (iv.found ? (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold bg-emerald-500/15 text-emerald-300">
                  <ShieldCheck className="w-3 h-3" /> Issuer verified{iv.name ? `: ${iv.name}` : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-700">
                  <ShieldAlert className="w-3 h-3" /> Issuer not verified
                </span>
              ))}
              {iv?.url && (
                <a href={iv.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-blue-700 hover:underline">
                  Source <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            {fields.length === 0 ? <p className="text-[12.5px] text-[var(--text-secondary)]">Nothing extracted.</p> : (
              <div className="grid sm:grid-cols-2 gap-x-6">
                {fields.map(([k, v]) => <Row key={k} k={humanize(k)} v={typeof v === 'object' ? JSON.stringify(v) : String(v)} />)}
              </div>
            )}
          </Panel></div>
        );
      })}
    </div>
  );
}

export default function ApplicationCase() {
  const { id } = useParams();
  const { token, admin } = useAdminAuth();
  const { toast } = useToast();
  const [c, setCase] = useState(null);
  const [error, setError] = useState(null); // { status, message }
  const [tab, setTab] = useState('overview');
  const [staff, setStaff] = useState([]);
  const [change, setChange] = useState(null);
  const [busy, setBusy] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [visaFrom, setVisaFrom] = useState('');
  const [visaUntil, setVisaUntil] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);
  const readOnly = !canWrite(admin, 'cases');

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await adminClient(token).get(`/applications/${id}/case`);
      setCase(r.data);
    } catch (e) {
      setError({ status: e?.response?.status, message: errMsg(e) });
    }
  }, [token, id]);

  const loadStaff = useCallback(() => {
    adminClient(token).get('/staff/workload').then((r) => setStaff(r.data.staff || [])).catch(() => {});
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStaff(); }, [loadStaff]);

  const assign = async (staffId) => {
    setBusy(true);
    try {
      const { data } = await adminClient(token).patch(`/applications/${id}/assign`, { staff_id: staffId || null });
      setCase((p) => ({ ...p, assigned_to: staffId || null, assignee: data.assignee }));
      toast({ title: data.assignee ? `Assigned to ${data.assignee.name || data.assignee.email}` : 'Unassigned' });
      loadStaff();
    } catch (e) {
      toast({ title: 'Assignment failed', description: errMsg(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (note) => {
    setBusy(true);
    try {
      await adminClient(token).patch(`/applications/${id}`, { status: change.status, ...(note ? { note } : {}) });
      toast({ title: `Marked as ${label(change.status)}`, description: 'The applicant has been notified.' });
      setChange(null);
      await load();
    } catch (e) {
      toast({ title: 'Status update failed', description: errMsg(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const updateStatusPanel = async () => {
    const target = newStatus || c?.status || 'submitted';
    if (target === 'visa_rejected' && !statusNote.trim()) {
      toast({ title: 'Note required for rejection', variant: 'destructive' });
      return;
    }
    setStatusBusy(true);
    try {
      await adminClient(token).post(`/admin/applications/${id}/status`, {
        status: target,
        note: statusNote || undefined,
        visa_validity_from: visaFrom || undefined,
        visa_validity_until: visaUntil || undefined,
      });
      toast({ title: 'Status updated', description: 'The applicant has been notified.' });
      setStatusNote('');
      setVisaFrom('');
      setVisaUntil('');
      await load();
    } catch (e) {
      toast({ title: 'Status update failed', description: errMsg(e), variant: 'destructive' });
    } finally {
      setStatusBusy(false);
    }
  };

  const patchAppt = async (date) => {
    await adminClient(token).patch(`/applications/${id}`, {
      form_data: { visa_appointment: { date } },
    });
    await load();
  };

  const back = (
    <Link to="/admin/applications" data-testid="case-back" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
      <ArrowLeft className="w-3.5 h-3.5" /> Applications
    </Link>
  );

  if (error) {
    return (
      <div data-testid="case-error">
        {back}
        <Panel className="mt-4">
          <div className="text-[14px] text-red-600 flex items-center gap-2" role="alert">
            <AlertTriangle className="w-4 h-4" />
            {error.status === 404 ? 'Application not found.' : `Could not load this case: ${error.message}`}
            {error.status !== 404 && <button onClick={load} className="underline text-gray-700">Retry</button>}
          </div>
        </Panel>
      </div>
    );
  }
  if (!c) return <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin inline text-blue-700" /></div>;

  const staffOptions = c.assigned_to && !staff.some((s) => s.id === c.assigned_to)
    ? [...staff, { id: c.assigned_to, name: c.assignee?.name || c.assignee?.email || c.assigned_to, open_cases: null }]
    : staff;
  const counts = { documents: c.documents?.length, messages: c.messages?.length, notes: c.internal_notes?.length, scans: c.scans?.length };

  return (
    <div data-testid="admin-case">
      {back}
      <div className="mt-3 mb-5 pb-5 border-b border-[#E8EDF8] flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display font-bold text-[24px] sm:text-[30px] leading-tight tracking-[-0.02em] text-[var(--text-primary)] break-words">
            {c.applicant?.name || c.primary_applicant?.name || 'Unknown applicant'}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[13.5px] text-[var(--text-secondary)]">
            <span>{c.country_name || c.country_id?.toUpperCase()} · {c.visa_type}</span>
            <span className="font-mono text-[12px]">#{c.id.slice(0, 8).toUpperCase()}</span>
            <span data-testid="case-status" className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] uppercase tracking-[0.12em] font-bold ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}>
              {label(c.status)}
            </span>
          </div>
        </div>
        <fieldset disabled={readOnly} className="flex flex-wrap items-end gap-2 disabled:opacity-60">
          <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
            <span className="block mb-1">Status</span>
            <select
              data-testid="case-status-select"
              value={c.status || 'draft'}
              onChange={(e) => setChange({ app: c, status: e.target.value })}
              className="h-10 px-2 rounded-xl bg-[#F5F7FF] border border-[#E8EDF8] text-[13px] text-[var(--text-primary)]"
            >
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
            <span className="block mb-1">Assigned to</span>
            <select
              data-testid="case-assign-select"
              value={c.assigned_to || ''}
              disabled={busy}
              onChange={(e) => assign(e.target.value)}
              className="h-10 px-2 rounded-xl bg-[#F5F7FF] border border-[#E8EDF8] text-[13px] text-[var(--text-primary)] max-w-[230px]"
            >
              <option value="">Unassigned</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.name || s.email}{s.open_cases != null ? ` (${s.open_cases} open)` : ''}</option>
              ))}
            </select>
          </label>
          {admin?.id && c.assigned_to !== admin.id && (
            <button data-testid="case-assign-me" disabled={busy} onClick={() => assign(admin.id)} className="h-10 px-3.5 rounded-xl bg-[#F5F7FF] hover:bg-[#EEF2FF] border border-[#E8EDF8] text-[13px] font-semibold text-gray-700 disabled:opacity-50">
              Assign to me
            </button>
          )}
        </fieldset>
      </div>

      {c.alerts?.length > 0 && (
        <div data-testid="case-alerts" className="flex flex-wrap gap-2 mb-5">
          {c.alerts.map((a, i) => (
            <span key={`${a.kind}-${i}`} data-testid={`case-alert-${a.kind}`} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12.5px] font-semibold ${SEVERITY_PILL[a.severity] || SEVERITY_PILL.info}`}>
              <AlertTriangle className="w-3.5 h-3.5" /> {a.message}{a.due ? ` · ${fmtDate(a.due)}` : ''}
            </span>
          ))}
        </div>
      )}

      <div role="tablist" aria-label="Case sections" className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] mb-4 -mx-1 px-1">
        {TABS.map(([key, text]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            data-testid={`case-tab-${key}`}
            onClick={() => setTab(key)}
            className={`shrink-0 h-9 px-3.5 rounded-xl text-[13px] font-semibold border transition-colors ${tab === key ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))] text-white' : 'bg-[#F5F7FF] border-[#E8EDF8] text-[var(--text-secondary)] hover:bg-[#EEF2FF]'}`}
          >
            {text}{counts[key] ? <span className="ml-1.5 tabular-nums opacity-80">{counts[key]}</span> : null}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'overview' && (
          <>
            <Overview c={c} onPatchAppt={patchAppt} readOnly={readOnly} />
            {!readOnly && (
              <Panel className="mt-4">
                <div className="text-[15px] font-display font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-700" /> Status Control
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">New Status</label>
                    <select value={newStatus || c.status || 'submitted'} onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-[#E8EDF8] text-[var(--text-primary)] text-[13px]">
                      {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">
                      Note {(newStatus || c.status) === 'visa_rejected' && <span className="text-red-400">*required</span>}
                    </label>
                    <textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)}
                      rows={2} placeholder="Admin note visible to applicant…"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-[#E8EDF8] text-[var(--text-primary)] text-[13px] resize-none outline-none" />
                  </div>
                  {(newStatus || c.status) === 'visa_approved' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">Valid From</label>
                        <input type="date" value={visaFrom} onChange={(e) => setVisaFrom(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-[#E8EDF8] text-[var(--text-primary)] text-[13px]" />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">Valid Until</label>
                        <input type="date" value={visaUntil} onChange={(e) => setVisaUntil(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-[#E8EDF8] text-[var(--text-primary)] text-[13px]" />
                      </div>
                    </div>
                  )}
                  <button disabled={statusBusy} onClick={updateStatusPanel}
                    className="btn-admin-primary w-full h-10 rounded-xl text-[13px] font-bold disabled:opacity-50">
                    {statusBusy ? 'Updating…' : 'Update Status'}
                  </button>
                </div>
              </Panel>
            )}
          </>
        )}
        {tab === 'documents' && <Documents c={c} token={token} onChanged={load} readOnly={readOnly} />}
        {tab === 'messages' && <Messages c={c} token={token} setCase={setCase} readOnly={readOnly} />}
        {tab === 'notes' && <Notes c={c} token={token} setCase={setCase} readOnly={readOnly} />}
        {tab === 'timeline' && <Timeline c={c} />}
        {tab === 'scans' && <Scans c={c} />}
      </div>

      <StatusDialog key={change ? change.status : 'none'} change={change} busy={busy} onCancel={() => setChange(null)} onConfirm={updateStatus} />
    </div>
  );
}

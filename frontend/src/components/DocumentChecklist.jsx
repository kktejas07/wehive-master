import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Upload, Check, AlertCircle, Loader2, X, Trash2, HelpCircle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { API, useAuth } from '../context/AuthContext';

const DOC_LABELS = {
  passport: 'Passport (all pages)',
  aadhaar_card: 'Aadhaar Card',
  pan_card: 'PAN Card',
  bank_statement: 'Bank Statement (last 6 months)',
  transcripts: 'Academic Transcripts',
  ielts_results: 'IELTS Results',
  toefl_results: 'TOEFL Results',
  financial_documents: 'Financial Documents',
  employment_letter: 'Employment Letter',
  invitation_letter: 'Invitation Letter',
  photographs: 'Passport-size Photographs',
  flight_booking: 'Flight Booking',
  hotel_booking: 'Hotel Booking',
  travel_insurance: 'Travel Insurance',
  cover_letter: 'Cover Letter',
  degree_certificate: 'Degree Certificate',
  police_clearance: 'Police Clearance',
};

const STATUS_COLORS = {
  uploaded: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Reviewing' },
  reviewing: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Reviewing' },
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Action needed' },
  needs_reupload: { bg: 'bg-red-100', text: 'text-red-700', label: 'Re-upload needed' },
  verified: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Verified' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.uploaded;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-bold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function DocRow({ docType, file, onUpload, onRemove, onHelp, busy }) {
  const inputRef = useRef(null);
  const reuploadRef = useRef(null);
  const has = !!file;
  const needsReupload = has && file.status === 'needs_reupload';
  return (
    <li className="rounded-2xl border border-border bg-white p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <span
          className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full ${
            needsReupload ? 'bg-amber-50 text-amber-600' :
            has ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-[hsl(var(--blue-700))]'
          }`}
        >
          {has ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[15px] font-bold text-[hsl(var(--blue-900))]">{DOC_LABELS[docType] || docType}</div>
            {has && <StatusBadge status={file.status} />}
          </div>
          {has ? (
            <div className="mt-0.5 text-[12.5px] text-muted-foreground truncate">
              {file.filename} · {(file.size / 1024).toFixed(0)} KB · uploaded {new Date(file.uploaded_at).toLocaleDateString()}
            </div>
          ) : (
            <div className="mt-0.5 text-[12.5px] text-muted-foreground">Not uploaded yet</div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {has ? (
            <>
              <button
                onClick={() => onRemove(file.id)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-red-50 text-[hsl(var(--blue-700))]"
                aria-label="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <input
                ref={inputRef}
                type="file"
                hidden
                accept="application/pdf,image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl btn-primary text-white px-3.5 h-9 text-[12.5px] font-bold disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Upload
              </button>
              <button
                onClick={() => onHelp(docType)}
                title="Need help with this document?"
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-[hsl(var(--blue-50))] text-muted-foreground hover:text-[hsl(var(--blue-700))]"
                aria-label="Get help with this document"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
      {needsReupload && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <span className="text-red-700 text-[13px] flex-1">
            Action required: {file.admin_note || 'Please re-upload this document.'}
          </span>
          <input
            ref={reuploadRef}
            type="file"
            hidden
            accept="application/pdf,image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { onRemove(file.id); onUpload(f); }
              e.target.value = '';
            }}
          />
          <button
            onClick={() => reuploadRef.current?.click()}
            disabled={busy}
            className="shrink-0 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-[12px] font-bold rounded-lg transition-colors disabled:opacity-60"
          >
            Re-upload
          </button>
        </div>
      )}
    </li>
  );
}

function DocHelpModal({ docType, applicationId, token, onClose }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    setBusy(true);
    try {
      await axios.post(
        `${API}/leads/doc-help`,
        { doc_type: docType, application_id: applicationId, message: message.trim() || null },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setDone(true);
    } catch {
      toast({ title: 'Could not send request', description: 'Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-[hsl(var(--border))] shadow-xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-4 space-y-3">
            <Check className="w-10 h-10 mx-auto text-emerald-500" />
            <p className="font-bold text-[16px] text-[hsl(var(--blue-900))]">Request sent!</p>
            <p className="text-[14px] text-muted-foreground">
              A WeHive associate will reach out within 24 hours to assist you with <strong>{docType}</strong>.
            </p>
            <button onClick={onClose} className="mt-2 h-10 px-6 rounded-xl btn-accent text-[14px] font-semibold">
              Done
            </button>
          </div>
        ) : (
          <>
            <div>
              <p className="text-[12px] uppercase tracking-wide font-bold text-[hsl(var(--blue-700))]">Document assistance</p>
              <h3 className="mt-1 font-bold text-[18px] text-[hsl(var(--blue-900))]">Help with {docType}</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                A WeHive financial advisor or associate will contact you. This is a paid assistance service — fees will be shared when we connect.
              </p>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[hsl(var(--blue-900))] mb-1.5">
                Describe what you need help with (optional)
              </label>
              <textarea
                rows={3}
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`e.g. I need help arranging financial sponsorship documents for ${docType}`}
                className="w-full rounded-xl border border-[hsl(var(--border))] px-3.5 py-2.5 text-[14px] outline-none focus:border-[hsl(var(--blue-700))] focus:ring-[3px] focus:ring-[hsl(var(--blue-700))]/20 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-[hsl(var(--border))] text-[14px] font-semibold hover:border-[hsl(var(--blue-200))]">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="flex-1 h-10 rounded-xl btn-accent text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Request callback
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getMonthsDiff(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  return (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
}

function getDaysDiff(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  return Math.floor((d - now) / (1000 * 60 * 60 * 24));
}

export function DocumentExpirationWarnings({ docs }) {
  const warnings = [];

  for (const doc of docs || []) {
    const dt = doc.doc_type?.toLowerCase() || '';
    const uploadedAt = doc.uploaded_at;

    if (dt.includes('passport') && uploadedAt) {
      const expMatch = doc.filename?.match(/expiry[e]?[-_\s]?(\d{4}[-\/]\d{2}[-\/]\d{2})/i)
        || doc.metadata?.expiry_date;
      if (expMatch) {
        const months = getMonthsDiff(Array.isArray(expMatch) ? expMatch[1] : expMatch);
        if (months < 0) {
          warnings.push({ type: 'error', doc: doc.doc_type, message: 'Passport has expired. Please renew before applying.' });
        } else if (months < 6) {
          warnings.push({ type: 'warning', doc: doc.doc_type, message: `Passport expires in ${months} month${months !== 1 ? 's' : ''}. Most embassies require 6+ months validity.` });
        }
      }
    }

    if ((dt.includes('bank') || dt.includes('statement')) && uploadedAt) {
      const days = getDaysDiff(uploadedAt);
      if (days < -90) {
        warnings.push({ type: 'warning', doc: doc.doc_type, message: 'Bank statement is older than 3 months. Please upload a recent statement (last 90 days).' });
      }
    }
  }

  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {warnings.map((w, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 rounded-xl px-4 py-3 text-[13px] ${
            w.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-amber-50 border border-amber-200 text-amber-700'
          }`}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{w.message}</span>
        </div>
      ))}
    </div>
  );
}

export default function DocumentChecklist({ applicationId, requiredDocs: requiredDocsProp, token, onDocsChange }) {
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState({});
  const [helpDoc, setHelpDoc] = useState(null);
  const [docReport, setDocReport] = useState(null);
  const { toast } = useToast();

  const requiredDocs = docReport?.mandatory || requiredDocsProp || [];
  const contactMissing = docReport?.contact_info_missing || [];

  const fetchReport = async () => {
    try {
      const r = await axios.get(`${API}/users/me/applications/${applicationId}/required-documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocReport(r.data);
    } catch {
      // Fall back to prop-based list
    }
  };

  const refresh = async () => {
    try {
      const r = await axios.get(`${API}/users/me/applications/${applicationId}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocs(r.data || []);
      onDocsChange?.(r.data || []);
    } catch {
    }
  };

  useEffect(() => {
    if (applicationId && token) {
      fetchReport();
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, token]);

  const handleUpload = async (docType, file) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 10MB. Try compressing the PDF or image.' });
      return;
    }
    setBusy((b) => ({ ...b, [docType]: true }));
    try {
      const fd = new FormData();
      fd.append('doc_type', docType);
      fd.append('file', file);
      await axios.post(`${API}/users/me/applications/${applicationId}/documents`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: 'Uploaded', description: `${file.name}` });
      await refresh();
      fetchReport();
    } catch (e) {
      toast({ title: 'Upload failed', description: e?.response?.data?.detail || 'Try a smaller file (max 10MB).' });
    } finally {
      setBusy((b) => ({ ...b, [docType]: false }));
    }
  };

  const handleRemove = async (id) => {
    try {
      await axios.delete(`${API}/users/me/applications/${applicationId}/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: 'Removed' });
      await refresh();
      fetchReport();
    } catch {
      toast({ title: 'Could not remove' });
    }
  };

  const byType = docs.reduce((m, d) => ({ ...m, [d.doc_type]: d }), {});
  const completed = requiredDocs.filter((d) => !!byType[d]).length;
  const total = requiredDocs.length;

  return (
    <section className="rounded-2xl bg-white border border-border shadow-sm p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))]">Document checklist</div>
          <h2 className="mt-1 font-display font-bold text-[26px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
            {completed} of {total} documents ready
          </h2>
        </div>
        <div className="w-full sm:w-64">
          <div className="h-2 rounded-full bg-[hsl(var(--blue-50))] overflow-hidden">
            <div
              className="h-full bg-[hsl(var(--blue-700))] transition-[width] duration-500"
              style={{ width: total ? `${(completed / total) * 100}%` : '0%' }}
            />
          </div>
        </div>
      </div>

      {contactMissing.length > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-xl px-4 py-3 text-[13px] bg-amber-50 border border-amber-200 text-amber-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Please ensure your {contactMissing.join(' and ')} {contactMissing.length === 1 ? 'is' : 'are'} on file before submitting.</span>
        </div>
      )}

      <DocumentExpirationWarnings docs={docs} />

      <ul className="mt-4 space-y-3">
        {requiredDocs.map((d) => (
          <DocRow
            key={d}
            docType={d}
            file={byType[d]}
            busy={busy[d]}
            onUpload={(f) => handleUpload(d, f)}
            onRemove={handleRemove}
            onHelp={(dt) => setHelpDoc(dt)}
          />
        ))}
      </ul>

      {helpDoc && (
        <DocHelpModal
          docType={helpDoc}
          applicationId={applicationId}
          token={token}
          onClose={() => setHelpDoc(null)}
        />
      )}
    </section>
  );
}

export function getReadyCount(docs, requiredDocs) {
  const byType = (docs || []).reduce((m, d) => ({ ...m, [d.doc_type]: d }), {});
  return (requiredDocs || []).filter((d) => !!byType[d]).length;
}
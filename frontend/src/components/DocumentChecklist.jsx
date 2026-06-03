import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Upload, Check, AlertCircle, Loader2, X, Trash2, Calendar, Clock } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { API } from '../context/AuthContext';

const STATUS_COLORS = {
  uploaded: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Reviewing' },
  reviewing: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Reviewing' },
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Action needed' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.uploaded;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function DocRow({ docType, file, onUpload, onRemove, busy }) {
  const inputRef = useRef(null);
  const has = !!file;
  return (
    <li className="rounded-2xl border border-black/8 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <span
          className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full ${
            has ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-[hsl(var(--accent))]'
          }`}
        >
          {has ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[15px] font-bold text-[hsl(var(--blue-900))]">{docType}</div>
            {has && <StatusBadge status={file.status} />}
          </div>
          {has ? (
            <div className="mt-0.5 text-[12.5px] text-[hsl(var(--blue-900))]/55 truncate">
              {file.filename} · {(file.size / 1024).toFixed(0)} KB · uploaded {new Date(file.uploaded_at).toLocaleDateString()}
            </div>
          ) : (
            <div className="mt-0.5 text-[12.5px] text-[hsl(var(--blue-900))]/55">Not uploaded yet</div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {has ? (
            <>
              <button
                onClick={() => onRemove(file.id)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-red-50 text-[hsl(var(--accent))]"
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
                className="inline-flex items-center gap-1.5 rounded-full btn-primary text-white px-3.5 h-9 text-[12.5px] font-bold disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Upload
              </button>
            </>
          )}
        </div>
      </div>
    </li>
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

export default function DocumentChecklist({ applicationId, requiredDocs, token, onDocsChange }) {
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState({});
  const { toast } = useToast();

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
    if (applicationId && token) refresh();
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
    } catch {
      toast({ title: 'Could not remove' });
    }
  };

  const byType = docs.reduce((m, d) => ({ ...m, [d.doc_type]: d }), {});
  const completed = (requiredDocs || []).filter((d) => !!byType[d]).length;
  const total = (requiredDocs || []).length;

  return (
    <section className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">Document checklist</div>
          <h2 className="mt-1 font-display font-extrabold text-[26px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
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

      <DocumentExpirationWarnings docs={docs} />

      <ul className="mt-4 space-y-3">
        {(requiredDocs || []).map((d) => (
          <DocRow
            key={d}
            docType={d}
            file={byType[d]}
            busy={busy[d]}
            onUpload={(f) => handleUpload(d, f)}
            onRemove={handleRemove}
          />
        ))}
      </ul>
    </section>
  );
}

export function getReadyCount(docs, requiredDocs) {
  const byType = (docs || []).reduce((m, d) => ({ ...m, [d.doc_type]: d }), {});
  return (requiredDocs || []).filter((d) => !!byType[d]).length;
}
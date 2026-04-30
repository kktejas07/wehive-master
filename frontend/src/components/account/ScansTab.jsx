import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import {
  Loader2, Sparkles, ScanLine, FileText, Trash2, ExternalLink, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import { API } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';

/** Pretty a single extracted field. */
function Field({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] uppercase tracking-[0.16em] text-[hsl(var(--blue-900))]/55 font-bold">{label}</dt>
      <dd className="mt-0.5 text-[13px] text-[hsl(var(--blue-900))] font-medium truncate">{String(value)}</dd>
    </div>
  );
}
Field.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
};

function ScanCard({ scan, onDelete, onOpenRaw }) {
  const e = scan.extracted || {};
  const confidence = Number(e.confidence) || null;
  const confidenceColor = confidence == null
    ? 'bg-slate-100 text-slate-600'
    : confidence >= 80
      ? 'bg-emerald-100 text-emerald-700'
      : confidence >= 60
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700';
  const when = new Date(scan.created_at);
  const isPassport = scan.kind === 'passport';

  return (
    <article
      data-testid={`scan-card-${scan.id}`}
      className="rounded-2xl bg-white border border-black/5 p-5 transition hover:border-[hsl(var(--blue-700))]/25"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className={`h-10 w-10 rounded-xl inline-flex items-center justify-center ${isPassport ? 'bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]' : 'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))]'}`}>
            {isPassport ? <ShieldCheck className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
          </span>
          <div>
            <div className="text-[14.5px] font-bold text-[hsl(var(--blue-900))]">
              {isPassport ? 'Passport scan' : (e.document_kind || e.title || 'Document scan').toString().replace(/_/g, ' ')}
            </div>
            <div className="text-[11.5px] text-[hsl(var(--blue-900))]/55">
              {when.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
              {when.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {confidence != null && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] uppercase tracking-[0.12em] font-bold ${confidenceColor}`}>
              {confidence}% confidence
            </span>
          )}
          {scan.application_id && (
            <Link
              to={`/account/applications/${scan.application_id}`}
              data-testid={`scan-open-app-${scan.id}`}
              className="inline-flex items-center gap-1 rounded-lg bg-[hsl(var(--blue-50))] hover:bg-[hsl(var(--blue-100))] px-2.5 py-1 text-[11.5px] font-bold text-[hsl(var(--blue-700))]"
            >
              <ExternalLink className="w-3 h-3" />
              Open app
            </Link>
          )}
          <button
            data-testid={`scan-delete-${scan.id}`}
            onClick={() => onDelete(scan)}
            className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 px-2 py-1 text-[11.5px] font-bold text-red-600"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {isPassport ? (
          <>
            <Field label="Full name" value={e.full_name || [e.given_names, e.surname].filter(Boolean).join(' ')} />
            <Field label="Passport #" value={e.passport_number} />
            <Field label="Nationality" value={e.nationality} />
            <Field label="Date of birth" value={e.date_of_birth} />
            <Field label="Expiry" value={e.expiry_date} />
            <Field label="Issuing country" value={e.issuing_country} />
          </>
        ) : (
          <>
            <Field label="Title" value={e.title} />
            <Field label="Issued to" value={e.issued_to} />
            <Field label="Issued by" value={e.issued_by} />
            <Field label="Reference" value={e.reference_number} />
            <Field label="Date" value={e.date} />
            <Field label="Amount" value={e.amount && e.currency ? `${e.amount} ${e.currency}` : e.amount} />
          </>
        )}
      </dl>

      {Array.isArray(e.warnings) && e.warnings.length > 0 && (
        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-800">
          <div className="inline-flex items-center gap-1.5 font-bold mb-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Warnings
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {e.warnings.slice(0, 4).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onOpenRaw(scan)}
          className="text-[12px] text-[hsl(var(--blue-900))]/55 hover:text-[hsl(var(--blue-700))] font-bold"
        >
          View full extracted JSON
        </button>
      </div>
    </article>
  );
}
ScanCard.propTypes = {
  scan: PropTypes.shape({
    id: PropTypes.string.isRequired,
    kind: PropTypes.oneOf(['passport', 'document']).isRequired,
    extracted: PropTypes.object,
    application_id: PropTypes.string,
    created_at: PropTypes.string.isRequired,
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  onOpenRaw: PropTypes.func.isRequired,
};

function RawScanModal({ scan, onClose }) {
  if (!scan) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="max-w-2xl w-full rounded-3xl bg-white p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">Scan details</div>
            <h3 className="font-display font-extrabold text-[22px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
              {scan.kind === 'passport' ? 'Passport' : 'Document'} scan
            </h3>
          </div>
          <button onClick={onClose} className="rounded-full h-9 w-9 bg-black/5 hover:bg-black/10 inline-flex items-center justify-center text-[hsl(var(--blue-900))]">
            ✕
          </button>
        </div>
        <pre className="text-[12px] bg-[hsl(var(--soft-bg))] rounded-xl p-4 overflow-x-auto leading-relaxed">
{JSON.stringify(scan.extracted || {}, null, 2)}
        </pre>
      </div>
    </div>
  );
}
RawScanModal.propTypes = {
  scan: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

function EmptyState({ isPremium }) {
  return (
    <div className="rounded-3xl bg-[hsl(var(--soft-bg))] border border-black/5 p-10 text-center" data-testid="scans-empty">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] mb-4">
        <ScanLine className="w-7 h-7" />
      </span>
      <h3 className="font-display font-extrabold text-[22px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
        No scans yet
      </h3>
      <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/65 max-w-sm mx-auto">
        {isPremium
          ? 'Open any application and tap "Scan with AI" — we\'ll extract passport & document fields automatically.'
          : 'Scanning is a Premium feature. Upgrade to unlock passport OCR and auto-filled applications.'}
      </p>
      <div className="mt-5">
        <Link
          to="/account?tab=applications"
          className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] hover:brightness-110 text-white px-5 py-2.5 text-[13px] font-bold"
        >
          <Sparkles className="w-3.5 h-3.5" /> Go to applications
        </Link>
      </div>
    </div>
  );
}
EmptyState.propTypes = { isPremium: PropTypes.bool };

export default function ScansTab({ user, token }) {
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('all');
  const [rawScan, setRawScan] = useState(null);

  const load = useCallback(async () => {
    setItems(null);
    try {
      const r = await axios.get(`${API}/scan/history`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100 },
      });
      setItems(r.data.items);
      setTotal(r.data.total);
    } catch (e) {
      toast({ title: 'Could not load scans', description: e?.response?.data?.detail || e.message });
      setItems([]);
    }
  }, [token, toast]);

  useEffect(() => { load(); }, [load]);

  const del = async (scan) => {
    if (!window.confirm('Delete this scan? The extracted data will be removed.')) return;
    try {
      await axios.delete(`${API}/scan/${scan.id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: 'Scan deleted' });
      setItems((arr) => (arr || []).filter((s) => s.id !== scan.id));
      setTotal((n) => Math.max(0, n - 1));
    } catch (e) {
      toast({ title: 'Could not delete', description: e?.response?.data?.detail || e.message });
    }
  };

  const shown = items === null
    ? null
    : items.filter((s) => filter === 'all' ? true : s.kind === filter);

  return (
    <div data-testid="scans-tab">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
            My AI scans
          </div>
          <h2 className="mt-1 font-display font-extrabold text-[26px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
            {total} scan{total === 1 ? '' : 's'} captured
          </h2>
          <p className="mt-1 text-[13px] text-[hsl(var(--blue-900))]/60 max-w-md">
            Every passport or document you've scanned with Wehive AI, including which application they were applied to.
          </p>
        </div>
        {items && items.length > 0 && (
          <div className="inline-flex rounded-xl bg-[hsl(var(--soft-bg))] p-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'passport', label: 'Passports' },
              { id: 'document', label: 'Documents' },
            ].map((f) => (
              <button
                key={f.id}
                data-testid={`scans-filter-${f.id}`}
                onClick={() => setFilter(f.id)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-bold transition ${
                  filter === f.id
                    ? 'bg-[hsl(var(--blue-700))] text-white'
                    : 'text-[hsl(var(--blue-900))]/65 hover:text-[hsl(var(--blue-900))]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {items === null && (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blue-700))]" />
        </div>
      )}
      {shown && shown.length === 0 && <EmptyState isPremium={!!user?.is_premium} />}
      {shown && shown.length > 0 && (
        <div className="grid gap-4">
          {shown.map((s) => (
            <ScanCard key={s.id} scan={s} onDelete={del} onOpenRaw={setRawScan} />
          ))}
        </div>
      )}

      <RawScanModal scan={rawScan} onClose={() => setRawScan(null)} />
    </div>
  );
}
ScansTab.propTypes = {
  user: PropTypes.shape({
    is_premium: PropTypes.bool,
  }),
  token: PropTypes.string.isRequired,
};

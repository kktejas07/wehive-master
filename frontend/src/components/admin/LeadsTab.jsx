import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, Search, Inbox, Download, Mail, ChevronDown, AlertTriangle } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, downloadCsv, canWrite } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import Pagination from './Pagination';
import { useToast } from '../../hooks/use-toast';
import { useDebouncedValue } from '../../hooks/use-debounced-value';

const PAGE_SIZE = 25;
const STATUSES = ['new', 'contacted', 'closed'];
const FILTERS = [...STATUSES, 'all'];
const PILL = {
  new: 'bg-blue-500/15 text-blue-200',
  contacted: 'bg-amber-500/15 text-amber-300',
  closed: 'bg-white/10 text-slate-300',
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const PURPOSE_LABEL = {
  tourist: 'Tourist', business: 'Business', student_f1: 'Student / F-1', work: 'Work',
  family: 'Family visit', immigration: 'Immigration / PR', transit: 'Transit', other: 'Other',
};
const waLink = (phone) => `https://wa.me/${(phone || '').replace(/\D/g, '')}`;
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export default function LeadsTab() {
  const { token, admin } = useAdminAuth();
  const readOnly = !canWrite(admin, 'cases');
  const { toast } = useToast();
  const [status, setStatus] = useState('new');
  const [purpose, setPurpose] = useState('all');
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q.trim());
  const [skip, setSkip] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { setSkip(0); }, [dq, status, purpose]);

  const seq = useRef(0);
  const load = useCallback(async () => {
    const id = ++seq.current;
    setError('');
    try {
      const r = await adminClient(token).get('/leads', { params: { status, purpose, q: dq || undefined, limit: PAGE_SIZE, skip } });
      if (id === seq.current) setData(r.data);
    } catch (e) {
      if (id !== seq.current) return;
      setData({ items: [], total: 0 });
      setError(e?.response?.data?.detail || e.message);
    }
  }, [token, status, purpose, dq, skip]);

  useEffect(() => { setData(null); load(); }, [load]);

  const patch = async (lead, body, label) => {
    setBusy(true);
    try {
      await adminClient(token).patch(`/leads/${lead.id}`, body);
      toast({ title: label });
      if (body.note) setNote('');
      await load();
    } catch (e) {
      toast({ title: 'Update failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadCsv(token, 'leads');
    } catch (e) {
      toast({ title: 'Export failed', description: e.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div data-testid="admin-leads-tab">
      <AdminHeader
        title="Leads"
        subtitle="Enquiries from the contact form. Reply, track who has been contacted and close them out."
        right={
          <button
            data-testid="admin-leads-export"
            onClick={exportCsv}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[13px] font-semibold text-slate-200 disabled:opacity-60"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export CSV
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter leads">
          {FILTERS.map((f) => {
            const on = status === f;
            return (
              <button
                key={f}
                role="tab"
                aria-selected={on}
                data-testid={`admin-leads-filter-${f}`}
                onClick={() => setStatus(f)}
                className={`h-9 px-3.5 rounded-xl text-[13px] font-semibold border transition-colors ${on ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))] text-white' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
              >
                {cap(f)}
                {f === 'new' && data?.new > 0 && (
                  <span data-testid="admin-leads-new-count" className="ml-1.5 rounded-full bg-white/20 px-1.5 text-[11px] tabular-nums">{data.new}</span>
                )}
              </button>
            );
          })}
        </div>
        <select
          data-testid="admin-leads-purpose"
          aria-label="Filter by trip purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className="h-9 px-2 rounded-xl bg-white/5 border border-white/10 text-[13px] text-white"
        >
          <option value="all">All purposes</option>
          {Object.entries(PURPOSE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            data-testid="admin-leads-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone, country or message…"
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 focus:border-[hsl(var(--blue-700))] text-[13.5px] text-white placeholder:text-slate-500 outline-none"
          />
        </div>
      </div>

      <Panel className="p-0 overflow-hidden">
        {data === null && (
          <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-blue-300" /></div>
        )}
        {error && (
          <div className="py-10 text-center text-[13.5px] text-red-300" role="alert">
            <AlertTriangle className="w-4 h-4 inline mr-1.5" /> Could not load leads: {error}{' '}
            <button onClick={load} className="underline text-slate-200 ml-1">Retry</button>
          </div>
        )}
        {data && !error && data.items.length === 0 && (
          <div className="py-10 text-center text-slate-400 text-[13.5px]">
            <Inbox className="w-5 h-5 inline mr-2" /> No {status === 'all' ? '' : status} leads{dq ? ' match your search' : ''}.
          </div>
        )}
        {data?.items.map((l) => {
          const expanded = open === l.id;
          return (
            <div key={l.id} data-testid={`admin-lead-row-${l.id}`} className="border-t first:border-t-0 border-white/5">
              <button
                onClick={() => { setOpen(expanded ? null : l.id); setNote(''); }}
                aria-expanded={expanded}
                className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-white/5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white">{l.name || '—'}</span>
                    <span className="text-[12.5px] text-slate-400 break-all">{l.email}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PILL[l.status] || PILL.closed}`}>{cap(l.status || 'new')}</span>
                    {l.purpose && (
                      <span data-testid={`admin-lead-purpose-${l.id}`} className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-blue-500/15 text-blue-200">
                        {PURPOSE_LABEL[l.purpose] || l.purpose}{l.destination ? ` · ${l.destination}` : ''}
                      </span>
                    )}
                  </div>
                  {!expanded && <div className="mt-0.5 text-[12.5px] text-slate-400 truncate">{l.message}</div>}
                </div>
                <span className="text-[12px] text-slate-400 shrink-0 hidden sm:inline">{fmt(l.created_at)}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>

              {expanded && (
                <div className="px-5 pb-5 space-y-4" data-testid={`admin-lead-detail-${l.id}`}>
                  <p className="whitespace-pre-wrap text-[13.5px] text-slate-200 rounded-xl bg-black/20 border border-white/5 p-4">{l.message}</p>

                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor={`lead-status-${l.id}`} className="text-[12px] font-semibold text-slate-400">Status</label>
                    <select
                      id={`lead-status-${l.id}`}
                      data-testid={`admin-lead-status-${l.id}`}
                      value={l.status || 'new'}
                      disabled={busy || readOnly}
                      onChange={(e) => patch(l, { status: e.target.value }, `Marked as ${e.target.value}`)}
                      className="h-9 px-2 rounded-lg bg-white/5 border border-white/10 text-[13px] text-white"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
                    </select>
                    <a
                      href={`mailto:${l.email}?subject=${encodeURIComponent('Re: your enquiry to We Hive')}`}
                      data-testid={`admin-lead-reply-${l.id}`}
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white text-[13px] font-semibold"
                    >
                      <Mail className="w-3.5 h-3.5" /> Reply by email
                    </a>
                    {l.phone && (
                      <>
                        <a href={`tel:${l.phone}`} className="inline-flex items-center h-9 px-3.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[13px] font-semibold">
                          Call {l.phone}
                        </a>
                        <a href={waLink(l.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center h-9 px-3.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-[13px] font-semibold">
                          WhatsApp
                        </a>
                      </>
                    )}
                  </div>

                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-2">Notes</div>
                    {(l.notes || []).length === 0 && <p className="text-[12.5px] text-slate-500">No notes yet.</p>}
                    <ul className="space-y-2">
                      {(l.notes || []).map((n, i) => (
                        <li key={`${n.at}-${i}`} className="text-[13px] text-slate-200 rounded-lg bg-white/5 px-3 py-2">
                          <div className="whitespace-pre-wrap">{n.text}</div>
                          <div className="mt-0.5 text-[11.5px] text-slate-400">{n.by || 'admin'} · {fmt(n.at)}</div>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex gap-2 items-start">
                      <textarea
                        data-testid={`admin-lead-note-${l.id}`}
                        aria-label="Add a note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="Add a note (visible to admins only)…"
                        className="flex-1 px-3 py-2 rounded-xl bg-black/30 border border-white/10 focus:border-[hsl(var(--blue-700))] text-[13px] text-white placeholder:text-slate-500 outline-none"
                      />
                      <button
                        data-testid={`admin-lead-add-note-${l.id}`}
                        disabled={busy || !note.trim()}
                        onClick={() => patch(l, { note: note.trim() }, 'Note added')}
                        className="h-9 px-3.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[13px] font-semibold disabled:opacity-50"
                      >
                        Add note
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {data?.total > 0 && (
          <div className="px-5 pb-3"><Pagination skip={skip} limit={PAGE_SIZE} total={data.total} onPageChange={setSkip} /></div>
        )}
      </Panel>
    </div>
  );
}

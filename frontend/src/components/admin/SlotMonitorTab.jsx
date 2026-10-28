import { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, Check, X, Activity, Radar, Send, Inbox, MapPin } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { apiClient, canWrite } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

// NOTE: the slot-monitor routes live under /usvisa (not /admin), so they are called
// through apiClient(token) (base = API) with the admin token, like AdminsTab does.

const errText = (e) => {
  const d = e?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d.length) return d[0]?.msg || e.message;
  return e.message;
};

const COUNTRIES = [
  ['usa', 'USA'], ['uk', 'UK'], ['schengen', 'Schengen'], ['canada', 'Canada'], ['australia', 'Australia'],
  ['uae', 'UAE'], ['singapore', 'Singapore'], ['thailand', 'Thailand'], ['japan', 'Japan'], ['south-korea', 'South Korea'],
];

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-IN');
};

function Stat({ label, value, testid }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/[0.08] px-4 py-3" data-testid={testid}>
      <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400">{label}</div>
      <div className="mt-1 text-[20px] font-bold text-slate-100">{value ?? '—'}</div>
    </div>
  );
}

function Pill({ ok, children }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
      {children}
    </span>
  );
}

function SectionTitle({ icon: Icon, children, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 inline-flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" /> {children}
      </div>
      {right}
    </div>
  );
}

const selectCls = 'h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[13px] text-white';

export default function SlotMonitorTab() {
  const { token, admin: me } = useAdminAuth();
  const { toast } = useToast();
  const writable = canWrite(me, 'cases');

  const [status, setStatus] = useState(null);
  const [statusErr, setStatusErr] = useState(null);
  const [groups, setGroups] = useState(null);
  const [corridors, setCorridors] = useState(null);

  const [pending, setPending] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [acting, setActing] = useState(null);

  const [country, setCountry] = useState('usa');
  const [hours, setHours] = useState(24);
  const [summary, setSummary] = useState(null);
  const [summaryErr, setSummaryErr] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [slots, setSlots] = useState(null);
  const [slotsErr, setSlotsErr] = useState(null);
  const [slotConsulate, setSlotConsulate] = useState('');
  const [slotVisa, setSlotVisa] = useState('');
  const [consulates, setConsulates] = useState({ consulates: [], visa_types: [] });

  const loadStatus = useCallback(async () => {
    setStatusErr(null);
    try {
      const r = await apiClient(token).get('/usvisa/status');
      setStatus(r.data);
    } catch (e) {
      setStatus(null);
      setStatusErr(errText(e));
    }
  }, [token]);

  const loadStatic = useCallback(async () => {
    const c = apiClient(token);
    const [g, co, cs] = await Promise.allSettled([
      c.get('/usvisa/telegram-groups'), c.get('/usvisa/corridors'), c.get('/usvisa/consulates'),
    ]);
    setGroups(g.status === 'fulfilled' ? g.value.data : { groups: [], whatsapp_number: null });
    setCorridors(co.status === 'fulfilled' ? co.value.data.corridors || [] : []);
    if (cs.status === 'fulfilled') setConsulates(cs.value.data);
  }, [token]);

  const loadPending = useCallback(async (p = 1) => {
    try {
      const r = await apiClient(token).get('/usvisa/reports/pending', { params: { page: p, limit: 20 } });
      setPending(r.data.items);
      setTotal(r.data.total);
      setPages(r.data.pages || 1);
      setPage(r.data.page || p);
    } catch (e) {
      setPending([]);
      toast({ title: 'Could not load slot reports', description: errText(e) });
    }
  }, [token, toast]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryErr(null);
    try {
      const r = await apiClient(token).get('/usvisa/slots/summary', { params: { country, hours } });
      setSummary(r.data);
    } catch (e) {
      setSummary(null);
      setSummaryErr(errText(e));
    } finally {
      setSummaryLoading(false);
    }
  }, [token, country, hours]);

  const loadSlots = useCallback(async () => {
    setSlotsErr(null);
    setSlots(null);
    try {
      const params = { hours, limit: 100 };
      if (slotConsulate) params.consulate = slotConsulate;
      if (slotVisa) params.visa_type = slotVisa;
      const r = await apiClient(token).get('/usvisa/slots', { params });
      setSlots(r.data.slots);
    } catch (e) {
      setSlots([]);
      setSlotsErr(errText(e));
    }
  }, [token, hours, slotConsulate, slotVisa]);

  useEffect(() => { loadStatus(); loadStatic(); loadPending(1); }, [loadStatus, loadStatic, loadPending]);
  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadSlots(); }, [loadSlots]);

  const moderate = async (item, action) => {
    if (action === 'reject' && !window.confirm('Reject this slot report? It will not be shown to users.')) return;
    setActing(`${item.id}:${action}`);
    try {
      const { data } = await apiClient(token).post(`/usvisa/reports/${item.id}/${action}`);
      toast({
        title: action === 'approve' ? 'Report approved' : 'Report rejected',
        description: action === 'approve' ? `${data.alerted ?? 0} subscriber alert(s) sent.` : item.title,
      });
      await Promise.all([loadPending(page), loadStatus()]);
    } catch (e) {
      toast({ title: `Could not ${action} report`, description: errText(e) });
      await loadPending(page);
    } finally {
      setActing(null);
    }
  };

  const refreshAll = () => { loadStatus(); loadPending(page); loadSummary(); loadSlots(); };

  const stats = status?.stats || {};
  const consulateRows = summary ? Object.entries(summary.consulates || {}) : [];

  return (
    <div data-testid="admin-slot-monitor-tab">
      <AdminHeader
        title="Slot monitor"
        subtitle="Visa appointment monitoring: checker health, user-reported slots awaiting review, and what subscribers currently see."
      />

      <div className="flex justify-end -mt-2 mb-3">
        <button
          data-testid="admin-slot-refresh"
          onClick={refreshAll}
          className="h-9 px-3 inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-[12.5px] font-bold text-white"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Monitor status */}
      <Panel className="mb-4">
        <SectionTitle icon={Activity}>Monitor status</SectionTitle>
        {statusErr ? (
          <div className="text-[13px] text-red-300" data-testid="admin-slot-status-error">Could not load status: {statusErr}</div>
        ) : !status ? (
          <div className="py-4 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline text-blue-300" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Stat label="Mode" value={status.mode} testid="admin-slot-mode" />
              <Stat label="Interval" value={status.check_interval_seconds ? `${status.check_interval_seconds}s` : '—'} />
              <Stat label="Total checks" value={stats.total_checks} />
              <Stat label="Slots found" value={stats.slots_found} />
              <Stat label="Alerts sent" value={stats.notifications_sent} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-slate-300">
              <span>Last check: <span className="text-slate-100">{fmtDate(status.last_check)}</span></span>
              <span className="text-slate-500">·</span>
              <span>Slots (24h): <span className="text-slate-100">{status.total_slots_24h}</span></span>
              <span className="text-slate-500">·</span>
              <span>Last slot: <span className="text-slate-100">{fmtDate(status.last_slot_detected_at)}</span></span>
              <Pill ok={status.alerts?.telegram_configured}>Telegram bot {status.alerts?.telegram_configured ? 'configured' : 'missing'}</Pill>
              <Pill ok={status.alerts?.channel_id_set}>Channel {status.alerts?.channel_id_set ? 'set' : 'not set'}</Pill>
            </div>
          </>
        )}
      </Panel>

      {/* Pending reports */}
      <Panel className="mb-4 overflow-x-auto p-0">
        <div className="px-5 pt-4">
          <SectionTitle icon={Inbox} right={<span className="text-[12px] text-slate-400">{total} pending</span>}>
            User slot reports awaiting review
          </SectionTitle>
        </div>
        <table className="min-w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-slate-400 bg-white/5">
              <th className="px-5 py-3">Report</th>
              <th className="px-5 py-3">Source</th>
              <th className="px-5 py-3">Reported</th>
              <th className="px-5 py-3">Note</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending === null && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline text-blue-300" /></td></tr>
            )}
            {pending?.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400"><Inbox className="w-5 h-5 inline mr-2" /> No reports waiting for review.</td></tr>
            )}
            {pending?.map((r) => (
              <tr key={r.id} data-testid={`admin-slot-report-${r.id}`} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-5 py-3 font-bold text-white">{r.title}</td>
                <td className="px-5 py-3 text-slate-300 text-[12.5px]">{r.source_name}</td>
                <td className="px-5 py-3 text-slate-400 text-[12.5px] whitespace-nowrap">{r.date || '—'}</td>
                <td className="px-5 py-3 text-slate-300 text-[12.5px] max-w-[260px] truncate" title={r.content}>{r.content || '—'}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      data-testid={`admin-slot-approve-${r.id}`}
                      disabled={!writable || !!acting}
                      onClick={() => moderate(r, 'approve')}
                      title={writable ? 'Approve and alert subscribers' : 'Your role cannot moderate reports'}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 px-2.5 py-1.5 text-[11.5px] font-bold text-emerald-300 disabled:opacity-50"
                    >
                      {acting === `${r.id}:approve` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Approve
                    </button>
                    <button
                      data-testid={`admin-slot-reject-${r.id}`}
                      disabled={!writable || !!acting}
                      onClick={() => moderate(r, 'reject')}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 text-[11.5px] font-bold text-red-300 disabled:opacity-50"
                    >
                      {acting === `${r.id}:reject` ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />} Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/5 text-[12px] text-slate-400">
            <button disabled={page <= 1} onClick={() => loadPending(page - 1)} className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white disabled:opacity-50">Prev</button>
            <span>Page {page} of {pages}</span>
            <button disabled={page >= pages} onClick={() => loadPending(page + 1)} className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white disabled:opacity-50">Next</button>
          </div>
        )}
      </Panel>

      {/* Wait-time summary */}
      <Panel className="mb-4 overflow-x-auto">
        <SectionTitle icon={Radar}>Wait-time summary</SectionTitle>
        <div className="flex flex-wrap gap-3 mb-3">
          <select data-testid="admin-slot-country" value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country" className={selectCls}>
            {COUNTRIES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select data-testid="admin-slot-hours" value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label="Window" className={selectCls}>
            {[[24, 'Last 24 hours'], [72, 'Last 3 days'], [168, 'Last 7 days'], [720, 'Last 30 days']].map(([h, l]) => <option key={h} value={h}>{l}</option>)}
          </select>
        </div>
        {summaryLoading ? (
          <div className="py-6 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline text-blue-300" /></div>
        ) : summaryErr ? (
          <div className="text-[13px] text-red-300" data-testid="admin-slot-summary-error">Could not load summary: {summaryErr}</div>
        ) : summary && (
          <>
            <div className="text-[12px] text-slate-400 mb-3">
              Source: <span className="text-slate-200">{summary.source_name || (summary.source === 'official_wait_times' ? 'Official wait times' : 'Wait-time estimates')}</span>
              {summary.metric && <> · {summary.metric}</>}
              {summary.updated && <> · updated {String(summary.updated)}</>}
              {' · '}{summary.overall?.consulates_with_slots ?? 0} centre(s) with data, {summary.overall?.total_slots ?? 0} visa lines available
            </div>
            <table className="min-w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-slate-400 bg-white/5">
                  <th className="px-4 py-2.5">Centre</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Visa wait times</th>
                </tr>
              </thead>
              <tbody>
                {consulateRows.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">No centres for this country.</td></tr>
                )}
                {consulateRows.map(([cid, c]) => (
                  <tr key={cid} className="border-t border-white/5 hover:bg-white/5 align-top">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{c.name}</div>
                      <div className="text-[12px] text-slate-400 inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{c.city}</div>
                    </td>
                    <td className="px-4 py-3"><Pill ok={!c.is_estimate}>{c.is_estimate ? 'Estimate' : 'Official'}</Pill></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(c.visa_types || {}).map(([vid, v]) => (
                          <span key={vid} className={`rounded-lg px-2 py-1 text-[11.5px] border ${v.available ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-400'}`}>
                            <span className="font-semibold">{v.name}</span>: {v.wait_time}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Panel>

      {/* Detected slots */}
      <Panel className="mb-4 overflow-x-auto p-0">
        <div className="px-5 pt-4">
          <SectionTitle icon={Radar}>Detected slots (approved and monitor-found)</SectionTitle>
          <div className="flex flex-wrap gap-3 mb-3">
            <select value={slotConsulate} onChange={(e) => setSlotConsulate(e.target.value)} aria-label="Centre" className={selectCls}>
              <option value="">All centres</option>
              {consulates.consulates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={slotVisa} onChange={(e) => setSlotVisa(e.target.value)} aria-label="Visa type" className={selectCls}>
              <option value="">All visa types</option>
              {consulates.visa_types.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        </div>
        <table className="min-w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-slate-400 bg-white/5">
              <th className="px-5 py-3">Centre</th>
              <th className="px-5 py-3">Visa</th>
              <th className="px-5 py-3">Slot date</th>
              <th className="px-5 py-3">Source</th>
              <th className="px-5 py-3">Detected</th>
            </tr>
          </thead>
          <tbody>
            {slots === null && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline text-blue-300" /></td></tr>
            )}
            {slotsErr && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-red-300" data-testid="admin-slot-slots-error">Could not load slots: {slotsErr}</td></tr>
            )}
            {!slotsErr && slots?.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No slots detected in this window.</td></tr>
            )}
            {slots?.map((s) => (
              <tr key={s.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-5 py-3"><div className="font-bold text-white">{s.consulate_name || s.consulate}</div><div className="text-[12px] text-slate-400">{s.city}</div></td>
                <td className="px-5 py-3 text-slate-200">{s.visa_name || s.visa_type}</td>
                <td className="px-5 py-3 text-slate-200">{s.date}{s.time ? ` ${s.time}` : ''}{s.day_of_week ? ` (${s.day_of_week})` : ''}</td>
                <td className="px-5 py-3 text-slate-300 text-[12.5px]">{s.source || '—'}</td>
                <td className="px-5 py-3 text-slate-400 text-[12.5px]">{fmtDate(s.detected_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {/* Reference: corridors + telegram groups */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel>
          <SectionTitle icon={MapPin}>Monitored corridors</SectionTitle>
          {corridors === null ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-300" />
          ) : corridors.length === 0 ? (
            <div className="text-[13px] text-slate-400">No corridors configured.</div>
          ) : (
            <ul className="space-y-1.5 text-[13px] text-slate-300">
              {corridors.map((c, i) => (
                <li key={c.id || i}>
                  <span className="font-semibold text-slate-100">{c.name || c.id}</span>
                  {c.consulates && <span className="text-slate-400"> — {c.consulates.length} centre(s)</span>}
                  {c.visa_types && <span className="text-slate-400">, {c.visa_types.length} visa type(s)</span>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <SectionTitle icon={Send}>Telegram and WhatsApp</SectionTitle>
          {groups === null ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-300" />
          ) : (
            <ul className="space-y-1.5 text-[13px] text-slate-300">
              {groups.groups?.map((g) => (
                <li key={g.visa_type}>
                  <span className="font-semibold text-slate-100">{g.visa_name}</span>{' '}
                  <a href={g.telegram_link} target="_blank" rel="noreferrer" className="text-blue-300 hover:underline break-all">{g.telegram_link}</a>
                </li>
              ))}
              {groups.whatsapp_number && <li><span className="font-semibold text-slate-100">WhatsApp</span> {groups.whatsapp_number}</li>}
            </ul>
          )}
        </Panel>
      </div>
      <p className="mt-3 text-[11.5px] text-slate-400">
        Slot lists and the wait-time summary use user-session endpoints; if your admin session is not accepted there, those sections show an error while the rest keeps working.
      </p>
    </div>
  );
}

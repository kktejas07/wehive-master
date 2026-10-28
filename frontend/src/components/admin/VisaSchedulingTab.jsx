import { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, Loader2, AlertCircle, CheckCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { adminClient } from '../../lib/admin';
import { Panel } from './AdminShell';

const COUNTRIES = [
  { code: 'us', label: 'United States', name: 'United States' },
  { code: 'gb', label: 'United Kingdom', name: 'United Kingdom' },
  { code: 'ca', label: 'Canada', name: 'Canada' },
  { code: 'au', label: 'Australia', name: 'Australia' },
  { code: 'de', label: 'Germany', name: 'Germany' },
  { code: 'fr', label: 'France', name: 'France' },
  { code: 'ae', label: 'UAE', name: 'United Arab Emirates' },
  { code: 'sg', label: 'Singapore', name: 'Singapore' },
];

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ALL_TIMES = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];
const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DEFAULT_TIMES = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM'];

const fieldCls = 'h-10 w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] px-3 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--admin-blue)]';
const labelCls = 'block text-[12px] font-medium text-[var(--text-secondary)] mb-1';

// ── Slots section ────────────────────────────────────────────────────────────
function SlotsSection() {
  const [country, setCountry] = useState('us');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async (c) => {
    setLoading(true); setErr('');
    try {
      const data = await adminClient(`/visa-scheduling/slots/${c}`);
      setSlots(Array.isArray(data) ? data : []);
    } catch (ex) {
      setErr(ex?.response?.data?.detail || 'Failed to load slots');
      setSlots([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(country); }, [country, load]);

  const available = slots.filter(s => !s.booked).length;
  const booked = slots.filter(s => s.booked).length;

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div>
          <label className={labelCls}>Country</label>
          <select value={country} onChange={e => setCountry(e.target.value)} className={`${fieldCls} w-48`}>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        {!loading && slots.length > 0 && (
          <div className="flex gap-3 mt-4">
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[12px] font-medium">{available} available</span>
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[12px] font-medium">{booked} booked</span>
          </div>
        )}
      </div>

      {err && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-[var(--admin-red)] mb-3"><AlertCircle className="w-4 h-4 shrink-0" />{err}</div>}
      {loading && <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[var(--admin-blue)]" /></div>}

      {!loading && slots.length === 0 && !err && (
        <p className="text-[13px] text-[var(--text-muted)] text-center py-10">No slots found for {COUNTRIES.find(c => c.code === country)?.label}. Use the Generate tab to create slots.</p>
      )}

      {!loading && slots.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--glass-border)]">
                {['Date', 'Time', 'Day', 'Embassy', 'Status', 'Application'].map(h => (
                  <th key={h} className="pb-2 text-left font-medium text-[var(--text-muted)] pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((s, i) => (
                <tr key={s._id || i} className="border-b border-[var(--glass-border)] last:border-0 hover:bg-[var(--glass-hover)]">
                  <td className="py-2 pr-4 text-[var(--text-primary)] font-medium whitespace-nowrap">{s.date}</td>
                  <td className="py-2 pr-4 text-[var(--text-secondary)] whitespace-nowrap">{s.time}</td>
                  <td className="py-2 pr-4 text-[var(--text-secondary)]">{s.day}</td>
                  <td className="py-2 pr-4 text-[var(--text-secondary)]">{s.embassy || '—'}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${s.booked ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {s.booked ? 'Booked' : 'Available'}
                    </span>
                  </td>
                  <td className="py-2 text-[var(--text-muted)] font-mono text-[12px]">
                    {s.application_id ? s.application_id.slice(0, 8) + '…' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// ── Generate section ─────────────────────────────────────────────────────────
function GenerateSection() {
  const [country, setCountry] = useState('us');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [embassy, setEmbassy] = useState('New Delhi');
  const [days, setDays] = useState(new Set(DEFAULT_DAYS));
  const [times, setTimes] = useState(new Set(DEFAULT_TIMES));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [err, setErr] = useState('');

  const toggle = (set, setFn, val) =>
    setFn(prev => { const s = new Set(prev); s.has(val) ? s.delete(val) : s.add(val); return s; });

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || days.size === 0 || times.size === 0) return;
    setLoading(true); setSuccess(''); setErr('');
    try {
      const data = await adminClient('/visa-scheduling/slots/generate', {
        method: 'POST',
        body: JSON.stringify({
          country_id: country,
          start_date: startDate,
          end_date: endDate,
          embassy,
          days: [...days],
          times: [...times],
        }),
      });
      setSuccess(`${data.count ?? data.message} slots generated for ${COUNTRIES.find(c => c.code === country)?.label}`);
    } catch (ex) {
      setErr(ex?.response?.data?.detail || 'Failed to generate slots');
    } finally { setLoading(false); }
  };

  return (
    <Panel>
      <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">Generate appointment slots</h3>
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[13px] text-emerald-700 mb-4">
          <CheckCircle className="w-4 h-4 shrink-0" />{success}
        </div>
      )}
      {err && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-[var(--admin-red)] mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />{err}
        </div>
      )}
      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Country</label>
            <select value={country} onChange={e => setCountry(e.target.value)} className={fieldCls}>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Embassy / Consulate</label>
            <input value={embassy} onChange={e => setEmbassy(e.target.value)} placeholder="e.g. New Delhi" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Start date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={fieldCls} required />
          </div>
          <div>
            <label className={labelCls}>End date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={fieldCls} required />
          </div>
        </div>

        <div>
          <label className={labelCls}>Days of week</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {ALL_DAYS.map(d => (
              <button type="button" key={d} onClick={() => toggle(days, setDays, d)}
                className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${days.has(d) ? 'bg-[var(--admin-blue)] text-white' : 'bg-[var(--glass-hover)] border border-[var(--glass-border)] text-[var(--text-secondary)]'}`}>
                {d.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Time slots</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {ALL_TIMES.map(t => (
              <button type="button" key={t} onClick={() => toggle(times, setTimes, t)}
                className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${times.has(t) ? 'bg-[var(--admin-blue)] text-white' : 'bg-[var(--glass-hover)] border border-[var(--glass-border)] text-[var(--text-secondary)]'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading || !startDate || !endDate || days.size === 0 || times.size === 0}
          className="flex items-center gap-2 h-10 px-5 rounded-lg bg-[var(--admin-blue)] text-white text-[13px] font-medium disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
          Generate Slots
        </button>
      </form>
    </Panel>
  );
}

// ── Embassy Fees section ─────────────────────────────────────────────────────
function EmbassyFeesSection() {
  const [fees, setFees] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    adminClient('/embassy-fees')
      .then(data => setFees(Array.isArray(data) ? data : []))
      .catch(ex => setErr(ex?.response?.data?.detail || 'Failed to load embassy fees'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter ? fees.filter(f => f.country.toLowerCase().includes(filter.toLowerCase())) : fees;
  const toggleRow = (id) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  if (loading) return <Panel><div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[var(--admin-blue)]" /></div></Panel>;

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div>
          <label className={labelCls}>Filter by country</label>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="e.g. United States" className={`${fieldCls} w-56`} />
        </div>
      </div>
      {err && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-[var(--admin-red)] mb-3"><AlertCircle className="w-4 h-4 shrink-0" />{err}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--glass-border)]">
              {['Country', 'Visa Type', 'Currency', 'Total Fee', 'Book', ''].map(h => (
                <th key={h} className="pb-2 text-left font-medium text-[var(--text-muted)] pr-4 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <>
                <tr key={f.id} className="border-b border-[var(--glass-border)] hover:bg-[var(--glass-hover)] cursor-pointer" onClick={() => toggleRow(f.id)}>
                  <td className="py-2 pr-4 text-[var(--text-primary)] font-medium">{f.country}</td>
                  <td className="py-2 pr-4 text-[var(--text-secondary)]">{f.visa_type}</td>
                  <td className="py-2 pr-4 text-[var(--text-secondary)]">{f.currency}</td>
                  <td className="py-2 pr-4 font-semibold text-[var(--text-primary)]">{f.currency} {f.total?.toLocaleString()}</td>
                  <td className="py-2 pr-4">
                    {f.booking_url && (
                      <a href={f.booking_url} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-[var(--admin-blue)] hover:underline text-[12px]">
                        Book <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                  <td className="py-2 text-[var(--text-muted)]">
                    {expanded.has(f.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </td>
                </tr>
                {expanded.has(f.id) && (
                  <tr key={`${f.id}-exp`} className="bg-[var(--glass-hover)]">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="space-y-1.5">
                        {f.fees?.map((fee, i) => (
                          <div key={i} className="flex items-center gap-3 text-[12px]">
                            <span className={`w-16 text-center text-[11px] font-medium rounded px-1.5 py-0.5 ${fee.required ? 'bg-red-100 text-red-700' : 'bg-[var(--glass-border)] text-[var(--text-muted)]'}`}>
                              {fee.required ? 'Required' : 'Optional'}
                            </span>
                            <span className="text-[var(--text-primary)] font-medium">{fee.name}</span>
                            <span className="font-semibold text-[var(--text-primary)]">{f.currency} {fee.amount}</span>
                            {fee.note && <span className="text-[var(--text-muted)]">— {fee.note}</span>}
                          </div>
                        ))}
                        {f.notes && <p className="text-[12px] text-[var(--text-muted)] mt-2 italic">{f.notes}</p>}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ── Main tab ─────────────────────────────────────────────────────────────────
const SECTIONS = ['Slots', 'Generate', 'Embassy Fees'];

export default function VisaSchedulingTab() {
  const [section, setSection] = useState('Slots');

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <CalendarCheck className="w-6 h-6 text-[var(--admin-blue)]" />
        <div>
          <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Visa Scheduling</h2>
          <p className="text-[13px] text-[var(--text-muted)]">Appointment slots, bulk generation, and embassy fee reference</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-[var(--glass-hover)] border border-[var(--glass-border)] w-fit">
        {SECTIONS.map(s => (
          <button key={s} onClick={() => setSection(s)}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${section === s ? 'bg-white shadow-sm text-[var(--admin-blue)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            {s}
          </button>
        ))}
      </div>

      {section === 'Slots' && <SlotsSection />}
      {section === 'Generate' && <GenerateSection />}
      {section === 'Embassy Fees' && <EmbassyFeesSection />}
    </div>
  );
}

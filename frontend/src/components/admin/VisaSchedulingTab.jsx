import { useState, useCallback } from 'react';
import { Loader2, CalendarPlus, CalendarDays, Search, Building2, Clock } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { apiClient, canWrite } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

const errText = (e) => {
  const d = e?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d.length) return d[0].msg;
  return e.message;
};

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_TIMES = '9:00 AM, 10:00 AM, 11:00 AM, 1:00 PM, 2:00 PM, 3:00 PM';
const INPUT = 'h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-[13.5px] text-white placeholder:text-slate-500';
const LABEL = 'block text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1.5';

export default function VisaSchedulingTab() {
  const { token, admin } = useAdminAuth();
  const { toast } = useToast();
  const writable = canWrite(admin, 'cases');

  const [countryId, setCountryId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [slots, setSlots] = useState(null);
  const [loadedFor, setLoadedFor] = useState('');
  const [loading, setLoading] = useState(false);
  const [embassies, setEmbassies] = useState([]);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [times, setTimes] = useState(DEFAULT_TIMES);
  const [embassy, setEmbassy] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async (id) => {
    const cid = (id || '').trim().toLowerCase();
    if (!cid) return;
    setLoading(true);
    try {
      const c = apiClient(token);
      const [s, e] = await Promise.all([
        c.get(`/visa-scheduling/slots/${encodeURIComponent(cid)}`, { params: fromDate ? { date: fromDate } : {} }),
        c.get(`/visa-scheduling/embassies/${encodeURIComponent(cid)}`).catch(() => ({ data: [] })),
      ]);
      setSlots(s.data || []);
      setEmbassies(e.data || []);
      setLoadedFor(cid);
    } catch (err) {
      setSlots([]);
      toast({ title: 'Could not load slots', description: errText(err) });
    } finally {
      setLoading(false);
    }
  }, [token, toast, fromDate]);

  const toggleDay = (d) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const generate = async (e) => {
    e.preventDefault();
    const timeList = times.split(',').map((t) => t.trim()).filter(Boolean);
    if (!countryId.trim() || !startDate || !endDate) return;
    if (endDate < startDate) { toast({ title: 'End date must be on or after the start date' }); return; }
    if (!days.length || !timeList.length) { toast({ title: 'Pick at least one day and one time' }); return; }
    setGenerating(true);
    try {
      const { data } = await apiClient(token).post('/visa-scheduling/slots/generate', {
        country_id: countryId.trim().toLowerCase(),
        start_date: startDate,
        end_date: endDate,
        days,
        times: timeList,
        embassy: embassy.trim(),
      });
      toast({ title: 'Slots generated', description: data.message });
      await load(countryId);
    } catch (err) {
      toast({ title: 'Could not generate slots', description: errText(err) });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div data-testid="admin-visa-scheduling-tab">
      <AdminHeader
        title="Visa scheduling"
        subtitle="Create embassy appointment slots by country and see what is still open for students to book."
      />

      <Panel className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-3">Open slots</div>
        <form
          className="grid sm:grid-cols-[1fr_auto_auto] gap-3"
          onSubmit={(e) => { e.preventDefault(); load(countryId); }}
        >
          <input
            data-testid="admin-visa-country"
            value={countryId}
            onChange={(e) => setCountryId(e.target.value)}
            placeholder="Country id (e.g. usa, uk, canada)"
            aria-label="Country id"
            className={INPUT}
          />
          <input
            data-testid="admin-visa-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            aria-label="Show slots from date"
            className={INPUT}
          />
          <button
            data-testid="admin-visa-load-btn"
            type="submit"
            disabled={loading || !countryId.trim()}
            className="h-10 px-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[13.5px] font-bold disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-3.5 h-3.5" /> Load slots</>}
          </button>
        </form>
        <p className="mt-3 text-[11.5px] text-slate-400">Shows up to 50 unbooked slots, earliest first. Booked slots are not listed.</p>
      </Panel>

      {writable && (
        <Panel className="mb-4">
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-3">Generate slots</div>
          <form className="grid gap-4" onSubmit={generate}>
            <div className="grid sm:grid-cols-4 gap-3">
              <div>
                <label className={LABEL} htmlFor="visa-gen-start">Start date</label>
                <input id="visa-gen-start" data-testid="admin-visa-start" type="date" required value={startDate}
                  onChange={(e) => setStartDate(e.target.value)} className={`${INPUT} w-full`} />
              </div>
              <div>
                <label className={LABEL} htmlFor="visa-gen-end">End date</label>
                <input id="visa-gen-end" data-testid="admin-visa-end" type="date" required value={endDate}
                  onChange={(e) => setEndDate(e.target.value)} className={`${INPUT} w-full`} />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="visa-gen-embassy">Embassy / location</label>
                <input id="visa-gen-embassy" data-testid="admin-visa-embassy" value={embassy} list="visa-embassies"
                  onChange={(e) => setEmbassy(e.target.value)} placeholder="e.g. New Delhi" className={`${INPUT} w-full`} />
                <datalist id="visa-embassies">
                  {embassies.map((m) => <option key={m.id} value={m.name} />)}
                </datalist>
              </div>
            </div>
            <div>
              <div className={LABEL}>Days</div>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={days.includes(d)}
                    onClick={() => toggleDay(d)}
                    className={`rounded-lg px-2.5 py-1.5 text-[12px] font-bold border ${days.includes(d)
                      ? 'bg-blue-500/20 border-blue-400/40 text-blue-100'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={LABEL} htmlFor="visa-gen-times">Times (comma separated)</label>
              <input id="visa-gen-times" data-testid="admin-visa-times" value={times}
                onChange={(e) => setTimes(e.target.value)} className={`${INPUT} w-full`} />
            </div>
            <div>
              <button
                data-testid="admin-visa-generate-btn"
                type="submit"
                disabled={generating || !countryId.trim() || !startDate || !endDate}
                className="h-10 px-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white text-[13.5px] font-bold disabled:opacity-60"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CalendarPlus className="w-3.5 h-3.5" /> Generate slots</>}
              </button>
              <span className="ml-3 text-[11.5px] text-slate-400">
                Uses the country id above. Running it twice for the same dates creates duplicate slots.
              </span>
            </div>
          </form>
        </Panel>
      )}

      {embassies.length > 0 && (
        <Panel className="mb-4">
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-3">Embassies and consulates</div>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[12.5px] text-slate-300">
            {embassies.map((m) => (
              <li key={m.id} className="flex items-start gap-2">
                <Building2 className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                <span><span className="font-semibold text-white">{m.name}</span> <span className="text-slate-400">{m.address}</span></span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel className="overflow-x-auto p-0">
        <table className="min-w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-slate-400 bg-white/5">
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Day</th>
              <th className="px-5 py-3">Time</th>
              <th className="px-5 py-3">Embassy</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline text-blue-300" /></td></tr>
            )}
            {!loading && slots === null && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                <CalendarDays className="w-5 h-5 inline mr-2" /> Enter a country id and load its slots.
              </td></tr>
            )}
            {!loading && slots?.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                <CalendarDays className="w-5 h-5 inline mr-2" /> No open slots for “{loadedFor || countryId}”.
              </td></tr>
            )}
            {!loading && slots?.map((s) => (
              <tr key={s._id || s.id} data-testid={`admin-visa-slot-${s._id || s.id}`} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-5 py-3 font-bold text-white">{s.date}</td>
                <td className="px-5 py-3 text-slate-300">{s.day || '—'}</td>
                <td className="px-5 py-3 text-slate-300"><Clock className="w-3 h-3 inline mr-1.5 text-slate-400" />{s.time}</td>
                <td className="px-5 py-3 text-slate-300">{s.embassy || '—'}</td>
                <td className="px-5 py-3">
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-300">Open</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {slots?.length > 0 && (
        <p className="mt-3 text-[11.5px] text-slate-400">{slots.length} open slot{slots.length === 1 ? '' : 's'} shown for {loadedFor}.</p>
      )}
    </div>
  );
}

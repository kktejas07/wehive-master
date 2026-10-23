import { useEffect, useState } from 'react';
import axios from 'axios';
import { Megaphone, CheckCircle2, Loader2 } from 'lucide-react';
import { API } from '../context/AuthContext';

// "I just saw an open appointment": crowd reports, like CheckVisaSlots. Each is
// reviewed by the WeHive team before subscribers are alerted.
const input = 'w-full h-11 px-3 rounded-xl border border-[hsl(var(--border))] bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--blue-700))]';
const today = () => new Date().toISOString().slice(0, 10);

export default function ReportSlotForm({ country, countryName, consulates, visas, token }) {
  const blank = { consulate: consulates[0]?.id || '', visa_type: visas[0]?.id || '', date: '', note: '' };
  const [form, setForm] = useState(blank);
  const [state, setState] = useState({ busy: false, error: '', done: false });

  useEffect(() => {
    setForm({ consulate: consulates[0]?.id || '', visa_type: visas[0]?.id || '', date: '', note: '' });
    setState({ busy: false, error: '', done: false });
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: '', done: false });
    try {
      await axios.post(`${API}/usvisa/reports`, { country, ...form }, { headers: { Authorization: `Bearer ${token}` } });
      setState({ busy: false, error: '', done: true });
      setForm(blank);
    } catch (err) {
      const d = err.response?.data?.detail;
      setState({
        busy: false, done: false,
        error: err.response?.status === 429 ? 'You have reported several slots recently. Please try again later.'
          : Array.isArray(d) ? 'Please check the date and try again.' : d || 'Could not send your report. Please try again.',
      });
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white border border-[hsl(var(--border))] p-5 sm:p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <Megaphone className="w-5 h-5 text-[hsl(var(--blue-700))] mt-0.5" aria-hidden="true" />
        <div>
          <h3 className="font-bold text-[15px] text-[hsl(var(--blue-900))]">Saw an open {countryName} slot? Report it</h3>
          <p className="text-[12px] text-muted-foreground">Our team checks each report, then everyone watching that centre and visa type gets an alert.</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-[13px] font-semibold text-[hsl(var(--blue-900))]">Visa centre
          <select className={`${input} mt-1`} value={form.consulate} onChange={set('consulate')} required>
            {consulates.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label className="text-[13px] font-semibold text-[hsl(var(--blue-900))]">Visa type
          <select className={`${input} mt-1`} value={form.visa_type} onChange={set('visa_type')} required>
            {visas.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
        <label className="text-[13px] font-semibold text-[hsl(var(--blue-900))]">Appointment date
          <input type="date" className={`${input} mt-1`} value={form.date} onChange={set('date')} min={today()} required />
        </label>
      </div>
      <label className="block mt-3 text-[13px] font-semibold text-[hsl(var(--blue-900))]">Note (optional)
        <input className={`${input} mt-1`} value={form.note} onChange={set('note')} maxLength={200}
          placeholder="e.g. 3 slots at 10:00 for the OFC appointment" />
      </label>
      {state.error && <p role="alert" className="mt-3 text-[13px] text-red-600">{state.error}</p>}
      {state.done && (
        <p role="status" className="mt-3 text-[13px] text-emerald-700 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Thanks! We'll check it and alert subscribers.
        </p>
      )}
      <button type="submit" disabled={state.busy}
        className="mt-4 h-11 px-5 rounded-xl bg-[hsl(var(--blue-700))] text-white text-[14px] font-semibold disabled:opacity-60 inline-flex items-center gap-2">
        {state.busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Send report
      </button>
    </form>
  );
}

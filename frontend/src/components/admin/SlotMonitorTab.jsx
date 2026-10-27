import { useState, useEffect, useCallback } from 'react';
import { Clock, RefreshCw, Bell, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { adminClient } from '../../lib/admin';
import { Panel } from './AdminShell';

export default function SlotMonitorTab() {
  const [slots, setSlots] = useState([]);
  const [summary, setSummary] = useState(null);
  const [consulates, setConsulates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (soft = false) => {
    if (!soft) setLoading(true);
    else setRefreshing(true);
    setErr('');
    try {
      const [slotsData, summaryData, consulatesData] = await Promise.all([
        adminClient('/slot-monitor/slots?limit=50'),
        adminClient('/slot-monitor/slots/summary'),
        adminClient('/slot-monitor/consulates'),
      ]);
      setSlots(Array.isArray(slotsData) ? slotsData : slotsData?.slots || []);
      setSummary(summaryData);
      setConsulates(Array.isArray(consulatesData) ? consulatesData : consulatesData?.consulates || []);
    } catch (ex) {
      setErr(ex?.response?.data?.detail || 'Failed to load slot data');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const availableSlots = slots.filter(s => s.available || s.status === 'available');
  const pendingReports = slots.filter(s => s.status === 'pending');

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[var(--admin-blue)]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-[var(--admin-blue)]" />
          <div>
            <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Visa Slot Monitor</h2>
            <p className="text-[13px] text-[var(--text-muted)]">Real-time consulate appointment availability</p>
          </div>
        </div>
        <button onClick={() => load(true)} disabled={refreshing} className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[var(--glass-hover)] border border-[var(--glass-border)] text-[13px] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {err && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700"><AlertCircle className="w-4 h-4 shrink-0" />{err}</div>}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Available slots', value: summary.available_count ?? availableSlots.length, color: 'text-emerald-600' },
            { label: 'Monitored consulates', value: summary.consulate_count ?? consulates.length, color: 'text-[var(--admin-blue)]' },
            { label: 'Pending reports', value: summary.pending_count ?? pendingReports.length, color: 'text-[var(--admin-amber)]' },
            { label: 'Active subscribers', value: summary.subscriber_count ?? '—', color: 'text-[var(--text-primary)]' },
          ].map(({ label, value, color }) => (
            <Panel key={label} className="text-center">
              <div className={`text-[28px] font-bold ${color}`}>{value}</div>
              <div className="text-[12px] text-[var(--text-muted)] mt-1">{label}</div>
            </Panel>
          ))}
        </div>
      )}

      {/* Consulates */}
      {consulates.length > 0 && (
        <Panel>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-[var(--admin-blue)]" />
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Monitored consulates ({consulates.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {consulates.map(c => (
              <span key={c.id || c.name} className="px-2.5 py-1 rounded-full bg-[var(--glass-hover)] border border-[var(--glass-border)] text-[12px] text-[var(--text-secondary)]">
                {c.name || c.country || c.id}
              </span>
            ))}
          </div>
        </Panel>
      )}

      {/* Slots table */}
      <Panel>
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-[var(--admin-blue)]" />
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Recent slots</h3>
        </div>
        {slots.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)] text-center py-8">No slot data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--glass-border)]">
                  {['Consulate', 'Date', 'Visa type', 'Status', 'Updated'].map(h => (
                    <th key={h} className="pb-2 text-left font-medium text-[var(--text-muted)] pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map((s, i) => (
                  <tr key={s.id || i} className="border-b border-[var(--glass-border)] last:border-0">
                    <td className="py-2 pr-4 text-[var(--text-primary)]">{s.consulate || s.location || '—'}</td>
                    <td className="py-2 pr-4 text-[var(--text-secondary)]">{s.date || s.slot_date || '—'}</td>
                    <td className="py-2 pr-4 text-[var(--text-secondary)]">{s.visa_type || s.category || '—'}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        s.available || s.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                        s.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-[var(--glass-hover)] text-[var(--text-muted)]'
                      }`}>{s.status || (s.available ? 'available' : 'none')}</span>
                    </td>
                    <td className="py-2 text-[var(--text-muted)]">{s.updated_at ? new Date(s.updated_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

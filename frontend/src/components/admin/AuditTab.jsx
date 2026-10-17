import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, Search, History, AlertTriangle } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import Pagination from './Pagination';
import { useDebouncedValue } from '../../hooks/use-debounced-value';

const PAGE_SIZE = 50;
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const show = (v) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

export default function AuditTab() {
  const { token } = useAdminAuth();
  const [entityType, setEntityType] = useState('');
  const [entityTypes, setEntityTypes] = useState([]);
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q.trim());
  const [skip, setSkip] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { setSkip(0); }, [dq, entityType]);

  const seq = useRef(0);
  const load = useCallback(async () => {
    const id = ++seq.current;
    setData(null);
    setError('');
    try {
      const r = await adminClient(token).get('/audit/log', {
        params: { entity_type: entityType || undefined, q: dq || undefined, limit: PAGE_SIZE, skip },
      });
      if (id !== seq.current) return;
      setData(r.data);
      if (r.data.entity_types?.length) setEntityTypes(r.data.entity_types);
    } catch (e) {
      if (id !== seq.current) return;
      setData({ items: [], total: 0 });
      setError(e?.response?.data?.detail || e.message);
    }
  }, [token, entityType, dq, skip]);

  useEffect(() => { load(); }, [load]);

  return (
    <div data-testid="admin-audit-tab">
      <AdminHeader title="Audit log" subtitle="Every change an admin made, newest first." />

      <Panel>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              data-testid="admin-audit-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search admin, action or record id…"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 focus:border-[hsl(var(--blue-700))] text-[13.5px] text-white placeholder:text-slate-500 outline-none"
            />
          </div>
          <select
            data-testid="admin-audit-entity-filter"
            aria-label="Filter by record type"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-[13.5px] text-white"
          >
            <option value="">All record types</option>
            {entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </Panel>

      <Panel className="mt-4 p-0 overflow-hidden">
        {data === null && <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-blue-300" /></div>}
        {error && (
          <div className="py-10 text-center text-[13.5px] text-red-300" role="alert">
            <AlertTriangle className="w-4 h-4 inline mr-1.5" /> Could not load the audit log: {error}{' '}
            <button onClick={load} className="underline text-slate-200 ml-1">Retry</button>
          </div>
        )}
        {data && !error && data.items.length === 0 && (
          <div className="py-10 text-center text-slate-400 text-[13.5px]"><History className="w-5 h-5 inline mr-2" /> No admin actions recorded.</div>
        )}
        <ul>
          {data?.items.map((a) => (
            <li key={a.id} data-testid={`admin-audit-row-${a.id}`} className="border-t first:border-t-0 border-white/5 px-5 py-3.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13.5px]">
                <span className="font-bold text-white">{a.admin_name || a.admin_email || 'admin'}</span>
                <span className="text-slate-300">{a.action}</span>
                <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-blue-500/15 text-blue-200">{a.entity_type}</span>
                {a.entity_id && <span className="font-mono text-[11.5px] text-slate-400 break-all">{a.entity_id}</span>}
                <time dateTime={a.at} className="ml-auto text-[12px] text-slate-400 whitespace-nowrap">{fmt(a.at)}</time>
              </div>
              {a.diff && Object.keys(a.diff).length > 0 && (
                <ul className="mt-1.5 space-y-0.5 text-[12.5px] font-mono">
                  {Object.entries(a.diff).map(([field, d]) => (
                    <li key={field} className="text-slate-300 break-all">
                      <span className="text-slate-400">{field}:</span> {show(d?.from)} → {show(d?.to)}
                    </li>
                  ))}
                </ul>
              )}
              {a.extra && Object.keys(a.extra).length > 0 && (
                <div className="mt-1 text-[12px] font-mono text-slate-400 break-all">{show(a.extra)}</div>
              )}
            </li>
          ))}
        </ul>
        {data?.total > 0 && (
          <div className="px-5 pb-3"><Pagination skip={skip} limit={PAGE_SIZE} total={data.total} onPageChange={setSkip} /></div>
        )}
      </Panel>
    </div>
  );
}

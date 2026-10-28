import { useEffect, useState, useCallback } from 'react';
import { Activity, Clock, DollarSign, AlertTriangle, Cpu, RefreshCw, Loader2, X, ChevronRight } from 'lucide-react';
import { apiClient } from '../../lib/admin';
import { useAdminAuth } from '../../context/AdminAuthContext';

const S = {
  page: { fontFamily: "'Noto Sans', sans-serif" },
  card: {
    background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14,
    padding: 17, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  heading: { fontFamily: "'Figtree', sans-serif", fontSize: 18, fontWeight: 700, color: '#0f1420' },
  label: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#9aa0b8' },
  value: { fontFamily: "'Figtree', sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f1420' },
  secondary: { fontSize: 13, color: '#5a6480' },
  muted: { fontSize: 12, color: '#9aa0b8' },
  btn: {
    background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 7,
    padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 1px 6px rgba(59,130,246,0.25)', display: 'inline-flex', alignItems: 'center', gap: 5,
  },
  ghost: {
    background: 'rgba(0,0,0,0.04)', color: '#5a6480', border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  th: {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
    color: '#9aa0b8', padding: '7px 10px', borderBottom: '1px solid rgba(0,0,0,0.07)',
    textAlign: 'left',
  },
  td: { padding: '9px 10px', fontSize: 12.5, color: '#5a6480', borderBottom: '1px solid rgba(0,0,0,0.04)' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 },
};

function IconWell({ color, children }) {
  const colors = {
    blue: { bg: 'rgba(59,130,246,0.10)', fg: '#3b82f6' },
    red: { bg: 'rgba(239,68,68,0.10)', fg: '#ef4444' },
    green: { bg: 'rgba(34,197,94,0.10)', fg: '#22c55e' },
    yellow: { bg: 'rgba(234,179,8,0.10)', fg: '#eab308' },
    purple: { bg: 'rgba(168,85,247,0.10)', fg: '#a855f7' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 8, display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: c.bg, color: c.fg, flexShrink: 0,
    }}>
      {children}
    </div>
  );
}

function StatusPill({ status }) {
  const ok = status === 'ok' || status === 'success';
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
      background: ok ? '#dcfce7' : '#fee2e2', color: ok ? '#16a34a' : '#dc2626',
      border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
    }}>
      {status || 'unknown'}
    </span>
  );
}

function timeAgo(iso) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return 'just now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
}

function StatCard({ icon, color, label, value, sub }) {
  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <IconWell color={color}>{icon}</IconWell>
        <span style={S.label}>{label}</span>
      </div>
      <div style={S.value}>{value}</div>
      {sub && <div style={{ ...S.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function TraceModal({ trace, onClose }) {
  if (!trace) return null;
  const spans = trace.spans || [];
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.3)',
    }} onClick={onClose}>
      <div style={{
        ...S.card, width: '90%', maxWidth: 720, maxHeight: '80vh', overflow: 'auto', borderRadius: 16,
        padding: 24, position: 'relative',
      }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#9aa0b8',
        }}><X size={18} /></button>

        <div style={{ ...S.heading, marginBottom: 4 }}>Trace Detail</div>
        <div style={{ ...S.muted, marginBottom: 16 }}>
          {trace.trace_id} · {trace.kind} · {trace.provider}/{trace.model}
        </div>

        <div style={S.label}>Spans ({spans.length})</div>
        <div style={{ marginTop: 8 }}>
          {spans.length === 0 && <div style={S.muted}>No spans recorded</div>}
          {spans.map((sp, i) => (
            <div key={i} style={{
              padding: '10px 12px', background: '#f8fafc', border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: 9, marginBottom: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ChevronRight size={12} style={{ color: '#9aa0b8' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f1420' }}>{sp.name || sp.kind || `span-${i}`}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9aa0b8' }}>
                  {sp.latency_ms != null ? `${sp.latency_ms}ms` : '—'}
                </span>
                <StatusPill status={sp.status || (sp.error ? 'error' : 'ok')} />
              </div>
              {sp.error && (
                <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6, paddingLeft: 20 }}>{sp.error}</div>
              )}
              {sp.metadata && Object.keys(sp.metadata).length > 0 && (
                <div style={{ fontSize: 11, color: '#5a6480', marginTop: 4, paddingLeft: 20 }}>
                  {Object.entries(sp.metadata).slice(0, 5).map(([k, v]) => (
                    <span key={k} style={{ marginRight: 12 }}>{k}: {String(v).slice(0, 60)}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ObservabilityTab() {
  const { token } = useAdminAuth();
  const [dashboard, setDashboard] = useState(null);
  const [traces, setTraces] = useState([]);
  const [tracesTotal, setTracesTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(24);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [traceDetail, setTraceDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [d, t] = await Promise.all([
        apiClient(token).get(`/observability/stats/dashboard?hours=${hours}`),
        apiClient(token).get('/observability/traces?skip=0&limit=20'),
      ]);
      setDashboard(d.data);
      setTraces(t.data.items || []);
      setTracesTotal(t.data.total || 0);
    } catch { /* silent */ }
    setLoading(false);
  }, [token, hours]);

  useEffect(() => { refresh(); }, [refresh]);

  const openTrace = async (traceId) => {
    setSelectedTrace(traceId);
    setDetailLoading(true);
    try {
      const r = await apiClient(token).get(`/observability/traces/${traceId}`);
      setTraceDetail(r.data.trace || r.data);
    } catch { setTraceDetail(null); }
    setDetailLoading(false);
  };

  const lat = dashboard?.latency || {};
  const cost = dashboard?.cost || {};
  const errors = dashboard?.errors || {};
  const tokens = dashboard?.tokens || {};
  const costProviders = cost.by_provider || [];
  const tokenModels = tokens.by_model || [];
  const totalCost = costProviders.reduce((s, p) => s + (p.cost_usd || 0), 0);
  const totalTokens = tokenModels.reduce((s, m) => s + (m.input_tokens || 0) + (m.output_tokens || 0), 0);

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <IconWell color="purple"><Activity size={16} /></IconWell>
        <div>
          <div style={S.heading}>LLM Observability</div>
          <div style={S.secondary}>Internal tracing — latency, cost, errors, tokens</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={hours}
            onChange={e => setHours(Number(e.target.value))}
            style={{
              background: '#ffffff', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 8,
              padding: '7px 12px', color: '#0f1420', fontSize: 12.5, cursor: 'pointer',
            }}
          >
            <option value={1}>Last 1h</option>
            <option value={6}>Last 6h</option>
            <option value={24}>Last 24h</option>
            <option value={72}>Last 3d</option>
            <option value={168}>Last 7d</option>
          </select>
          <button onClick={refresh} disabled={loading} style={S.btn}>
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={S.grid4}>
        <StatCard
          icon={<Clock size={16} />}
          color="blue"
          label="Latency P50"
          value={lat.p50 != null ? `${Math.round(lat.p50)}ms` : '—'}
          sub={lat.p90 != null ? `P90: ${Math.round(lat.p90)}ms · P99: ${Math.round(lat.p99)}ms` : null}
        />
        <StatCard
          icon={<DollarSign size={16} />}
          color="green"
          label="Total Cost"
          value={`$${totalCost.toFixed(4)}`}
          sub={`${costProviders.length} provider${costProviders.length !== 1 ? 's' : ''}`}
        />
        <StatCard
          icon={<AlertTriangle size={16} />}
          color="red"
          label="Error Rate"
          value={errors.error_rate != null ? `${(errors.error_rate * 100).toFixed(1)}%` : '—'}
          sub={errors.total != null ? `${errors.errors || 0} of ${errors.total} calls` : null}
        />
        <StatCard
          icon={<Cpu size={16} />}
          color="purple"
          label="Tokens"
          value={totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : String(totalTokens)}
          sub={`${tokenModels.length} model${tokenModels.length !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Cost by Provider + Token by Model tables side by side */}
      <div style={{ ...S.grid2, marginTop: 16 }}>
        <div style={S.card}>
          <div style={{ ...S.label, marginBottom: 10 }}>Cost by Provider</div>
          {costProviders.length === 0 && <div style={S.muted}>No data</div>}
          {costProviders.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={S.th}>Provider</th>
                  <th style={S.th}>Model</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Calls</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {costProviders.map((p, i) => (
                  <tr key={i} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={S.td}>{p.provider}</td>
                    <td style={{ ...S.td, fontWeight: 600, color: '#0f1420' }}>{p.model}</td>
                    <td style={{ ...S.td, textAlign: 'right' }}>{p.calls}</td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>${(p.cost_usd || 0).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={S.card}>
          <div style={{ ...S.label, marginBottom: 10 }}>Tokens by Model</div>
          {tokenModels.length === 0 && <div style={S.muted}>No data</div>}
          {tokenModels.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={S.th}>Model</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Input</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Output</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {tokenModels.map((m, i) => (
                  <tr key={i} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...S.td, fontWeight: 600, color: '#0f1420' }}>{m.model}</td>
                    <td style={{ ...S.td, textAlign: 'right' }}>{(m.input_tokens || 0).toLocaleString()}</td>
                    <td style={{ ...S.td, textAlign: 'right' }}>{(m.output_tokens || 0).toLocaleString()}</td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>
                      {((m.input_tokens || 0) + (m.output_tokens || 0)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent Traces */}
      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={S.label}>Recent Traces ({tracesTotal})</div>
        </div>
        {traces.length === 0 && !loading && <div style={S.muted}>No traces recorded yet</div>}
        {traces.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={S.th}>Trace ID</th>
                <th style={S.th}>Kind</th>
                <th style={S.th}>Provider / Model</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Latency</th>
                <th style={S.th}>Status</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Cost</th>
                <th style={{ ...S.th, textAlign: 'right' }}>When</th>
              </tr>
            </thead>
            <tbody>
              {traces.map((t) => (
                <tr
                  key={t.trace_id}
                  onClick={() => openTrace(t.trace_id)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 11.5 }}>
                    {(t.trace_id || '').slice(0, 12)}…
                  </td>
                  <td style={S.td}>
                    <span style={{
                      padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      letterSpacing: '0.04em', background: '#dbeafe', color: '#2563eb', border: '1px solid #bfdbfe',
                    }}>
                      {t.kind}
                    </span>
                  </td>
                  <td style={{ ...S.td, fontWeight: 600, color: '#0f1420' }}>
                    {t.provider}{t.model ? ` / ${t.model}` : ''}
                  </td>
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: "'Figtree', sans-serif", fontWeight: 600 }}>
                    {t.latency_ms != null ? `${Math.round(t.latency_ms)}ms` : '—'}
                  </td>
                  <td style={S.td}><StatusPill status={t.status} /></td>
                  <td style={{ ...S.td, textAlign: 'right' }}>
                    {t.cost_usd != null ? `$${t.cost_usd.toFixed(4)}` : '—'}
                  </td>
                  <td style={{ ...S.td, textAlign: 'right', color: '#9aa0b8', fontSize: 11 }}>
                    {timeAgo(t.started_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Trace Detail Modal */}
      {selectedTrace && (
        detailLoading
          ? <div style={{
              position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
              alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)',
            }}>
              <Loader2 size={28} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
            </div>
          : <TraceModal trace={traceDetail} onClose={() => { setSelectedTrace(null); setTraceDetail(null); }} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

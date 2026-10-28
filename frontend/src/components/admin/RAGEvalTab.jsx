import { useEffect, useState, useCallback } from 'react';
import { BarChart2, RefreshCw, Loader2, CheckCircle, XCircle, Zap } from 'lucide-react';
import { apiClient } from '../../lib/admin';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Panel } from './AdminShell';

const s = {
  page: { fontFamily: "'Noto Sans', sans-serif" },
  heading: { fontFamily: "'Figtree', sans-serif", fontSize: 18, fontWeight: 700, color: '#0f1420', margin: 0 },
  sub: { fontSize: 13, color: '#9aa0b8', marginTop: 2 },
  label: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#9aa0b8', margin: '0 0 6px' },
  statVal: { fontFamily: "'Figtree', sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f1420', margin: 0 },
  card: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: 17, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  g3: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 },
  bar: { height: 7, background: '#e2e8f0', borderRadius: 4, marginTop: 10 },
  barFill: (pct, color) => ({ height: '100%', borderRadius: 4, background: color, width: `${Math.min(100, pct)}%`, transition: 'width 0.4s ease' }),
  btn: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 6px rgba(59,130,246,0.25)', display: 'inline-flex', alignItems: 'center', gap: 5 },
  ghostBtn: { background: 'rgba(0,0,0,0.04)', color: '#5a6480', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  th: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9aa0b8', padding: '7px 10px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'left' },
  td: { padding: '9px 10px', fontSize: 12.5, color: '#5a6480', borderBottom: '1px solid rgba(0,0,0,0.04)' },
  pill: (bg, color, border) => ({ padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', background: bg, color, border: `1px solid ${border}`, display: 'inline-block' }),
  iconWell: (bg, color) => ({ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color, flexShrink: 0 }),
  sectionLabel: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#9aa0b8', margin: '0 0 12px' },
};

function ScoreCard({ label, value, color, icon }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div style={s.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={s.iconWell(`${color}1a`, color)}>{icon}</div>
        <p style={s.label}>{label}</p>
      </div>
      <p style={s.statVal}>{value != null ? `${pct}%` : '—'}</p>
      <div style={s.bar}><div style={s.barFill(pct, color)} /></div>
    </div>
  );
}

function TrendsChart({ data }) {
  if (!data || !data.length) return <p style={{ fontSize: 13, color: '#9aa0b8' }}>No trend data yet.</p>;
  const maxCount = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120 }}>
      {data.map((d, i) => {
        const h = Math.max(8, (d.count / maxCount) * 100);
        const avgScore = ((d.avg_faithfulness || 0) + (d.avg_relevancy || 0) + (d.avg_precision || 0)) / 3;
        const color = avgScore >= 0.7 ? '#22c55e' : avgScore >= 0.4 ? '#eab308' : '#ef4444';
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#5a6480' }}>{d.count}</span>
            <div style={{ width: '100%', maxWidth: 32, height: h, background: color, borderRadius: 4, opacity: 0.85 }} />
            <span style={{ fontSize: 9, color: '#9aa0b8', whiteSpace: 'nowrap' }}>{(d.date || '').slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

function AutoEvalConfig({ config, onSave, saving }) {
  const [enabled, setEnabled] = useState(false);
  const [rate, setRate] = useState(10);

  useEffect(() => {
    if (config) {
      setEnabled(!!config.auto_eval_enabled);
      setRate(config.auto_eval_sample_rate ?? 10);
    }
  }, [config]);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <span style={{ fontSize: 13, color: '#5a6480', fontWeight: 600 }}>Auto-evaluation</span>
        <button
          onClick={() => setEnabled(v => !v)}
          style={{
            width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', padding: 2,
            background: enabled ? '#3b82f6' : '#e2e8f0', transition: 'background 0.2s', position: 'relative',
          }}
        >
          <div style={{
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)', transition: 'transform 0.2s',
            transform: enabled ? 'translateX(18px)' : 'translateX(0)',
          }} />
        </button>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: '#5a6480', fontWeight: 600 }}>Sample rate</span>
        <input
          type="range" min={1} max={100} value={rate}
          onChange={e => setRate(Number(e.target.value))}
          style={{ width: 120, accentColor: '#3b82f6' }}
        />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f1420', minWidth: 36, textAlign: 'right' }}>1/{rate}</span>
      </label>
      <button
        onClick={() => onSave({ auto_eval_enabled: enabled, auto_eval_sample_rate: rate })}
        disabled={saving}
        style={{ ...s.btn, opacity: saving ? 0.6 : 1 }}
      >
        {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null}
        Save
      </button>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function scorePill(val) {
  if (val == null) return <span style={{ color: '#9aa0b8' }}>—</span>;
  const pct = Math.round(val * 100);
  if (pct >= 70) return <span style={s.pill('#dcfce7', '#16a34a', '#bbf7d0')}>{pct}%</span>;
  if (pct >= 40) return <span style={s.pill('#fef9c3', '#ca8a04', '#fef08a')}>{pct}%</span>;
  return <span style={s.pill('#fee2e2', '#dc2626', '#fecaca')}>{pct}%</span>;
}

export default function RAGEvalTab() {
  const { token } = useAdminAuth();
  const api = useCallback(() => apiClient(token), [token]);

  const [evals, setEvals] = useState([]);
  const [total, setTotal] = useState(0);
  const [trends, setTrends] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 15;

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [evRes, trRes, cfRes] = await Promise.all([
        api().get(`/rag-eval/evaluations?skip=${page * limit}&limit=${limit}`),
        api().get('/rag-eval/trends?days=7'),
        api().get('/rag-eval/config'),
      ]);
      setEvals(evRes.data.items || []);
      setTotal(evRes.data.total || 0);
      setTrends(trRes.data.daily || []);
      setConfig(cfRes.data);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [token, api, page]);

  useEffect(() => { refresh(); }, [refresh]);

  const avgScore = (key) => {
    if (!evals.length) return null;
    const vals = evals.map(e => e.scores?.[key]).filter(v => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const saveConfig = async (cfg) => {
    setSaving(true);
    try {
      await api().put('/rag-eval/config', cfg);
      setConfig(prev => ({ ...prev, ...cfg }));
    } catch { /* silent */ } finally { setSaving(false); }
  };

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={s.iconWell('rgba(168,85,247,0.10)', '#a855f7')}>
          <BarChart2 size={16} />
        </div>
        <div>
          <h2 style={s.heading}>RAG Evaluation</h2>
          <p style={s.sub}>LLM-as-judge quality metrics — faithfulness, relevancy, context precision</p>
        </div>
        <button onClick={refresh} disabled={loading} style={{ ...s.ghostBtn, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={13} />}
          Refresh
        </button>
      </div>

      {/* Score overview */}
      <div style={s.g3}>
        <ScoreCard label="Faithfulness" value={avgScore('faithfulness')} color="#3b82f6" icon={<CheckCircle size={14} />} />
        <ScoreCard label="Answer Relevancy" value={avgScore('answer_relevancy')} color="#22c55e" icon={<Zap size={14} />} />
        <ScoreCard label="Context Precision" value={avgScore('context_precision')} color="#a855f7" icon={<BarChart2 size={14} />} />
      </div>

      {/* Trends */}
      <Panel style={{ marginTop: 16 }}>
        <p style={s.sectionLabel}>7-day trend</p>
        <TrendsChart data={trends} />
      </Panel>

      {/* Auto-eval config */}
      <Panel style={{ marginTop: 16 }}>
        <p style={s.sectionLabel}>Auto-evaluation settings</p>
        <AutoEvalConfig config={config} onSave={saveConfig} saving={saving} />
      </Panel>

      {/* Evaluations table */}
      <Panel style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={s.sectionLabel}>Recent evaluations ({total})</p>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ ...s.ghostBtn, opacity: page === 0 ? 0.4 : 1 }}>← Prev</button>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * limit >= total} style={{ ...s.ghostBtn, opacity: (page + 1) * limit >= total ? 0.4 : 1 }}>Next →</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={s.th}>Question</th>
                <th style={s.th}>Faithfulness</th>
                <th style={s.th}>Relevancy</th>
                <th style={s.th}>Precision</th>
                <th style={s.th}>Overall</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Time</th>
              </tr>
            </thead>
            <tbody>
              {evals.map((ev) => (
                <tr key={ev._id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ ...s.td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0f1420', fontWeight: 500 }}>
                    {(ev.question || '').slice(0, 60)}{(ev.question || '').length > 60 ? '…' : ''}
                  </td>
                  <td style={s.td}>{scorePill(ev.scores?.faithfulness)}</td>
                  <td style={s.td}>{scorePill(ev.scores?.answer_relevancy)}</td>
                  <td style={s.td}>{scorePill(ev.scores?.context_precision)}</td>
                  <td style={s.td}>{scorePill(ev.overall_score)}</td>
                  <td style={s.td}>
                    {ev.auto
                      ? <span style={s.pill('#dbeafe', '#2563eb', '#bfdbfe')}>Auto</span>
                      : <span style={s.pill('#f1f5f9', '#64748b', '#e2e8f0')}>Manual</span>}
                  </td>
                  <td style={{ ...s.td, whiteSpace: 'nowrap', fontSize: 11 }}>{formatTime(ev.evaluated_at)}</td>
                </tr>
              ))}
              {!evals.length && !loading && (
                <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', color: '#9aa0b8', padding: 24 }}>No evaluations yet</td></tr>
              )}
              {loading && (
                <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', padding: 24 }}><Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

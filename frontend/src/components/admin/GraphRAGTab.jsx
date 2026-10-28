import { useEffect, useState, useCallback } from 'react';
import { Network, GitBranch, Globe, Tag, RefreshCw, Loader2, Search, MessageSquare } from 'lucide-react';
import { apiClient } from '../../lib/admin';
import { Panel } from './AdminShell';

const s = {
  page: { fontFamily: "'Noto Sans', sans-serif" },
  heading: { fontSize: 18, fontWeight: 700, color: '#0f1420', fontFamily: "'Figtree', sans-serif" },
  sub: { fontSize: 13, color: '#9aa0b8', marginTop: 2 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 },
  card: {
    background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14,
    padding: 17, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  statLabel: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#9aa0b8',
  },
  statVal: {
    fontFamily: "'Figtree', sans-serif", fontSize: 30, fontWeight: 800,
    letterSpacing: '-0.02em', color: '#0f1420', marginTop: 4,
  },
  iconWell: (bg, fg) => ({
    width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: bg, color: fg, flexShrink: 0,
  }),
  btn: {
    background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 7,
    padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 1px 6px rgba(59,130,246,0.25)', display: 'inline-flex',
    alignItems: 'center', gap: 6,
  },
  ghost: {
    background: 'rgba(0,0,0,0.04)', color: '#5a6480', border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  input: {
    background: '#ffffff', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 8,
    padding: '7px 12px', color: '#0f1420', fontSize: 12.5, outline: 'none', width: '100%',
    fontFamily: "'Noto Sans', sans-serif",
  },
  pill: (bg, fg, bdr) => ({
    padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
    letterSpacing: '0.04em', background: bg, color: fg, border: `1px solid ${bdr}`,
    display: 'inline-block',
  }),
  row: {
    padding: '10px 12px', background: '#f8fafc', border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  section: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#9aa0b8', marginBottom: 10 },
};

const ACCESS_PILL = {
  visa_free:  { bg: '#dcfce7', fg: '#16a34a', bdr: '#bbf7d0' },
  evisa:      { bg: '#dbeafe', fg: '#2563eb', bdr: '#bfdbfe' },
  on_arrival: { bg: '#fef9c3', fg: '#ca8a04', bdr: '#fef08a' },
  transit:    { bg: '#f1f5f9', fg: '#64748b', bdr: '#e2e8f0' },
};

function StatCard({ icon: Icon, iconBg, iconFg, label, value }) {
  return (
    <div style={s.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={s.iconWell(iconBg, iconFg)}><Icon size={15} /></div>
        <span style={s.statLabel}>{label}</span>
      </div>
      <div style={s.statVal}>{value ?? '—'}</div>
    </div>
  );
}

export default function GraphRAGTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildResult, setRebuildResult] = useState(null);

  const [country, setCountry] = useState('');
  const [visaFree, setVisaFree] = useState(null);
  const [vfLoading, setVfLoading] = useState(false);
  const [vfError, setVfError] = useState('');

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [qLoading, setQLoading] = useState(false);
  const [qError, setQError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient().get('/graph-rag/stats');
      setStats(r.data);
    } catch { setStats(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const rebuild = async () => {
    setRebuilding(true); setRebuildResult(null);
    try {
      const r = await apiClient().post('/graph-rag/rebuild');
      setRebuildResult(r.data);
      refresh();
    } catch {} finally { setRebuilding(false); }
  };

  const lookupVisaFree = async (e) => {
    e.preventDefault();
    const code = country.trim().toUpperCase();
    if (!code) return;
    setVfLoading(true); setVfError(''); setVisaFree(null);
    try {
      const r = await apiClient().get(`/graph-rag/visa-free/${code}`);
      setVisaFree(r.data);
    } catch (ex) {
      setVfError(ex?.response?.data?.detail || 'Lookup failed');
    } finally { setVfLoading(false); }
  };

  const askQuery = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setQLoading(true); setQError(''); setAnswer(null);
    try {
      const r = await apiClient().post('/graph-rag/query', { question: question.trim() });
      setAnswer(r.data);
    } catch (ex) {
      setQError(ex?.response?.data?.detail || 'Query failed');
    } finally { setQLoading(false); }
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={s.iconWell('rgba(168,85,247,0.10)', '#a855f7')}><Network size={18} /></div>
        <div>
          <div style={s.heading}>Graph RAG</div>
          <div style={s.sub}>Visa knowledge graph — cross-country reasoning and hybrid RAG queries</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={s.ghost} onClick={refresh} disabled={loading}>
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ ...s.grid4, marginBottom: 16 }}>
        <StatCard icon={GitBranch} iconBg="rgba(59,130,246,0.10)" iconFg="#3b82f6" label="Nodes" value={stats?.nodes} />
        <StatCard icon={Network} iconBg="rgba(168,85,247,0.10)" iconFg="#a855f7" label="Edges" value={stats?.edges} />
        <StatCard icon={Globe} iconBg="rgba(34,197,94,0.10)" iconFg="#22c55e" label="Countries" value={stats?.countries} />
        <StatCard icon={Tag} iconBg="rgba(234,179,8,0.10)" iconFg="#eab308" label="Visa Types" value={stats?.visa_types} />
      </div>

      {/* Rebuild */}
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={s.section}>Rebuild Graph</div>
            <div style={{ fontSize: 12.5, color: '#5a6480' }}>
              {stats?.last_built
                ? `Last built: ${new Date(stats.last_built).toLocaleString()}`
                : 'Never built'}
            </div>
          </div>
          <button style={{ ...s.btn, opacity: rebuilding ? 0.6 : 1 }} onClick={rebuild} disabled={rebuilding}>
            {rebuilding ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
            {rebuilding ? 'Building…' : 'Rebuild now'}
          </button>
        </div>
        {rebuildResult && (
          <div style={{ ...s.row, marginTop: 12 }}>
            <span style={{ fontSize: 12.5, color: '#5a6480' }}>
              Built {rebuildResult.nodes} nodes, {rebuildResult.edges} edges in {rebuildResult.build_time_ms}ms
            </span>
            <span style={s.pill('#dcfce7', '#16a34a', '#bbf7d0')}>Done</span>
          </div>
        )}
      </Panel>

      {/* Visa-Free Explorer */}
      <Panel style={{ marginTop: 16 }}>
        <div style={s.section}>Visa-Free Explorer</div>
        <form onSubmit={lookupVisaFree} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            style={{ ...s.input, maxWidth: 180 }}
            placeholder="Country code (e.g. US)"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            maxLength={3}
          />
          <button type="submit" style={{ ...s.btn, opacity: vfLoading ? 0.6 : 1 }} disabled={vfLoading}>
            {vfLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
            Lookup
          </button>
        </form>

        {vfError && <div style={{ fontSize: 12.5, color: '#ef4444', marginBottom: 8 }}>{vfError}</div>}

        {visaFree && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f1420', marginBottom: 8 }}>
              {visaFree.passport} passport — {visaFree.visa_free_countries?.length || 0} visa-free destinations
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(visaFree.visa_free_countries || []).map((c, i) => {
                const p = ACCESS_PILL[c.access_type] || ACCESS_PILL.transit;
                return (
                  <span key={i} style={s.pill(p.bg, p.fg, p.bdr)}>
                    {c.country} · {(c.access_type || '').replace(/_/g, ' ')}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </Panel>

      {/* Query Playground */}
      <Panel style={{ marginTop: 16 }}>
        <div style={s.section}>Query Playground</div>
        <form onSubmit={askQuery} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            style={s.input}
            placeholder="Ask a visa graph question…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button type="submit" style={{ ...s.btn, whiteSpace: 'nowrap', opacity: qLoading ? 0.6 : 1 }} disabled={qLoading}>
            {qLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <MessageSquare size={14} />}
            Ask
          </button>
        </form>

        {qError && <div style={{ fontSize: 12.5, color: '#ef4444', marginBottom: 8 }}>{qError}</div>}

        {answer && (
          <div>
            <div style={{ ...s.row, marginBottom: 8, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f1420' }}>Answer</div>
              <div style={{ fontSize: 12.5, color: '#5a6480', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {answer.answer}
              </div>
            </div>
            {answer.graph_data && (
              <div style={{ ...s.row, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#9aa0b8' }}>
                  Graph context
                </div>
                <pre style={{ fontSize: 11, color: '#5a6480', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflow: 'auto', width: '100%' }}>
                  {typeof answer.graph_data === 'string' ? answer.graph_data : JSON.stringify(answer.graph_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Panel>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

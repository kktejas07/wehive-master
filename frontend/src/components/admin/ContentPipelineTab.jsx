import { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, Play, Check, X, ChevronRight, FileText, Clock, Star } from 'lucide-react';
import { apiClient } from '../../lib/admin';
import { Panel } from './AdminShell';

const CONTENT_TYPES = [
  { value: 'reel_30s', label: 'Reel 30s', words: '~80 words' },
  { value: 'reel_10s', label: 'Reel 10s', words: '~30 words' },
  { value: 'linkedin_post', label: 'LinkedIn Post', words: '~300 words' },
  { value: 'newsletter_article', label: 'Newsletter Article', words: '~800 words' },
];

const STATUS_STYLES = {
  pending:   { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
  running:   { bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe' },
  completed: { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  failed:    { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  approved:  { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  rejected:  { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
};

const TYPE_STYLES = {
  reel_30s:            { bg: 'rgba(168,85,247,0.10)', color: '#a855f7' },
  reel_10s:            { bg: 'rgba(168,85,247,0.10)', color: '#a855f7' },
  linkedin_post:       { bg: 'rgba(59,130,246,0.10)',  color: '#3b82f6' },
  newsletter_article:  { bg: 'rgba(34,197,94,0.10)',   color: '#22c55e' },
};

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      letterSpacing: '0.04em', background: s.bg, color: s.color,
      border: `1px solid ${s.border}`, textTransform: 'uppercase',
    }}>
      {status}
    </span>
  );
}

function TypePill({ type }) {
  const s = TYPE_STYLES[type] || TYPE_STYLES.linkedin_post;
  const label = CONTENT_TYPES.find(t => t.value === type)?.label || type;
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color,
    }}>
      {label}
    </span>
  );
}

function StagePipeline({ stages }) {
  const names = ['research', 'write', 'review'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {names.map((name, i) => {
        const stage = (stages || []).find(s => s.name === name);
        const done = stage?.status === 'completed';
        const active = stage?.status === 'running';
        const failed = stage?.status === 'failed';
        let bg = '#e2e8f0';
        let color = '#9aa0b8';
        if (done) { bg = '#dcfce7'; color = '#16a34a'; }
        else if (active) { bg = '#dbeafe'; color = '#2563eb'; }
        else if (failed) { bg = '#fee2e2'; color = '#dc2626'; }
        return (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6, background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {done ? <Check style={{ width: 12, height: 12, color }} /> :
               active ? <Loader2 style={{ width: 12, height: 12, color, animation: 'spin 1s linear infinite' }} /> :
               <span style={{ fontSize: 10, fontWeight: 700, color }}>{i + 1}</span>}
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color, textTransform: 'capitalize' }}>{name}</span>
            {i < names.length - 1 && <ChevronRight style={{ width: 12, height: 12, color: '#9aa0b8' }} />}
          </div>
        );
      })}
    </div>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' +
         d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function RunDetailModal({ run, onClose, onAction }) {
  const [acting, setActing] = useState('');
  if (!run) return null;

  const handleAction = async (action) => {
    setActing(action);
    await onAction(run._id, action);
    setActing('');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: '#ffffff', borderRadius: 14, padding: 24, width: '100%',
        maxWidth: 680, maxHeight: '85vh', overflowY: 'auto',
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f1420', fontFamily: "'Figtree', sans-serif" }}>
              {run.topic || 'Untitled'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <TypePill type={run.content_type} />
              <StatusPill status={run.status} />
              {run.review_score != null && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 600, color: '#eab308' }}>
                  <Star style={{ width: 13, height: 13 }} /> {run.review_score}/10
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(0,0,0,0.08)',
            background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#5a6480',
          }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Stages */}
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#9aa0b8', marginBottom: 10 }}>
          Pipeline Stages
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {(run.stages || []).map((stage, i) => {
            const ss = STATUS_STYLES[stage.status] || STATUS_STYLES.pending;
            return (
              <div key={i} style={{
                padding: '12px 14px', background: '#f8fafc',
                border: '1px solid rgba(0,0,0,0.06)', borderRadius: 9,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f1420', textTransform: 'capitalize' }}>
                    {stage.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {stage.started_at && stage.finished_at && (
                      <span style={{ fontSize: 11, color: '#9aa0b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock style={{ width: 11, height: 11 }} />
                        {Math.round((new Date(stage.finished_at) - new Date(stage.started_at)) / 1000)}s
                      </span>
                    )}
                    <StatusPill status={stage.status} />
                  </div>
                </div>
                {stage.output && (
                  <div style={{
                    fontSize: 12, color: '#5a6480', lineHeight: 1.6,
                    background: '#ffffff', borderRadius: 7, padding: '8px 10px',
                    border: '1px solid rgba(0,0,0,0.05)', whiteSpace: 'pre-wrap',
                    maxHeight: 200, overflowY: 'auto',
                  }}>
                    {stage.output}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Final content */}
        {run.final_content && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#9aa0b8', marginBottom: 10 }}>
              Final Content
            </div>
            <div style={{
              padding: '14px 16px', background: '#f8fafc', borderRadius: 9,
              border: '1px solid rgba(0,0,0,0.06)', fontSize: 13, color: '#0f1420',
              lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 20,
            }}>
              {run.final_content}
            </div>
          </>
        )}

        {/* Actions */}
        {run.status === 'completed' && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => handleAction('reject')} disabled={!!acting} style={{
              background: 'rgba(0,0,0,0.04)', color: '#dc2626',
              border: '1px solid rgba(0,0,0,0.08)', borderRadius: 7,
              padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5, opacity: acting ? 0.6 : 1,
            }}>
              {acting === 'reject' ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <X style={{ width: 13, height: 13 }} />}
              Reject
            </button>
            <button onClick={() => handleAction('approve')} disabled={!!acting} style={{
              background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: 7,
              padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 1px 6px rgba(59,130,246,0.25)',
              display: 'flex', alignItems: 'center', gap: 5, opacity: acting ? 0.6 : 1,
            }}>
              {acting === 'approve' ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <Check style={{ width: 13, height: 13 }} />}
              Approve
            </button>
          </div>
        )}

        <div style={{ fontSize: 11, color: '#9aa0b8', marginTop: 14, textAlign: 'right' }}>
          Created {formatTime(run.created_at)}
        </div>
      </div>
    </div>
  );
}

export default function ContentPipelineTab() {
  const [runs, setRuns] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState('linkedin_post');
  const [generating, setGenerating] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ skip: '0', limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const r = await apiClient().get(`/content-pipeline/runs?${params}`);
      let items = r.data.items || [];
      if (typeFilter) items = items.filter(i => i.content_type === typeFilter);
      setRuns(items);
      setTotal(r.data.total || 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [statusFilter, typeFilter]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      await apiClient().post('/content-pipeline/run', { content_type: contentType, topic: topic.trim() });
      setTopic('');
      await fetchRuns();
    } catch { /* ignore */ }
    finally { setGenerating(false); }
  };

  const openDetail = async (run) => {
    setDetailLoading(true);
    try {
      const r = await apiClient().get(`/content-pipeline/runs/${run._id}`);
      setSelectedRun(r.data.run || r.data);
    } catch {
      setSelectedRun(run);
    }
    finally { setDetailLoading(false); }
  };

  const handleAction = async (runId, action) => {
    try {
      await apiClient().post(`/content-pipeline/runs/${runId}/${action}`);
      setSelectedRun(null);
      await fetchRuns();
    } catch { /* ignore */ }
  };

  const inputStyle = {
    background: '#ffffff', border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 8, padding: '7px 12px', color: '#0f1420',
    fontSize: 12.5, outline: 'none', fontFamily: "'Noto Sans', sans-serif",
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(168,85,247,0.10)',
        }}>
          <FileText style={{ width: 16, height: 16, color: '#a855f7' }} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f1420', fontFamily: "'Figtree', sans-serif" }}>Content Pipeline</div>
          <div style={{ fontSize: 12, color: '#9aa0b8' }}>Multi-agent content generation — research → write → review</div>
        </div>
        <button onClick={fetchRuns} style={{
          marginLeft: 'auto', background: 'rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.08)', borderRadius: 7,
          padding: '6px 10px', cursor: 'pointer', color: '#5a6480',
          display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600,
        }}>
          <RefreshCw style={{ width: 13, height: 13 }} /> Refresh
        </button>
      </div>

      {/* New Content Form */}
      <Panel>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#9aa0b8', marginBottom: 10 }}>
          Generate New Content
        </div>
        <form onSubmit={handleGenerate} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#5a6480', display: 'block', marginBottom: 4 }}>Topic</label>
            <input
              value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="e.g. US H-1B visa lottery 2025 changes"
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#5a6480', display: 'block', marginBottom: 4 }}>Content Type</label>
            <select value={contentType} onChange={e => setContentType(e.target.value)} style={{ ...inputStyle, minWidth: 170 }}>
              {CONTENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label} ({t.words})</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={generating || !topic.trim()} style={{
            background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: 7,
            padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 1px 6px rgba(59,130,246,0.25)',
            display: 'flex', alignItems: 'center', gap: 5,
            opacity: generating || !topic.trim() ? 0.6 : 1,
          }}>
            {generating ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <Play style={{ width: 13, height: 13 }} />}
            Generate
          </button>
        </form>
      </Panel>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#9aa0b8' }}>
          Filter
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, minWidth: 120 }}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="failed">Failed</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...inputStyle, minWidth: 140 }}>
          <option value="">All Types</option>
          {CONTENT_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <span style={{ fontSize: 11, color: '#9aa0b8', marginLeft: 'auto' }}>{total} runs total</span>
      </div>

      {/* Runs list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 style={{ width: 22, height: 22, color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : runs.length === 0 ? (
        <Panel>
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#9aa0b8', fontSize: 13 }}>
            No pipeline runs yet. Generate your first content above.
          </div>
        </Panel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {runs.map(run => (
            <div key={run._id} onClick={() => openDetail(run)} style={{
              background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)',
              borderRadius: 14, padding: '14px 17px', cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              transition: 'box-shadow 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.07)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f1420', fontFamily: "'Figtree', sans-serif", marginBottom: 6 }}>
                    {run.topic || 'Untitled'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <TypePill type={run.content_type} />
                    <StatusPill status={run.status} />
                    {run.review_score != null && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: '#eab308' }}>
                        <Star style={{ width: 12, height: 12 }} /> {run.review_score}/10
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#9aa0b8' }}>{formatTime(run.created_at)}</div>
                </div>
              </div>
              <StagePipeline stages={run.stages} />
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {detailLoading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)',
        }}>
          <Loader2 style={{ width: 28, height: 28, color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
        </div>
      )}
      {selectedRun && !detailLoading && (
        <RunDetailModal run={selectedRun} onClose={() => setSelectedRun(null)} onAction={handleAction} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

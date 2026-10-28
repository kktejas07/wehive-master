import { useEffect, useState, useCallback } from 'react';
import { Globe, Plus, Trash2, Play, RefreshCw, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient } from '../../lib/admin';
import { Panel } from './AdminShell';

const CATEGORIES = ['visa_bulletin', 'embassy', 'uscis', 'immigration_news', 'policy', 'other'];

const s = {
  page: { fontFamily: "'Noto Sans', sans-serif" },
  heading: { fontFamily: "'Figtree', sans-serif", fontSize: 18, fontWeight: 700, color: '#0f1420', margin: 0 },
  sub: { fontSize: 13, color: '#9aa0b8', marginTop: 2 },
  label: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#9aa0b8', marginBottom: 4 },
  val: { fontFamily: "'Figtree', sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f1420' },
  card: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: 17, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  btn: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 6px rgba(59,130,246,0.25)', display: 'inline-flex', alignItems: 'center', gap: 6 },
  btnGhost: { background: 'rgba(0,0,0,0.04)', color: '#5a6480', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
  btnDanger: { background: 'rgba(239,68,68,0.10)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
  input: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 8, padding: '7px 12px', color: '#0f1420', fontSize: 12.5, width: '100%', boxSizing: 'border-box', outline: 'none' },
  select: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 8, padding: '7px 12px', color: '#0f1420', fontSize: 12.5, width: '100%', boxSizing: 'border-box', outline: 'none', appearance: 'none' },
  pill: (color) => {
    const map = {
      green:  { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
      red:    { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
      yellow: { bg: '#fef9c3', color: '#ca8a04', border: '#fef08a' },
      blue:   { bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe' },
      gray:   { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
    };
    const c = map[color] || map.gray;
    return { padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', background: c.bg, color: c.color, border: `1px solid ${c.border}`, display: 'inline-block' };
  },
  th: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9aa0b8', padding: '7px 10px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'left' },
  td: { padding: '9px 10px', fontSize: 12.5, color: '#5a6480', borderBottom: '1px solid rgba(0,0,0,0.04)' },
  row: { background: '#f8fafc', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 9, padding: '10px 12px', marginBottom: 8 },
  iconWell: (color) => {
    const map = {
      blue:   { bg: 'rgba(59,130,246,0.10)', icon: '#3b82f6' },
      green:  { bg: 'rgba(34,197,94,0.10)',  icon: '#22c55e' },
      red:    { bg: 'rgba(239,68,68,0.10)',  icon: '#ef4444' },
      yellow: { bg: 'rgba(234,179,8,0.10)',  icon: '#eab308' },
      purple: { bg: 'rgba(168,85,247,0.10)', icon: '#a855f7' },
    };
    const c = map[color] || map.blue;
    return { width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.bg, color: c.icon, flexShrink: 0 };
  },
};

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function truncateUrl(url, max = 50) {
  if (!url) return '';
  try {
    const u = new URL(url);
    const path = u.pathname.length > 30 ? u.pathname.slice(0, 27) + '…' : u.pathname;
    const full = u.hostname + path;
    return full.length > max ? full.slice(0, max - 1) + '…' : full;
  } catch { return url.length > max ? url.slice(0, max - 1) + '…' : url; }
}

function categoryColor(cat) {
  const map = { visa_bulletin: 'blue', embassy: 'green', uscis: 'yellow', immigration_news: 'gray', policy: 'gray' };
  return map[cat] || 'gray';
}

export default function ScrapingTab() {
  const [targets, setTargets] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', css_selector: '', category: 'visa_bulletin', schedule_hours: 24 });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [scraping, setScraping] = useState('');
  const [cycleRunning, setCycleRunning] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, h] = await Promise.all([
        apiClient().get('/scraping/targets'),
        apiClient().get('/scraping/history?limit=30'),
      ]);
      setTargets(t.data.targets || []);
      setRuns(h.data.runs || []);
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      if (editId) {
        await apiClient().put(`/scraping/targets/${editId}`, form);
      } else {
        await apiClient().post('/scraping/targets', form);
      }
      setShowForm(false);
      setEditId(null);
      setForm({ name: '', url: '', css_selector: '', category: 'visa_bulletin', schedule_hours: 24 });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this scrape target?')) return;
    try {
      await apiClient().delete(`/scraping/targets/${id}`);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message);
    }
  };

  const handleToggleActive = async (target) => {
    try {
      await apiClient().put(`/scraping/targets/${target._id}`, { active: !target.active });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message);
    }
  };

  const handleScrapeOne = async (id) => {
    setScraping(id);
    try {
      await apiClient().post(`/scraping/targets/${id}/scrape`);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message);
    } finally { setScraping(''); }
  };

  const handleCycle = async () => {
    setCycleRunning(true); setErr('');
    try {
      await apiClient().post('/scraping/cycle');
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message);
    } finally { setCycleRunning(false); }
  };

  const startEdit = (t) => {
    setForm({ name: t.name, url: t.url, css_selector: t.css_selector || '', category: t.category || 'other', schedule_hours: t.schedule_hours || 24 });
    setEditId(t._id);
    setShowForm(true);
  };

  const filteredRuns = historyTarget ? runs.filter((r) => r.target_id === historyTarget) : runs;
  const targetNameMap = {};
  targets.forEach((t) => { targetNameMap[t._id] = t.name; });
  const activeCount = targets.filter((t) => t.active).length;
  const changedCount = runs.filter((r) => r.changed).length;

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={s.iconWell('blue')}>
          <Globe style={{ width: 16, height: 16 }} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={s.heading}>Web Scraping</h2>
          <div style={s.sub}>Automated visa data scraping — targets, schedules, change detection</div>
        </div>
        <button style={s.btn} onClick={handleCycle} disabled={cycleRunning}>
          {cycleRunning ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Play style={{ width: 14, height: 14 }} />}
          Run full cycle
        </button>
        <button style={s.btnGhost} onClick={load} disabled={loading}>
          <RefreshCw style={{ width: 14, height: 14, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {err && (
        <div style={{ ...s.row, background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12.5, marginBottom: 16 }}>
          {err}
          <button onClick={() => setErr('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Targets', value: targets.length, color: 'blue' },
          { label: 'Active', value: activeCount, color: 'green' },
          { label: 'Recent Runs', value: runs.length, color: 'yellow' },
          { label: 'Changes Detected', value: changedCount, color: 'purple' },
        ].map((stat) => (
          <div key={stat.label} style={s.card}>
            <div style={s.label}>{stat.label}</div>
            <div style={s.val}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Add target button / form */}
      <div style={{ marginBottom: 16 }}>
        {!showForm ? (
          <button style={s.btn} onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', url: '', css_selector: '', category: 'visa_bulletin', schedule_hours: 24 }); }}>
            <Plus style={{ width: 14, height: 14 }} /> Add Target
          </button>
        ) : (
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f1420' }}>{editId ? 'Edit Target' : 'New Scrape Target'}</div>
              <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aa0b8' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={s.label}>Name</div>
                  <input style={s.input} placeholder="US Visa Bulletin" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <div style={s.label}>URL</div>
                  <input style={s.input} placeholder="https://travel.state.gov/..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
                </div>
                <div>
                  <div style={s.label}>CSS Selector</div>
                  <input style={s.input} placeholder=".content-inner" value={form.css_selector} onChange={(e) => setForm({ ...form, css_selector: e.target.value })} />
                </div>
                <div>
                  <div style={s.label}>Category</div>
                  <select style={s.select} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <div style={s.label}>Schedule (hours)</div>
                  <input style={s.input} type="number" min="1" max="720" value={form.schedule_hours} onChange={(e) => setForm({ ...form, schedule_hours: parseInt(e.target.value) || 24 })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" style={s.btn} disabled={saving}>
                  {saving ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : null}
                  {editId ? 'Update' : 'Add Target'}
                </button>
                <button type="button" style={s.btnGhost} onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Targets list */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ ...s.label, marginBottom: 10 }}>Scrape Targets</div>
        {loading && targets.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
          </div>
        )}
        {targets.length === 0 && !loading && (
          <div style={{ ...s.card, textAlign: 'center', color: '#9aa0b8', fontSize: 13, padding: 32 }}>
            No scrape targets configured. Add one to get started.
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {targets.map((t) => (
            <div key={t._id} style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1420' }}>{t.name}</div>
                  <div style={{ fontSize: 11.5, color: '#5a6480', marginTop: 2 }}>{truncateUrl(t.url)}</div>
                </div>
                <span style={s.pill(categoryColor(t.category))}>{(t.category || 'other').replace(/_/g, ' ')}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11.5, color: '#9aa0b8' }}>
                <span>Every {t.schedule_hours || 24}h</span>
                <span>·</span>
                <span>Last: {timeAgo(t.last_scraped)}</span>
                <span>·</span>
                <button
                  onClick={() => handleToggleActive(t)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
                    color: t.active ? '#22c55e' : '#9aa0b8',
                  }}
                >
                  {t.active ? '● Active' : '○ Paused'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button
                  style={s.btnGhost}
                  onClick={() => handleScrapeOne(t._id)}
                  disabled={scraping === t._id}
                >
                  {scraping === t._id
                    ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
                    : <Play style={{ width: 12, height: 12 }} />}
                  Scrape now
                </button>
                <button style={s.btnGhost} onClick={() => startEdit(t)}>Edit</button>
                <button style={s.btnDanger} onClick={() => handleDelete(t._id)}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
                <button
                  style={{ ...s.btnGhost, marginLeft: 'auto' }}
                  onClick={() => setHistoryTarget(historyTarget === t._id ? null : t._id)}
                >
                  {historyTarget === t._id ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
                  History
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scrape history table */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={s.label}>
            Recent Runs
            {historyTarget && (
              <button
                onClick={() => setHistoryTarget(null)}
                style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: 11, fontWeight: 600 }}
              >
                Show all ×
              </button>
            )}
          </div>
        </div>
        <div style={s.card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={s.th}>Target</th>
                <th style={s.th}>Time</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Size</th>
                <th style={s.th}>Diff</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...s.td, textAlign: 'center', color: '#9aa0b8', padding: 24 }}>No scrape runs yet</td>
                </tr>
              )}
              {filteredRuns.slice(0, 25).map((r) => (
                <tr key={r._id} style={{ cursor: 'default' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={s.td}>
                    <span style={{ fontWeight: 600, color: '#0f1420' }}>{targetNameMap[r.target_id] || r.target_id?.slice(0, 8)}</span>
                  </td>
                  <td style={s.td}>{timeAgo(r.scraped_at)}</td>
                  <td style={s.td}>
                    {r.error
                      ? <span style={s.pill('red')}>Error</span>
                      : r.changed
                        ? <span style={s.pill('green')}>Changed</span>
                        : <span style={s.pill('gray')}>No change</span>}
                  </td>
                  <td style={s.td}>{r.content_length ? `${(r.content_length / 1024).toFixed(1)} KB` : '—'}</td>
                  <td style={{ ...s.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.error || r.diff_summary || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Brain, Users, Database, TrendingUp, RefreshCw, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '../../lib/admin';
import { Panel } from './AdminShell';

const S = {
  page: { fontFamily: "'Noto Sans', sans-serif" },
  heading: { fontFamily: "'Figtree', sans-serif", fontSize: 18, fontWeight: 700, color: '#0f1420', margin: 0 },
  subtext: { fontSize: 13, color: '#9aa0b8', margin: 0 },
  card: {
    background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14,
    padding: 17, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s, border-color 0.2s',
  },
  statLabel: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#9aa0b8', margin: '0 0 6px',
  },
  statValue: {
    fontFamily: "'Figtree', sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f1420', margin: 0,
  },
  iconWell: (bg, color) => ({
    width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: bg, color, flexShrink: 0,
  }),
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  sectionLabel: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#9aa0b8', margin: '0 0 10px',
  },
  pill: (bg, color, border) => ({
    display: 'inline-block', padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
    letterSpacing: '0.04em', background: bg, color, border: `1px solid ${border}`,
  }),
  th: {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9aa0b8',
    padding: '7px 10px', borderBottom: '1px solid rgba(0,0,0,0.07)', textAlign: 'left',
  },
  td: {
    padding: '9px 10px', fontSize: 12.5, color: '#5a6480', borderBottom: '1px solid rgba(0,0,0,0.04)',
  },
  btn: {
    background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 6px rgba(59,130,246,0.25)',
  },
  ghostBtn: {
    background: 'rgba(0,0,0,0.04)', color: '#5a6480', border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#fff', borderRadius: 14, padding: 24, width: '90%', maxWidth: 640,
    maxHeight: '80vh', overflow: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
  },
  listRow: {
    padding: '10px 12px', background: '#f8fafc', border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 9, transition: 'background 0.15s, border-color 0.15s',
  },
};

function StatCard({ icon, iconBg, iconColor, label, value }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        ...S.card,
        ...(hovered ? { boxShadow: '0 4px 16px rgba(0,0,0,0.10)', borderColor: 'rgba(0,0,0,0.12)' } : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={S.iconWell(iconBg, iconColor)}>{icon}</div>
        <p style={S.statLabel}>{label}</p>
      </div>
      <p style={S.statValue}>{value}</p>
    </div>
  );
}

function BarChart({ items, maxCount }) {
  if (!items.length) return <p style={{ fontSize: 13, color: '#9aa0b8' }}>No data yet</p>;
  const max = maxCount || Math.max(...items.map((i) => i.count), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item) => (
        <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#5a6480', width: 140, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.key}
          </span>
          <div style={{ flex: 1, height: 7, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(item.count / max) * 100}%`, height: '100%', borderRadius: 4, background: '#3b82f6', transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9aa0b8', width: 32, textAlign: 'right' }}>{item.count}</span>
        </div>
      ))}
    </div>
  );
}

function ProfileModal({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient().get(`/student-memory/admin/profiles/${userId}`)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ ...S.heading, fontSize: 16 }}>Student Profile</h3>
            <p style={{ fontSize: 12, color: '#9aa0b8', margin: '2px 0 0' }}>{userId}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aa0b8' }}>
            <X size={18} />
          </button>
        </div>

        {loading && <Loader2 size={20} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />}

        {data && (
          <>
            {data.profile?.summary && (
              <div style={{ ...S.card, marginBottom: 16, background: '#f8fafc' }}>
                <p style={S.sectionLabel}>Profile Summary</p>
                <p style={{ fontSize: 13, color: '#0f1420', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {data.profile.summary}
                </p>
              </div>
            )}

            <p style={S.sectionLabel}>Memories ({data.memories?.length || 0})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(data.memories || []).map((mem, i) => (
                <div key={i} style={S.listRow}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0f1420' }}>{mem.key}</span>
                    <span style={S.pill(
                      mem.type === 'fact' ? '#dbeafe' : mem.type === 'preference' ? '#f3e8ff' : '#dcfce7',
                      mem.type === 'fact' ? '#2563eb' : mem.type === 'preference' ? '#7c3aed' : '#16a34a',
                      mem.type === 'fact' ? '#bfdbfe' : mem.type === 'preference' ? '#e9d5ff' : '#bbf7d0',
                    )}>
                      {mem.type || 'fact'}
                    </span>
                  </div>
                  <p style={{ fontSize: 12.5, color: '#5a6480', margin: 0 }}>
                    {typeof mem.value === 'object' ? JSON.stringify(mem.value) : String(mem.value)}
                  </p>
                  {mem.extracted_at && (
                    <p style={{ fontSize: 11, color: '#9aa0b8', margin: '4px 0 0' }}>
                      {new Date(mem.extracted_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
              {(!data.memories || data.memories.length === 0) && (
                <p style={{ fontSize: 13, color: '#9aa0b8', textAlign: 'center', padding: 16 }}>No memories stored</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function StudentMemoryTab() {
  const [stats, setStats] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const limit = 20;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        apiClient().get('/student-memory/admin/stats'),
        apiClient().get(`/student-memory/admin/profiles?skip=${page * limit}&limit=${limit}`),
      ]);
      setStats(s.data);
      setProfiles(p.data.items || []);
      setTotal(p.data.total || 0);
    } catch {}
    setLoading(false);
  }, [page]);

  useEffect(() => { refresh(); }, [refresh]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={S.iconWell('rgba(168,85,247,0.10)', '#a855f7')}>
          <Brain size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={S.heading}>Student Memory</h2>
          <p style={S.subtext}>Mem0 persistent cross-session profiles</p>
        </div>
        <button onClick={refresh} style={S.ghostBtn} disabled={loading}>
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ ...S.grid3, marginBottom: 20 }}>
          <StatCard
            icon={<Users size={14} />}
            iconBg="rgba(59,130,246,0.10)" iconColor="#3b82f6"
            label="Users with memories" value={stats.total_users_with_memories ?? 0}
          />
          <StatCard
            icon={<Database size={14} />}
            iconBg="rgba(34,197,94,0.10)" iconColor="#22c55e"
            label="Total memories" value={stats.total_memories ?? 0}
          />
          <StatCard
            icon={<TrendingUp size={14} />}
            iconBg="rgba(234,179,8,0.10)" iconColor="#eab308"
            label="Avg per user" value={stats.avg_memories_per_user ?? 0}
          />
        </div>
      )}

      {/* Top Extracted Facts */}
      {stats?.top_extracted_facts?.length > 0 && (
        <Panel>
          <p style={{ ...S.sectionLabel, marginBottom: 14 }}>Top Extracted Facts</p>
          <BarChart items={stats.top_extracted_facts} />
        </Panel>
      )}

      {/* Profiles Table */}
      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={S.sectionLabel}>User Profiles</p>
          <span style={{ fontSize: 12, color: '#9aa0b8' }}>{total} total</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={S.th}>User ID</th>
                <th style={S.th}>Memories</th>
                <th style={S.th}>Last Extracted</th>
                <th style={S.th}>Top Keys</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr
                  key={p.user_id}
                  style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                  onClick={() => setSelectedUser(p.user_id)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...S.td, fontWeight: 600, color: '#0f1420', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.user_id}
                  </td>
                  <td style={S.td}>
                    <span style={S.pill('#dbeafe', '#2563eb', '#bfdbfe')}>{p.memory_count}</span>
                  </td>
                  <td style={S.td}>
                    {p.latest ? new Date(p.latest).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ ...S.td, maxWidth: 260 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(p.keys || []).slice(0, 4).map((k) => (
                        <span key={k} style={S.pill('#f1f5f9', '#64748b', '#e2e8f0')}>{k}</span>
                      ))}
                      {(p.keys || []).length > 4 && (
                        <span style={{ fontSize: 11, color: '#9aa0b8' }}>+{p.keys.length - 4}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} style={{ ...S.td, textAlign: 'center', color: '#9aa0b8', padding: 24 }}>
                    No student memories found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14 }}>
            <button
              style={{ ...S.ghostBtn, opacity: page === 0 ? 0.4 : 1 }}
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 12, color: '#5a6480' }}>
              {page + 1} / {totalPages}
            </span>
            <button
              style={{ ...S.ghostBtn, opacity: page >= totalPages - 1 ? 0.4 : 1 }}
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedUser && <ProfileModal userId={selectedUser} onClose={() => setSelectedUser(null)} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

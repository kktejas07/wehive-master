import { useState, useEffect, useCallback } from 'react';
import { Share2, Gift, Users, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { adminClient } from '../../lib/admin';
import { Panel } from './AdminShell';

export default function ReferralsTab() {
  const [stats, setStats] = useState(null);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const data = await adminClient('/referrals/stats');
      setStats(data);
      if (Array.isArray(data?.codes)) setCodes(data.codes);
      else if (Array.isArray(data?.top_codes)) setCodes(data.top_codes);
    } catch (ex) {
      setErr(ex?.response?.data?.detail || 'Failed to load referral data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[var(--admin-blue)]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Share2 className="w-6 h-6 text-[var(--admin-blue)]" />
        <div>
          <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Referrals</h2>
          <p className="text-[13px] text-[var(--text-muted)]">Referral codes, claim stats, and reward tracking</p>
        </div>
      </div>

      {err && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700"><AlertCircle className="w-4 h-4 shrink-0" />{err}</div>}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total codes', value: stats.total_codes ?? codes.length, Icon: Share2, color: 'text-[var(--admin-blue)]' },
            { label: 'Total claims', value: stats.total_claims ?? stats.claims ?? '—', Icon: Users, color: 'text-emerald-600' },
            { label: 'Rewards issued', value: stats.total_rewards ?? stats.rewards ?? '—', Icon: Gift, color: 'text-[var(--admin-amber)]' },
            { label: 'Conversion rate', value: stats.conversion_rate ? `${(stats.conversion_rate * 100).toFixed(1)}%` : '—', Icon: TrendingUp, color: 'text-[var(--text-primary)]' },
          ].map(({ label, value, Icon, color }) => (
            <Panel key={label}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-[12px] text-[var(--text-muted)]">{label}</span>
              </div>
              <div className={`text-[24px] font-bold ${color}`}>{value}</div>
            </Panel>
          ))}
        </div>
      )}

      {codes.length > 0 && (
        <Panel>
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">Top referral codes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--glass-border)]">
                  {['Code', 'Owner', 'Claims', 'Rewards', 'Created'].map(h => (
                    <th key={h} className="pb-2 text-left font-medium text-[var(--text-muted)] pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {codes.map((c, i) => (
                  <tr key={c.code || i} className="border-b border-[var(--glass-border)] last:border-0">
                    <td className="py-2 pr-4 font-mono font-bold text-[var(--admin-blue)]">{c.code}</td>
                    <td className="py-2 pr-4 text-[var(--text-secondary)]">{c.owner_email || c.owner || '—'}</td>
                    <td className="py-2 pr-4 text-[var(--text-primary)]">{c.claims ?? c.claim_count ?? 0}</td>
                    <td className="py-2 pr-4 text-[var(--text-primary)]">{c.rewards ?? c.reward_count ?? 0}</td>
                    <td className="py-2 text-[var(--text-muted)]">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {!err && !stats && (
        <Panel>
          <p className="text-[13px] text-[var(--text-muted)] text-center py-8">No referral data available yet</p>
        </Panel>
      )}
    </div>
  );
}

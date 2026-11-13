import { useEffect, useState, useCallback } from 'react';
import { GraduationCap, CheckCircle2, X, Loader2, Users, Building2 } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient } from '../../lib/admin';
import { useToast } from '../../hooks/use-toast';
import { AdminHeader, Panel } from './AdminShell';

const KIND_API = { tpo: 'tpos', leader: 'leaders', club: 'clubs', ambassador: 'ambassadors' };
const KIND_LABEL = { tpo: 'TPO', leader: 'Student leader', club: 'Club', ambassador: 'Ambassador' };

export default function CampusTab() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [queue, setQueue] = useState([]);
  const [sections, setSections] = useState({ tpos: [], leaders: [], clubs: [], ambassadors: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const c = adminClient(token);
    try {
      const [q, t, l, cl, a] = await Promise.all([
        c.get('/campus/verify-queue'),
        c.get('/campus/tpos'),
        c.get('/campus/leaders'),
        c.get('/campus/clubs'),
        c.get('/campus/ambassadors'),
      ]);
      setQueue(q.data);
      setSections({ tpos: t.data, leaders: l.data, clubs: cl.data, ambassadors: a.data });
    } catch (e) {
      toast({ title: 'Failed to load campus data', description: e?.response?.data?.detail, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (kind, id, status) => {
    try {
      await adminClient(token).patch(`/campus/${KIND_API[kind]}/${id}`, { status });
      toast({ title: `${KIND_LABEL[kind]} ${status === 'verified' ? 'verified' : 'updated'}` });
      load();
    } catch (err) {
      toast({ title: 'Update failed', description: err?.response?.data?.detail, variant: 'destructive' });
    }
  };

  const nameOf = (d) => d.name || d.college || d.contact_name || '—';

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  const row = (d) => (
    <tr key={d.id} className="border-b border-[#E8EDF8] last:border-0">
      <td className="py-2 pr-4 font-medium">{nameOf(d)}</td>
      <td className="py-2 pr-4 text-gray-500">{d.college || d.contact_name || '—'}</td>
      <td className="py-2 pr-4 text-gray-500">{d.email || d.leader_name || '—'}</td>
      <td className="py-2">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${d.status === 'verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{d.status}</span>
      </td>
    </tr>
  );

  const section = (kind, Icon, title) => (
    <Panel>
      <div className="flex items-center gap-2 mb-3"><Icon className="w-4 h-4 text-blue-500" /><h3 className="text-[14px] font-semibold">{title} <span className="text-gray-400 font-normal">({sections[kind].length})</span></h3></div>
      <table className="w-full text-[13px]">
        <thead><tr className="border-b border-[#E8EDF8]">{['Name', 'Detail', 'Contact', 'Status'].map((h) => <th key={h} className="pb-2 text-left font-medium text-gray-500 pr-4">{h}</th>)}</tr></thead>
        <tbody>{sections[kind].slice(0, 20).map(row)}{sections[kind].length === 0 && <tr><td colSpan={4} className="py-3 text-center text-gray-400">None yet.</td></tr>}</tbody>
      </table>
    </Panel>
  );

  return (
    <div data-testid="admin-campus-tab">
      <AdminHeader title="Campus Ecosystem" subtitle="TPOs, student leaders, clubs and ambassadors with a verification queue." />

      <Panel className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-blue-500" />
          <h3 className="text-[14px] font-semibold">Verification queue <span className="text-gray-400 font-normal">({queue.length})</span></h3>
        </div>
        {queue.length === 0 ? <div className="py-3 text-center text-gray-400 text-[13px]">Nothing pending — all items verified.</div> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {queue.map((d) => (
              <div key={d.kind + d.id} className="flex items-center justify-between rounded-xl border border-[#E8EDF8] p-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-blue-500 font-bold">{KIND_LABEL[d.kind]}</div>
                  <div className="text-[13px] font-medium">{nameOf(d)}</div>
                  <div className="text-[12px] text-gray-500">{d.college || d.email || '—'}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStatus(d.kind, d.id, 'verified')} title="Verify" className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white p-1.5"><CheckCircle2 className="w-4 h-4" /></button>
                  <button onClick={() => setStatus(d.kind, d.id, 'rejected')} title="Reject" className="rounded-lg bg-red-50 text-red-500 hover:bg-red-100 p-1.5"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-4">
        {section('tpos', Building2, 'TPOs')}
        {section('leaders', GraduationCap, 'Student leaders')}
        {section('clubs', Users, 'Clubs')}
        {section('ambassadors', Users, 'Ambassadors')}
      </div>
    </div>
  );
}

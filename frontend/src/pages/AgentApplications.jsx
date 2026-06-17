import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';
import {
  FileText, Search, ChevronRight, Loader2, ArrowLeft,
  LogOut, LayoutDashboard, Users,
} from 'lucide-react';
import Pagination from '../components/admin/Pagination';

const STATUS_COLORS = {
  draft: 'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700',
  in_review: 'bg-violet-100 text-violet-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  appointment_scheduled: 'bg-cyan-100 text-cyan-700',
};

const NAV = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, href: '/agent/dashboard' },
  { id: 'students', label: 'Students', icon: Users, href: '/agent/students' },
  { id: 'applications', label: 'Applications', icon: FileText, href: '/agent/applications' },
];

export default function AgentApplications() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const pageSize = 25;

  const token = () => localStorage.getItem('agent_token');

  useEffect(() => {
    if (!token()) { navigate('/agent/login'); return; }
    setLoading(true);
    axios.get(`${API}/agent/applications`, {
      headers: { Authorization: `Bearer ${token()}` },
      params: { status: statusFilter || undefined, search: search || undefined, limit: pageSize, skip },
    }).then(r => { setApps(r.data.items || []); setTotal(r.data.total || 0); }).catch(() => navigate('/agent/login')).finally(() => setLoading(false));
  }, [statusFilter, skip, search, refreshKey]);

  const handleSearch = () => { setSkip(0); setRefreshKey(k => k + 1); };

  const handleLogout = () => { localStorage.removeItem('agent_token'); navigate('/agent/login'); };

  return (
    <div className="min-h-screen bg-[hsl(var(--soft-bg))]">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-black/5 p-6 hidden lg:block">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--accent))] flex items-center justify-center text-white font-bold text-lg">A</div>
          <div><div className="font-bold text-[15px] text-[hsl(var(--blue-900))]">Agent Portal</div></div>
        </div>
        <nav className="space-y-1">
          {NAV.map(item => (
            <Link key={item.id} to={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold transition ${window.location.pathname === item.href ? 'bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]' : 'text-[hsl(var(--blue-900))]/60 hover:bg-[hsl(var(--soft-bg))]'}`}>
              <item.icon className="w-4 h-4" /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-6 left-6 right-6">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[14px] font-bold text-red-500 hover:bg-red-50 transition"><LogOut className="w-4 h-4" /> Logout</button>
        </div>
      </aside>

      <main className="lg:ml-64 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/agent/dashboard" className="w-10 h-10 rounded-xl bg-white border border-black/5 flex items-center justify-center hover:bg-gray-50 transition">
            <ArrowLeft className="w-5 h-5 text-[hsl(var(--blue-700))]" />
          </Link>
          <div>
            <h1 className="font-display font-extrabold text-[24px] text-[hsl(var(--blue-900))]">Applications ({total})</h1>
            <div className="text-[13px] text-[hsl(var(--blue-900))]/55">All student applications assigned to you</div>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--blue-900))]/40" />
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { handleSearch(); } }} placeholder="Search applications..." className="w-full h-11 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none pl-10 pr-4 text-[14px]" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setSkip(0); }} className="h-11 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px] bg-white">
            <option value="">All Status</option>
            {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" /></div>
        ) : apps.length === 0 ? (
          <div className="rounded-3xl bg-white border border-black/5 p-12 text-center">
            <FileText className="w-12 h-12 text-[hsl(var(--blue-900))]/20 mx-auto" />
            <p className="mt-3 text-[15px] text-[hsl(var(--blue-900))]/40">No applications found</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-white border border-black/5 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[hsl(var(--soft-bg))] text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55">
                    <th className="text-left py-3 px-4">Student</th>
                    <th className="text-left py-3 px-4">Country</th>
                    <th className="text-left py-3 px-4">Visa Type</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map(app => (
                    <tr key={app._id} className="border-t border-black/5 hover:bg-[hsl(var(--soft-bg))] transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[13px] text-[hsl(var(--blue-900))]">{app.applicant?.name || 'Unknown'}</div>
                        <div className="text-[11px] text-[hsl(var(--blue-900))]/50">{app.applicant?.email || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-[13px] text-[hsl(var(--blue-900))]">{app.country || '—'}</td>
                      <td className="py-3 px-4 text-[12px] text-[hsl(var(--blue-900))]/70">{app.visa_type || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-600'}`}>
                          {(app.status || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[12px] text-[hsl(var(--blue-900))]/50">{app.created_at ? new Date(app.created_at).toLocaleDateString() : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > pageSize && <div className="mt-4"><Pagination skip={skip} limit={pageSize} total={total} onPageChange={setSkip} /></div>}
          </>
        )}
      </main>
    </div>
  );
}

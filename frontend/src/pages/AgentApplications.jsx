import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';
import {
  FileText, Search, ChevronRight, Loader2, ArrowLeft,
  LogOut, LayoutDashboard, Users,
} from 'lucide-react';

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

  useEffect(() => {
    const token = localStorage.getItem('agent_token');
    if (!token) { navigate('/agent/login'); return; }
    axios.get(`${API}/agent/applications`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { status: statusFilter || undefined, search: search || undefined },
    }).then(r => setApps(r.data || [])).catch(() => navigate('/agent/login')).finally(() => setLoading(false));
  }, [statusFilter]);

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-[13px] text-[hsl(var(--blue-900))]/55 mb-1">
              <Link to="/agent/dashboard" className="hover:text-[hsl(var(--blue-700))]">Dashboard</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="font-bold text-[hsl(var(--blue-900))]">Applications</span>
            </div>
            <h1 className="font-display font-extrabold text-[24px] text-[hsl(var(--blue-900))]">Applications ({apps.length})</h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--blue-900))]/40" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applications..." className="w-full h-11 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none pl-10 pr-4 text-[14px]" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-11 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px] bg-white">
            <option value="">All statuses</option>
            {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
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
          <div className="rounded-3xl bg-white border border-black/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55">Applicant</th>
                    <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55">Visa Type</th>
                    <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55">Country</th>
                    <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55">Status</th>
                    <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map(app => (
                    <tr key={app._id} className="border-b border-black/5 hover:bg-[hsl(var(--soft-bg))] transition cursor-pointer">
                      <td className="px-5 py-4"><div className="font-bold text-[14px] text-[hsl(var(--blue-900))]">{app.applicant_name || '—'}</div></td>
                      <td className="px-5 py-4 text-[13px] text-[hsl(var(--blue-900))]/70">{app.visa_type || '—'}</td>
                      <td className="px-5 py-4 text-[13px] text-[hsl(var(--blue-900))]/70">{app.country_name || '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-700'}`}>
                          {app.status?.replace('_', ' ') || 'draft'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-[hsl(var(--blue-900))]/55">{app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

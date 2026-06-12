import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';
import {
  LayoutDashboard, Users, FileText, Shield, DollarSign,
  LogOut, ChevronRight, Loader2, Calendar, CheckCircle2,
  Clock, TrendingUp, ArrowRight, Check, X,
} from 'lucide-react';

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/agent/dashboard' },
  { id: 'students', label: 'Students', icon: Users, href: '/agent/students' },
  { id: 'applications', label: 'Applications', icon: FileText, href: '/agent/applications' },
];

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-2xl bg-white border border-black/5 p-5 hover:shadow-lg transition-all">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="mt-3 text-[28px] font-display font-extrabold text-[hsl(var(--blue-900))]">{value}</div>
      <div className="text-[13px] text-[hsl(var(--blue-900))]/60">{label}</div>
    </div>
  );
}

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('agent_token');
    if (!token) { navigate('/agent/login'); return; }
    try { setAgent(JSON.parse(localStorage.getItem('agent_data'))); } catch {}
    axios.get(`${API}/agent/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setData(r.data))
      .catch(() => { localStorage.removeItem('agent_token'); navigate('/agent/login'); })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('agent_token');
    localStorage.removeItem('agent_data');
    navigate('/agent/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--soft-bg))] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" />
      </div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div className="min-h-screen bg-[hsl(var(--soft-bg))]">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-black/5 p-6 hidden lg:block">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--accent))] flex items-center justify-center text-white font-bold text-lg">A</div>
          <div>
            <div className="font-bold text-[15px] text-[hsl(var(--blue-900))]">Agent Portal</div>
            <div className="text-[11px] text-[hsl(var(--blue-900))]/55">{agent?.name || 'Agent'}</div>
          </div>
        </div>

        <nav className="space-y-1">
          {NAV.map(item => (
            <Link
              key={item.id}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold transition ${
                window.location.pathname === item.href
                  ? 'bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]'
                  : 'text-[hsl(var(--blue-900))]/60 hover:bg-[hsl(var(--soft-bg))]'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[14px] font-bold text-red-500 hover:bg-red-50 transition">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      <main className="lg:ml-64 p-6 sm:p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display font-extrabold text-[28px] text-[hsl(var(--blue-900))]">Dashboard</h1>
            <p className="text-[14px] text-[hsl(var(--blue-900))]/60">Welcome back, {agent?.name || 'Agent'}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/agent/login" onClick={handleLogout} className="text-[13px] font-bold text-red-500 hover:underline lg:hidden">Logout</Link>
            <Link to="/" className="text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline">Main site</Link>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Total Students" value={stats.total_students || 0} color="bg-blue-500" />
          <StatCard icon={FileText} label="Applications" value={stats.total_applications || 0} color="bg-emerald-500" />
          <StatCard icon={Clock} label="Pending" value={stats.pending_applications || 0} color="bg-amber-500" />
          <StatCard icon={DollarSign} label="Revenue" value={`₹${(stats.total_revenue || 0).toLocaleString()}`} color="bg-violet-500" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-white border border-black/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[16px] text-[hsl(var(--blue-900))]">Recent Applications</h2>
              <Link to="/agent/applications" className="text-[12px] font-bold text-[hsl(var(--blue-700))] hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {data?.recent_applications?.length > 0 ? (
              <div className="space-y-2">
                {data.recent_applications.slice(0, 5).map(app => (
                  <div key={app._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-[hsl(var(--soft-bg))] transition">
                    <div className="min-w-0">
                      <div className="text-[14px] font-bold text-[hsl(var(--blue-900))] truncate">{app.applicant_name || 'Applicant'}</div>
                      <div className="text-[12px] text-[hsl(var(--blue-900))]/55">{app.visa_type} · {app.country_name}</div>
                    </div>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${
                      app.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      app.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{app.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[14px] text-[hsl(var(--blue-900))]/40">No applications yet</div>
            )}
          </div>

          <div className="rounded-3xl bg-white border border-black/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[16px] text-[hsl(var(--blue-900))]">Quick Links</h2>
            </div>
            <div className="space-y-3">
              {[
                { icon: Users, label: 'Manage Students', desc: 'View and manage your students', href: '/agent/students', color: 'bg-blue-500' },
                { icon: FileText, label: 'View Applications', desc: 'Track all applications', href: '/agent/applications', color: 'bg-emerald-500' },
                { icon: Shield, label: 'Commission & Earnings', desc: `Rate: ${stats.commission_rate || 10}%`, href: '/agent/settings', color: 'bg-amber-500' },
                { icon: Calendar, label: 'Visa Appointments', desc: `${stats.upcoming_appointments || 0} upcoming`, href: '/visa-scheduling', color: 'bg-violet-500' },
              ].map(item => (
                <Link key={item.label} to={item.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[hsl(var(--soft-bg))] transition group">
                  <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center text-white shrink-0`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{item.label}</div>
                    <div className="text-[12px] text-[hsl(var(--blue-900))]/55">{item.desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[hsl(var(--blue-900))]/30 group-hover:text-[hsl(var(--accent))] transition" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

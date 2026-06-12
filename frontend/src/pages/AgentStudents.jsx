import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';
import {
  Users, Search, Plus, ChevronRight, Loader2, LogOut,
  LayoutDashboard, FileText, X, Mail, Phone, MapPin,
} from 'lucide-react';
import { Button } from '../components/ui/button';

const NAV = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, href: '/agent/dashboard' },
  { id: 'students', label: 'Students', icon: Users, href: '/agent/students' },
  { id: 'applications', label: 'Applications', icon: FileText, href: '/agent/applications' },
];

export default function AgentStudents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', country: '', course: '', education_level: '', notes: '' });

  useEffect(() => {
    const token = localStorage.getItem('agent_token');
    if (!token) { navigate('/agent/login'); return; }
    loadStudents();
  }, []);

  const loadStudents = () => {
    const token = localStorage.getItem('agent_token');
    axios.get(`${API}/agent/students`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setStudents(r.data || []))
      .catch(() => navigate('/agent/login'))
      .finally(() => setLoading(false));
  };

  const handleAdd = async () => {
    const token = localStorage.getItem('agent_token');
    await axios.post(`${API}/agent/students`, form, { headers: { Authorization: `Bearer ${token}` } });
    setShowAdd(false);
    setForm({ name: '', email: '', phone: '', country: '', course: '', education_level: '', notes: '' });
    loadStudents();
  };

  const filtered = students.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()));

  const handleLogout = () => { localStorage.removeItem('agent_token'); navigate('/agent/login'); };

  return (
    <div className="min-h-screen bg-[hsl(var(--soft-bg))]">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-black/5 p-6 hidden lg:block">
        <div className="flex items-center gap-3 mb-8"><div className="w-10 h-10 rounded-xl bg-[hsl(var(--accent))] flex items-center justify-center text-white font-bold text-lg">A</div><div><div className="font-bold text-[15px] text-[hsl(var(--blue-900))]">Agent Portal</div></div></div>
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
              <span className="font-bold text-[hsl(var(--blue-900))]">Students</span>
            </div>
            <h1 className="font-display font-extrabold text-[24px] text-[hsl(var(--blue-900))]">Students ({students.length})</h1>
          </div>
          <Button onClick={() => setShowAdd(true)} className="rounded-full btn-accent text-white h-11 px-5 font-bold text-[13px]">
            <Plus className="w-4 h-4 mr-1" /> Add Student
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--blue-900))]/40" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." className="w-full h-11 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none pl-10 pr-4 text-[14px]" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-white border border-black/5 p-12 text-center">
            <Users className="w-12 h-12 text-[hsl(var(--blue-900))]/20 mx-auto" />
            <p className="mt-3 text-[15px] text-[hsl(var(--blue-900))]/40">No students found</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(s => (
              <div key={s._id} className="rounded-2xl bg-white border border-black/5 p-5 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] flex items-center justify-center text-white font-bold text-lg">
                    {s.name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[14px] text-[hsl(var(--blue-900))] truncate">{s.name}</div>
                    <div className="text-[12px] text-[hsl(var(--blue-900))]/55">{s.course || '—'}</div>
                  </div>
                </div>
                <div className="space-y-1.5 text-[12px] text-[hsl(var(--blue-900))]/60">
                  {s.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {s.email}</div>}
                  {s.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {s.phone}</div>}
                  {s.country && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {s.country}</div>}
                </div>
                <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                  <span className="text-[11px] text-[hsl(var(--blue-900))]/40">{s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAdd && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-5" onClick={() => setShowAdd(false)}>
            <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-extrabold text-[22px] text-[hsl(var(--blue-900))]">Add Student</h2>
                <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-[hsl(var(--blue-900))]/50" /></button>
              </div>
              <div className="space-y-4">
                {[
                  { key: 'name', label: 'Full Name', type: 'text' },
                  { key: 'email', label: 'Email', type: 'email' },
                  { key: 'phone', label: 'Phone', type: 'text' },
                  { key: 'country', label: 'Target Country', type: 'text' },
                  { key: 'course', label: 'Course', type: 'text' },
                  { key: 'education_level', label: 'Education Level', type: 'select', options: ['High School', 'Bachelor', 'Master', 'PhD'] },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">{f.label}</label>
                    {f.type === 'select' ? (
                      <select value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full h-11 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px] bg-white">
                        <option value="">Select</option>
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full h-11 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px]" />
                    )}
                  </div>
                ))}
                <div>
                  <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full min-h-[80px] rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none p-4 text-[14px] resize-none"></textarea>
                </div>
                <Button onClick={handleAdd} className="w-full h-12 rounded-full btn-accent text-white font-bold">Add Student</Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

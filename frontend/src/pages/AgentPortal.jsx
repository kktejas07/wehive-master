import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { avatarUrl } from '../lib/avatars';
import {
  LayoutDashboard, Users, DollarSign, BarChart3, Shield,
  Loader2, ChevronRight, Plus, Pencil, Trash2, X, Save,
  Star, TrendingUp, CheckCircle, XCircle, Clock, Award,
  GraduationCap, Globe2, BookOpen, Target, Briefcase,
  ArrowRight, Check, AlertCircle, FileText, Upload, FolderOpen,
} from 'lucide-react';
import { Button } from '../components/ui/button';

const TABS = [
  { id: 'overview',     label: 'Overview',     Icon: LayoutDashboard },
  { id: 'students',     label: 'Students',     Icon: Users },
  { id: 'documents',    label: 'Documents',    Icon: FolderOpen },
  { id: 'commissions',  label: 'Commissions',  Icon: DollarSign },
  { id: 'analytics',    label: 'Analytics',    Icon: BarChart3 },
];

const TIER_CONFIG = {
  bronze:   { color: '#b45309', bg: 'bg-amber-900/20', text: 'text-amber-600', label: 'Bronze Partner' },
  silver:   { color: '#94a3b8', bg: 'bg-slate-200/50', text: 'text-slate-500',  label: 'Silver Partner' },
  gold:     { color: '#f59e0b', bg: 'bg-amber-50',     text: 'text-amber-600',  label: 'Gold Partner' },
  platinum: { color: '#a855f7', bg: 'bg-purple-50',    text: 'text-purple-600', label: 'Platinum Partner' },
};

const COUNTRY_FLAGS = { us: '🇺🇸', uk: '🇬🇧', ca: '🇨🇦', au: '🇦🇺', de: '🇩🇪', fr: '🇫🇷', nl: '🇳🇱', ie: '🇮🇪', sg: '🇸🇬', ch: '🇨🇭', nz: '🇳🇿', jp: '🇯🇵', kr: '🇰🇷' };

// ─── Tier badge ───────────────────────────────────────────────────────────────
function TierBadge({ tier, size = 'sm' }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.bronze;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-bold ${cfg.bg} ${cfg.text} ${size === 'lg' ? 'text-[14px]' : 'text-[11px]'}`}>
      <Award className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />
      {cfg.label}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, Icon, color = '#0a2c8a' }) {
  return (
    <div className="rounded-2xl bg-white border border-black/5 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-[0.16em] font-bold text-[hsl(var(--blue-900))]/55">{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="text-[28px] font-display font-extrabold text-[hsl(var(--blue-900))] tracking-[-0.02em]">{value}</div>
      {sub && <div className="mt-0.5 text-[12px] text-[hsl(var(--blue-900))]/50">{sub}</div>}
    </div>
  );
}

// ─── Registration form ────────────────────────────────────────────────────────
function RegisterForm({ token, onRegistered }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ agency_name: '', city: '', country: 'in', website: '', years_experience: 0 });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async () => {
    if (!form.agency_name.trim()) { toast({ title: 'Agency name is required.' }); return; }
    setSaving(true);
    try {
      const { data } = await axios.post(`${API}/agents/register`, { ...form, years_experience: parseInt(form.years_experience) || 0 }, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: 'Registration submitted!', description: 'An admin will review and activate your account.' });
      onRegistered(data);
    } catch (e) {
      toast({ title: 'Error', description: e?.response?.data?.detail || 'Could not register.' });
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg mx-auto py-16 px-4">
      <div className="rounded-3xl bg-white border border-black/5 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--blue-700))]/10 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-[hsl(var(--blue-700))]" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-[22px] text-[hsl(var(--blue-900))]">Become a Partner Agent</h1>
            <p className="text-[13px] text-[hsl(var(--blue-900))]/55">Manage students, track commissions, and grow your business</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { k: 'agency_name', label: 'Agency / Business Name *', placeholder: 'e.g. Global Study Consultants' },
            { k: 'city', label: 'City', placeholder: 'Mumbai' },
            { k: 'website', label: 'Website (optional)', placeholder: 'https://youragency.com' },
          ].map(({ k, label, placeholder }) => (
            <label key={k} className="block">
              <span className="block text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-1">{label}</span>
              <input value={form[k]} onChange={set(k)} placeholder={placeholder}
                className="w-full h-11 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px] font-medium text-[hsl(var(--blue-900))]" />
            </label>
          ))}
          <label className="block">
            <span className="block text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-1">Years of Experience</span>
            <input type="number" min="0" value={form.years_experience} onChange={set('years_experience')}
              className="w-full h-11 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px] font-medium text-[hsl(var(--blue-900))]" />
          </label>
          <Button onClick={onSubmit} disabled={saving} className="w-full mt-2 h-12 rounded-full btn-primary text-white font-bold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register as Partner Agent'}
          </Button>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[['6%–12%', 'Commission Rate'], ['Bronze→Platinum', 'Tier Rewards'], ['Real-time', 'Analytics']].map(([v, l]) => (
            <div key={l} className="rounded-xl bg-[hsl(var(--soft-bg))] p-3 text-center">
              <div className="text-[16px] font-display font-extrabold text-[hsl(var(--blue-700))]">{v}</div>
              <div className="text-[10.5px] text-[hsl(var(--blue-900))]/55 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab({ agent, summary, token }) {
  const tier = summary?.tier || 'bronze';
  const tierCfg = TIER_CONFIG[tier];
  const nextThreshold = summary?.next_tier_threshold;
  const progress = summary?.progress_pct ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-900))] p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-white/60 mb-1">Partner Agency</div>
              <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em]">{agent.agency_name}</h2>
              <p className="text-[13px] text-white/65 mt-1">{agent.city}{agent.city && agent.country ? ' · ' : ''}{(agent.country || '').toUpperCase()}</p>
            </div>
            <TierBadge tier={tier} size="lg" />
          </div>
          {nextThreshold && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-[12px] text-white/65 mb-1.5">
                <span>{summary.successful_applications} successful applications</span>
                <span>Next: {summary.next_tier} at {nextThreshold}</span>
              </div>
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={agent.total_students || 0} Icon={Users} color="#0a2c8a" />
        <StatCard label="Applications" value={agent.total_applications || 0} Icon={FileText} color="#7c3aed" />
        <StatCard label="Success Rate" value={agent.total_applications ? `${Math.round((agent.successful_applications || 0) / agent.total_applications * 100)}%` : '—'} Icon={TrendingUp} color="#059669" />
        <StatCard label="Commission Earned" value={`₹${((summary?.total_earned_inr || 0) / 1000).toFixed(0)}K`} sub={`${summary?.commission_rate_pct || 6}% rate`} Icon={DollarSign} color="#d97706" />
      </div>

      {agent.status === 'pending' && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-800 text-[14px]">Account Under Review</div>
            <div className="text-[13px] text-amber-700 mt-0.5">Your agent registration is being reviewed by our team. You'll be notified once approved.</div>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: Users, title: 'Add a Student', desc: 'Add a new student to your roster and start tracking their application', link: '?tab=students', color: '#0a2c8a' },
          { icon: GraduationCap, title: 'Browse Universities', desc: 'Search 1,000+ partner universities and programs', link: '/universities', color: '#7c3aed' },
          { icon: DollarSign, title: 'View Commissions', desc: 'Track your earnings and check payment status', link: '?tab=commissions', color: '#059669' },
          { icon: BookOpen, title: 'Agent Training', desc: 'Country visa guides, compliance tips, best practices', link: '/agent-training', color: '#0891b2' },
        ].map(({ icon: Icon, title, desc, link, color }) => (
          <Link key={title} to={link}
            className="rounded-2xl bg-white border border-black/5 hover:border-[hsl(var(--blue-700))]/20 p-5 flex flex-col gap-3 group transition">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <div className="font-bold text-[14px] text-[hsl(var(--blue-900))]">{title}</div>
              <div className="text-[12.5px] text-[hsl(var(--blue-900))]/55 mt-0.5">{desc}</div>
            </div>
            <ArrowRight className="w-4 h-4 text-[hsl(var(--blue-900))]/30 group-hover:text-[hsl(var(--blue-700))] transition mt-auto" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Students tab ─────────────────────────────────────────────────────────────
const BLANK_STUDENT = { name: '', email: '', phone: '', nationality: 'in', target_countries: [], target_courses: [], budget_usd: '', intake: '', ielts_score: '', toefl_score: '', gre_score: '', notes: '' };
const COURSE_OPTIONS = ['engineering', 'business', 'medicine', 'law', 'arts', 'stem', 'social'];
const COUNTRY_OPTIONS = [['us','USA'],['uk','UK'],['ca','Canada'],['au','Australia'],['de','Germany'],['fr','France'],['nl','Netherlands'],['ie','Ireland'],['sg','Singapore']];

function StudentForm({ initial, onSave, onCancel, busy }) {
  const [f, setF] = useState({ ...BLANK_STUDENT, ...(initial || {}) });
  const set = (k) => (val) => setF((p) => ({ ...p, [k]: val }));
  const toggleArr = (k, v) => setF((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v] }));

  return (
    <div className="space-y-4 p-5">
      <div className="grid sm:grid-cols-2 gap-3">
        {[['name','Full Name *','text'],['email','Email','email'],['phone','Phone','tel'],['intake','Target Intake (e.g. Sep 2025)','text']].map(([k,label,type]) => (
          <label key={k}>
            <span className="block text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-1">{label}</span>
            <input type={type} value={f[k] || ''} onChange={(e) => set(k)(e.target.value)}
              className="w-full h-10 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-3 text-[13px] font-medium text-[hsl(var(--blue-900))]" />
          </label>
        ))}
        <label>
          <span className="block text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-1">Budget (USD)</span>
          <input type="number" value={f.budget_usd || ''} onChange={(e) => set('budget_usd')(e.target.value)}
            className="w-full h-10 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-3 text-[13px] font-medium text-[hsl(var(--blue-900))]" />
        </label>
        <label>
          <span className="block text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-1">IELTS Score</span>
          <input type="number" step="0.5" min="0" max="9" value={f.ielts_score || ''} onChange={(e) => set('ielts_score')(e.target.value)}
            className="w-full h-10 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-3 text-[13px] font-medium text-[hsl(var(--blue-900))]" />
        </label>
      </div>
      <div>
        <span className="block text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-2">Target Countries</span>
        <div className="flex flex-wrap gap-2">
          {COUNTRY_OPTIONS.map(([code, name]) => (
            <button key={code} type="button" onClick={() => toggleArr('target_countries', code)}
              className={`rounded-full px-3 py-1 text-[12px] font-bold transition ${f.target_countries.includes(code) ? 'bg-[hsl(var(--blue-700))] text-white' : 'bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))]/70'}`}>
              {COUNTRY_FLAGS[code]} {name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="block text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-2">Target Courses</span>
        <div className="flex flex-wrap gap-2">
          {COURSE_OPTIONS.map((c) => (
            <button key={c} type="button" onClick={() => toggleArr('target_courses', c)}
              className={`rounded-full px-3 py-1 text-[12px] font-bold capitalize transition ${f.target_courses.includes(c) ? 'bg-[hsl(var(--blue-700))] text-white' : 'bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))]/70'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <label>
        <span className="block text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-1">Notes</span>
        <textarea value={f.notes || ''} onChange={(e) => set('notes')(e.target.value)} rows={2}
          className="w-full rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-3 py-2 text-[13px] resize-none text-[hsl(var(--blue-900))]" />
      </label>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy} className="rounded-full h-10 px-5 font-bold"><X className="w-3.5 h-3.5 mr-1" />Cancel</Button>
        <Button onClick={() => onSave(f)} disabled={busy || !f.name.trim()} className="rounded-full h-10 px-5 font-bold btn-primary text-white">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1" />Save</>}
        </Button>
      </div>
    </div>
  );
}

function StudentsTab({ token }) {
  const { toast } = useToast();
  const [students, setStudents] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const hdrs = { Authorization: `Bearer ${token}` };

  const load = useCallback(() => {
    axios.get(`${API}/agents/me/students`, { headers: hdrs }).then(r => setStudents(r.data)).catch(() => setStudents([]));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const save = async (form, id) => {
    setBusy(true);
    try {
      const payload = { ...form, budget_usd: parseInt(form.budget_usd) || null, ielts_score: parseFloat(form.ielts_score) || null, gre_score: parseInt(form.gre_score) || null };
      if (id) await axios.put(`${API}/agents/me/students/${id}`, payload, { headers: hdrs });
      else await axios.post(`${API}/agents/me/students`, payload, { headers: hdrs });
      toast({ title: id ? 'Student updated' : 'Student added' });
      setAdding(false); setEditing(null); load();
    } catch (e) { toast({ title: 'Error', description: e?.response?.data?.detail || 'Please try again.' }); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this student?')) return;
    try { await axios.delete(`${API}/agents/me/students/${id}`, { headers: hdrs }); load(); }
    catch { toast({ title: 'Could not remove student.' }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-extrabold text-[24px] text-[hsl(var(--blue-900))]">Student Roster</h2>
          <p className="text-[13px] text-[hsl(var(--blue-900))]/55">{students?.length || 0} students in your portfolio</p>
        </div>
        {!adding && !editing && (
          <Button onClick={() => setAdding(true)} className="rounded-full btn-primary text-white h-10 px-5 font-bold text-[13px]">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Student
          </Button>
        )}
      </div>

      {adding && (
        <div className="rounded-2xl bg-white border border-[hsl(var(--blue-700))]/20 overflow-hidden">
          <div className="px-5 py-3 border-b border-black/5 font-bold text-[14px] text-[hsl(var(--blue-900))]">New Student</div>
          <StudentForm onSave={(f) => save(f, null)} onCancel={() => setAdding(false)} busy={busy} />
        </div>
      )}

      {!students && <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blue-700))]" />}
      {students?.length === 0 && !adding && (
        <div className="rounded-2xl bg-white border border-dashed border-black/15 p-12 text-center">
          <Users className="w-8 h-8 text-[hsl(var(--blue-900))]/20 mx-auto mb-3" />
          <div className="font-bold text-[18px] text-[hsl(var(--blue-900))]">No students yet</div>
          <p className="text-[13px] text-[hsl(var(--blue-900))]/55 mt-1">Add your first student to start managing applications.</p>
        </div>
      )}

      {students?.map((s) => (
        <div key={s.id} className="rounded-2xl bg-white border border-black/5 overflow-hidden">
          {editing === s.id ? (
            <>
              <div className="px-5 py-3 border-b border-black/5 font-bold text-[14px] text-[hsl(var(--blue-900))]">Edit Student</div>
              <StudentForm initial={s} onSave={(f) => save(f, s.id)} onCancel={() => setEditing(null)} busy={busy} />
            </>
          ) : (
            <div className="p-5 flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-[hsl(var(--blue-700))]/10 flex items-center justify-center font-bold text-[hsl(var(--blue-700))] text-[16px] shrink-0">
                {(s.name || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15px] text-[hsl(var(--blue-900))]">{s.name}</div>
                <div className="text-[12px] text-[hsl(var(--blue-900))]/55 mt-0.5">{s.email || s.phone || '—'}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(s.target_countries || []).map(c => <span key={c} className="text-[11px] font-bold rounded-full bg-[hsl(var(--soft-bg))] px-2 py-0.5">{COUNTRY_FLAGS[c]} {c.toUpperCase()}</span>)}
                  {s.intake && <span className="text-[11px] font-bold rounded-full bg-[hsl(var(--soft-bg))] px-2 py-0.5">{s.intake}</span>}
                  {s.ielts_score && <span className="text-[11px] font-bold rounded-full bg-blue-50 text-blue-700 px-2 py-0.5">IELTS {s.ielts_score}</span>}
                  {s.budget_usd && <span className="text-[11px] font-bold rounded-full bg-green-50 text-green-700 px-2 py-0.5">Budget ${s.budget_usd.toLocaleString()}</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditing(s.id)} className="w-8 h-8 rounded-lg hover:bg-[hsl(var(--soft-bg))] flex items-center justify-center text-[hsl(var(--blue-900))]/40 hover:text-[hsl(var(--blue-700))] transition">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(s.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-[hsl(var(--blue-900))]/40 hover:text-red-500 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Documents tab ────────────────────────────────────────────────────────────
const DOC_TYPES = ['Passport', 'IELTS Certificate', 'Transcripts', 'Offer Letter', 'Financial Proof', 'SOP', 'LOR', 'Other'];

function DocumentsTab({ token }) {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ type: 'Passport', note: '' });

  useEffect(() => {
    axios.get(`${API}/agent/students`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setStudents(r.data || []))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!selectedStudent) return;
    axios.get(`${API}/agent/students/${selectedStudent}/documents`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setDocs(r.data || []))
      .catch(() => setDocs([]));
  }, [selectedStudent, token]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudent) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('doc_type', form.type);
    fd.append('note', form.note);
    try {
      const res = await axios.post(`${API}/agent/students/${selectedStudent}/documents`, fd,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
      setDocs(d => [res.data, ...d]);
      toast({ title: 'Document uploaded', description: `${form.type} added successfully` });
    } catch {
      toast({ title: 'Upload failed', description: 'Please try again or check file size.' });
    } finally { setUploading(false); }
  };

  const STATUS_COLOR = { pending: 'text-amber-500', verified: 'text-emerald-500', rejected: 'text-red-400' };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FolderOpen className="w-5 h-5 text-[hsl(var(--accent))]" />
        <h3 className="font-bold text-[18px] text-slate-800">Document Centre</h3>
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500 mb-1.5">Select Student</label>
        <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
          className="w-full sm:w-72 h-10 rounded-xl border border-black/10 bg-white px-3 text-[13.5px] text-slate-800 outline-none">
          <option value="">— Choose student —</option>
          {students.map(s => <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>)}
        </select>
      </div>

      {selectedStudent && (
        <div className="rounded-2xl border border-black/8 p-5 space-y-4">
          <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-500">Upload Document</div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <div className="text-[10.5px] font-bold text-slate-500 mb-1">Document Type</div>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="h-9 rounded-xl border border-black/10 bg-white px-3 text-[13px] text-slate-800 outline-none">
                {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <div className="text-[10.5px] font-bold text-slate-500 mb-1">Note (optional)</div>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Band score 7.0"
                className="w-full h-9 rounded-xl border border-black/10 px-3 text-[13px] text-slate-800 outline-none" />
            </div>
            <label className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-bold text-[13px] cursor-pointer transition ${uploading ? 'bg-slate-100 text-slate-400' : 'bg-[hsl(var(--accent))] text-white hover:opacity-90'}`}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Uploading…' : 'Upload File'}
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
            </label>
          </div>

          {docs.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-[14px]">No documents yet for this student.</div>
          )}
          {docs.length > 0 && (
            <table className="w-full text-[13px]">
              <thead><tr className="border-b border-black/8">
                <th className="text-left text-[10.5px] uppercase tracking-[0.12em] font-bold text-slate-400 py-2 pr-3">Type</th>
                <th className="text-left py-2 pr-3 text-slate-400 font-bold text-[10.5px] uppercase tracking-[0.12em]">File</th>
                <th className="text-left py-2 pr-3 text-slate-400 font-bold text-[10.5px] uppercase tracking-[0.12em]">Status</th>
                <th className="text-left py-2 text-slate-400 font-bold text-[10.5px] uppercase tracking-[0.12em]">Uploaded</th>
              </tr></thead>
              <tbody>
                {docs.map((d, i) => (
                  <tr key={d._id || i} className="border-b border-black/5">
                    <td className="py-2.5 pr-3 font-bold text-slate-700">{d.doc_type || d.type}</td>
                    <td className="py-2.5 pr-3">
                      {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--accent))] font-bold hover:underline flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{d.filename || 'View'}</a> : <span className="text-slate-400">{d.filename || 'File'}</span>}
                    </td>
                    <td className={`py-2.5 pr-3 font-bold capitalize ${STATUS_COLOR[d.status] || 'text-slate-500'}`}>{d.status || 'pending'}</td>
                    <td className="py-2.5 text-slate-400 text-[11.5px]">{d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Commissions tab ──────────────────────────────────────────────────────────
function CommissionsTab({ token }) {
  const [commissions, setCommissions] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const hdrs = { Authorization: `Bearer ${token}` };
    axios.get(`${API}/agents/me/commissions`, { headers: hdrs }).then(r => setCommissions(r.data)).catch(() => setCommissions([]));
    axios.get(`${API}/agents/me/commissions/summary`, { headers: hdrs }).then(r => setSummary(r.data)).catch(() => {});
  }, [token]);

  const STATUS_BADGE = {
    paid: 'bg-green-50 text-green-700',
    approved: 'bg-blue-50 text-blue-700',
    pending: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="space-y-5">
      <h2 className="font-display font-extrabold text-[24px] text-[hsl(var(--blue-900))]">Commissions & Earnings</h2>
      {summary && (
        <>
          <div className="rounded-2xl bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-900))] p-6 text-white flex flex-wrap gap-6 items-center">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/60 mb-1">Total Earned</div>
              <div className="text-[36px] font-display font-extrabold tracking-[-0.02em]">₹{(summary.total_earned_inr || 0).toLocaleString()}</div>
            </div>
            <div className="border-l border-white/20 pl-6">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/60 mb-1">Pending</div>
              <div className="text-[28px] font-display font-extrabold">₹{(summary.pending_inr || 0).toLocaleString()}</div>
            </div>
            <div className="border-l border-white/20 pl-6 ml-auto">
              <TierBadge tier={summary.tier} size="lg" />
              <div className="text-[12px] text-white/60 mt-1">{summary.commission_rate_pct}% commission rate</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[['Successful', summary.successful_applications, CheckCircle, '#059669'], ['Rate', `${summary.commission_rate_pct}%`, TrendingUp, '#7c3aed'], ['Next Tier', summary.next_tier ? `${summary.next_tier_threshold - summary.successful_applications} more` : 'Max', Award, '#d97706']].map(([l, v, Icon, c]) => (
              <div key={l} className="rounded-2xl bg-white border border-black/5 p-4 text-center">
                <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: c }} />
                <div className="text-[22px] font-display font-extrabold text-[hsl(var(--blue-900))]">{v}</div>
                <div className="text-[11px] text-[hsl(var(--blue-900))]/55">{l}</div>
              </div>
            ))}
          </div>
        </>
      )}
      {!commissions && <Loader2 className="w-5 h-5 animate-spin" />}
      {commissions?.length === 0 && <div className="rounded-2xl bg-white border border-dashed border-black/15 p-10 text-center text-[hsl(var(--blue-900))]/55 text-[14px]">No commissions recorded yet. Commissions appear when an admin marks an application successful.</div>}
      {commissions?.length > 0 && (
        <div className="rounded-2xl bg-white border border-black/5 overflow-hidden">
          <div className="divide-y divide-black/5">
            {commissions.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0"><DollarSign className="w-5 h-5 text-green-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[14px] text-[hsl(var(--blue-900))]">{c.university_name}</div>
                  <div className="text-[12px] text-[hsl(var(--blue-900))]/55">{c.commission_type} · {new Date(c.created_at).toLocaleDateString()}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-[15px] text-[hsl(var(--blue-900))]">₹{c.amount_inr?.toLocaleString()}</div>
                  <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${STATUS_BADGE[c.status] || 'bg-slate-50 text-slate-500'}`}>{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Analytics tab ────────────────────────────────────────────────────────────
function AnalyticsTab({ token }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    axios.get(`${API}/agents/me/analytics`, { headers: { Authorization: `Bearer ${token}` } }).then(r => setData(r.data)).catch(() => {});
  }, [token]);

  if (!data) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blue-700))]" /></div>;

  const { overview, pipeline, monthly_trend, top_countries } = data;
  const pipelineColors = { draft: '#94a3b8', submitted: '#3b82f6', in_review: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };
  const pipelineTotal = Object.values(pipeline).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6">
      <h2 className="font-display font-extrabold text-[24px] text-[hsl(var(--blue-900))]">Analytics</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[['Total Students', overview.total_students, Users, '#0a2c8a'], ['Applications', overview.total_applications, FileText, '#7c3aed'], ['Success Rate', `${overview.success_rate_pct}%`, TrendingUp, '#059669'], ['Tier', overview.tier, Award, '#d97706']].map(([l, v, Icon, c]) => (
          <StatCard key={l} label={l} value={v} Icon={Icon} color={c} />
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white border border-black/5 p-5">
          <div className="font-bold text-[14px] text-[hsl(var(--blue-900))] mb-4">Application Pipeline</div>
          {Object.keys(pipeline).length === 0 ? <div className="text-[13px] text-[hsl(var(--blue-900))]/50">No applications yet</div> : (
            <div className="space-y-2.5">
              {Object.entries(pipeline).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <div className="text-[12px] font-bold capitalize text-[hsl(var(--blue-900))]/70 w-24 shrink-0">{status.replace('_', ' ')}</div>
                  <div className="flex-1 h-2 rounded-full bg-[hsl(var(--soft-bg))] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(count / pipelineTotal) * 100}%`, background: pipelineColors[status] || '#94a3b8' }} />
                  </div>
                  <div className="text-[12px] font-bold text-[hsl(var(--blue-900))] w-6 shrink-0">{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-black/5 p-5">
          <div className="font-bold text-[14px] text-[hsl(var(--blue-900))] mb-4">Top Countries</div>
          {top_countries.length === 0 ? <div className="text-[13px] text-[hsl(var(--blue-900))]/50">No data yet</div> : (
            <div className="space-y-2.5">
              {top_countries.map(({ country, total, successful }) => (
                <div key={country} className="flex items-center gap-3">
                  <span className="text-xl shrink-0">{COUNTRY_FLAGS[country] || '🌍'}</span>
                  <div className="flex-1">
                    <div className="text-[12px] font-bold text-[hsl(var(--blue-900))] capitalize">{country.toUpperCase()}</div>
                    <div className="text-[11px] text-[hsl(var(--blue-900))]/50">{successful}/{total} successful</div>
                  </div>
                  <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">{total ? Math.round(successful / total * 100) : 0}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-black/5 p-5">
        <div className="font-bold text-[14px] text-[hsl(var(--blue-900))] mb-4">Monthly Trend</div>
        {monthly_trend.length === 0 ? <div className="text-[13px] text-[hsl(var(--blue-900))]/50">No commission data in the last 6 months.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead><tr className="border-b border-black/5">{['Month','Applications','Successful','Commission (₹)'].map(h => <th key={h} className="pb-2 text-left font-bold text-[hsl(var(--blue-900))]/55 pr-4">{h}</th>)}</tr></thead>
              <tbody>
                {monthly_trend.map(row => (
                  <tr key={row.month} className="border-b border-black/5 last:border-0">
                    <td className="py-2.5 font-bold text-[hsl(var(--blue-900))] pr-4">{row.month}</td>
                    <td className="py-2.5 text-[hsl(var(--blue-900))]/70 pr-4">{row.applications}</td>
                    <td className="py-2.5 text-[hsl(var(--blue-900))]/70 pr-4">{row.successful}</td>
                    <td className="py-2.5 font-bold text-green-700">₹{row.commissions?.toLocaleString() || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shell nav ────────────────────────────────────────────────────────────────
function TabNav({ value, onChange }) {
  return (
    <nav className="sticky top-24 space-y-1">
      {TABS.map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <button key={id} onClick={() => onChange(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold transition ${active ? 'bg-[hsl(var(--blue-700))] text-white' : 'text-[hsl(var(--blue-900))]/70 hover:bg-[hsl(var(--soft-bg))]'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AgentPortal() {
  const { user, token, isAuthed, loading } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';

  const [agent, setAgent] = useState(null);
  const [summary, setSummary] = useState(null);
  const [agentLoading, setAgentLoading] = useState(true);

  useEffect(() => { if (!loading && !isAuthed) navigate('/login', { replace: true }); }, [loading, isAuthed, navigate]);

  const loadAgent = useCallback(() => {
    if (!token) return;
    axios.get(`${API}/agents/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { setAgent(r.data); return axios.get(`${API}/agents/me/commissions/summary`, { headers: { Authorization: `Bearer ${token}` } }); })
      .then(r => setSummary(r.data))
      .catch(() => setAgent(null))
      .finally(() => setAgentLoading(false));
  }, [token]);

  useEffect(() => { loadAgent(); }, [loadAgent]);

  if (loading || agentLoading) {
    return (
      <div className="bg-white min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="bg-[hsl(var(--soft-bg))] min-h-screen">
        <Navbar />
        <RegisterForm token={token} onRegistered={(data) => { setAgent(data); setAgentLoading(false); }} />
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-white">
      <Navbar />
      <main className="pt-28 pb-16 bg-[hsl(var(--soft-bg))] min-h-[80vh]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-3">
            <div className="rounded-2xl bg-white border border-black/5 p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[hsl(var(--blue-700))]/10 flex items-center justify-center font-bold text-[hsl(var(--blue-700))] text-[16px]">
                  {(agent.agency_name || 'A')[0]}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold truncate text-[hsl(var(--blue-900))]">{agent.agency_name}</div>
                  <TierBadge tier={summary?.tier || agent.tier || 'bronze'} />
                </div>
              </div>
            </div>
            <TabNav value={tab} onChange={(t) => setParams({ tab: t })} />
          </aside>
          <section className="lg:col-span-9">
            <div className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8 min-h-[420px]">
              {tab === 'overview'    && <OverviewTab agent={agent} summary={summary} token={token} />}
              {tab === 'students'   && <StudentsTab token={token} />}
              {tab === 'documents'  && <DocumentsTab token={token} />}
              {tab === 'commissions'&& <CommissionsTab token={token} />}
              {tab === 'analytics'  && <AnalyticsTab token={token} />}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

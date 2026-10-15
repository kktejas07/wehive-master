import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import {
  LayoutDashboard, Users, DollarSign, BarChart3,
  Loader2, Plus, X, Save,
  TrendingUp, CheckCircle, Clock, Award,
  GraduationCap, BookOpen,
  ArrowRight, AlertCircle, FileText, Upload, FolderOpen, Globe,
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
  bronze:   { bg: 'bg-orange-50',  text: 'text-orange-800', label: 'Bronze Partner' },
  silver:   { bg: 'bg-slate-100',  text: 'text-slate-700',  label: 'Silver Partner' },
  gold:     { bg: 'bg-amber-50',   text: 'text-amber-800',  label: 'Gold Partner' },
  platinum: { bg: 'bg-[hsl(var(--blue-50))]', text: 'text-[hsl(var(--blue-700))]', label: 'Platinum Partner' },
};

const COUNTRY_FLAGS = { us: 'US', uk: 'UK', ca: 'CA', au: 'AU', de: 'DE', fr: 'FR', nl: 'NL', ie: 'IE', sg: 'SG', ch: 'CH', nz: 'NZ', jp: 'JP', kr: 'KR' };

// ─── Tier badge ───────────────────────────────────────────────────────────────
function TierBadge({ tier, size = 'sm' }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.bronze;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold whitespace-nowrap ${cfg.bg} ${cfg.text} ${size === 'lg' ? 'text-[14px]' : 'text-[12px]'}`}>
      <Award className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />
      {cfg.label}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, Icon }) {
  return (
    <div className="rounded-2xl bg-white border border-border shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-[13px] font-medium text-muted-foreground leading-snug">{label}</span>
        <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center bg-[hsl(var(--blue-50))]">
          <Icon className="w-4 h-4 text-[hsl(var(--blue-700))]" />
        </div>
      </div>
      <div className="text-[28px] leading-tight font-display font-bold tabular-nums text-[hsl(var(--blue-900))] tracking-[-0.02em]">{value}</div>
      {sub && <div className="mt-0.5 text-[12px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab({ agent, summary, stats }) {
  const tier = summary?.tier || 'bronze';
  const tierCfg = TIER_CONFIG[tier];
  const nextThreshold = summary?.next_tier_threshold;
  const progress = summary?.progress_pct ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[hsl(var(--blue-900))] p-5 sm:p-7 text-white">
        <div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-white/75 mb-1">Partner Agency</div>
              <h2 className="font-display font-bold text-[24px] sm:text-[28px] tracking-[-0.02em]">{agent.agency_name}</h2>
              <p className="text-[13px] text-white/75 mt-1">{agent.city}{agent.city && agent.country ? ' · ' : ''}{(agent.country || '').toUpperCase()}</p>
            </div>
            <TierBadge tier={tier} size="lg" />
          </div>
          {nextThreshold && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-[12px] text-white/75 mb-1.5">
                <span>{summary.successful_applications} successful applications</span>
                <span>Next: {summary.next_tier} at {nextThreshold}</span>
              </div>
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full bg-[hsl(var(--blue-100))] transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total students" value={stats?.total_students || 0} Icon={Users} />
        <StatCard label="Applications" value={stats?.total_applications || 0} Icon={FileText} />
        <StatCard label="Success Rate" value={stats?.total_applications ? `${Math.round((stats.approved_applications || 0) / stats.total_applications * 100)}%` : '—'} Icon={TrendingUp} />
        <StatCard label="Commission earned" value={`₹${((summary?.total_earned_inr || 0) / 1000).toFixed(0)}K`} sub={`${summary?.commission_rate_pct || 6}% rate`} Icon={DollarSign} />
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

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {[
          { icon: Users, title: 'Add a Student', desc: 'Add a new student to your roster and start tracking their application', link: '?tab=students' },
          { icon: GraduationCap, title: 'Browse Universities', desc: 'Search 1,000+ partner universities and programs', link: '/universities' },
          { icon: DollarSign, title: 'View Commissions', desc: 'Track your earnings and check payment status', link: '?tab=commissions' },
          { icon: BookOpen, title: 'Agent Training', desc: 'Country visa guides, compliance tips, best practices', link: '/agent-training' },
        ].map(({ icon: Icon, title, desc, link }) => (
          <Link key={title} to={link}
            className="rounded-2xl bg-white border border-border shadow-sm hover:border-[hsl(var(--blue-700))]/30 hover:shadow-md p-5 flex flex-col gap-3 group transition duration-200">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[hsl(var(--blue-50))]">
              <Icon className="w-5 h-5 text-[hsl(var(--blue-700))]" />
            </div>
            <div>
              <div className="font-bold text-[14px] text-[hsl(var(--blue-900))]">{title}</div>
              <div className="text-[12.5px] text-muted-foreground mt-0.5">{desc}</div>
            </div>
            <ArrowRight className="w-4 h-4 text-[hsl(var(--blue-900))]/30 group-hover:text-[hsl(var(--blue-700))] transition mt-auto" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Students tab ─────────────────────────────────────────────────────────────
// Backend (POST /api/agent/students) stores: name, email, phone, country, course, education_level, notes.
const BLANK_STUDENT = { name: '', email: '', phone: '', education_level: '', target_countries: [], target_courses: [], notes: '' };
const COURSE_OPTIONS = ['engineering', 'business', 'medicine', 'law', 'arts', 'stem', 'social'];
const COUNTRY_OPTIONS = [['us','USA'],['uk','UK'],['ca','Canada'],['au','Australia'],['de','Germany'],['fr','France'],['nl','Netherlands'],['ie','Ireland'],['sg','Singapore']];

function StudentForm({ onSave, onCancel, busy }) {
  const [f, setF] = useState(BLANK_STUDENT);
  const set = (k) => (val) => setF((p) => ({ ...p, [k]: val }));
  const toggleArr = (k, v) => setF((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v] }));

  return (
    <div className="space-y-4 p-5">
      <div className="grid sm:grid-cols-2 gap-3">
        {[['name','Full Name *','text'],['email','Email','email'],['phone','Phone','tel'],['education_level','Education Level','text']].map(([k,label,type]) => (
          <label key={k}>
            <span className="block text-[13px] font-semibold text-[hsl(var(--blue-900))] mb-1.5">{label}</span>
            <input type={type} value={f[k] || ''} onChange={(e) => set(k)(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 focus:border-[hsl(var(--blue-700))] outline-none px-3 text-[14px] text-[hsl(var(--blue-900))]" />
          </label>
        ))}
      </div>
      <div>
        <span className="block text-[13px] font-semibold text-[hsl(var(--blue-900))] mb-1.5">Target Countries</span>
        <div className="flex flex-wrap gap-2">
          {COUNTRY_OPTIONS.map(([code, name]) => (
            <button key={code} type="button" onClick={() => toggleArr('target_countries', code)}
              className={`rounded-full px-3.5 min-h-[36px] text-[13px] font-semibold transition ${f.target_countries.includes(code) ? 'bg-[hsl(var(--blue-700))] text-white' : 'bg-[hsl(var(--soft-bg))] text-muted-foreground'}`}>
              {COUNTRY_FLAGS[code]} {name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="block text-[13px] font-semibold text-[hsl(var(--blue-900))] mb-1.5">Target Courses</span>
        <div className="flex flex-wrap gap-2">
          {COURSE_OPTIONS.map((c) => (
            <button key={c} type="button" onClick={() => toggleArr('target_courses', c)}
              className={`rounded-full px-3.5 min-h-[36px] text-[13px] font-semibold capitalize transition ${f.target_courses.includes(c) ? 'bg-[hsl(var(--blue-700))] text-white' : 'bg-[hsl(var(--soft-bg))] text-muted-foreground'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <label>
        <span className="block text-[13px] font-semibold text-[hsl(var(--blue-900))] mb-1.5">Notes</span>
        <textarea value={f.notes || ''} onChange={(e) => set('notes')(e.target.value)} rows={2}
          className="w-full rounded-xl border border-slate-300 focus:border-[hsl(var(--blue-700))] outline-none px-3 py-2.5 text-[14px] resize-none text-[hsl(var(--blue-900))]" />
      </label>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy} className="rounded-xl h-11 px-5 font-bold"><X className="w-3.5 h-3.5 mr-1" />Cancel</Button>
        <Button onClick={() => onSave(f)} disabled={busy || !f.name.trim()} className="rounded-xl h-11 px-5 font-bold btn-primary text-white">
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
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    axios.get(`${API}/agent/students`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setStudents(r.data?.items || []))
      .catch(() => setStudents([]));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const save = async (form) => {
    setBusy(true);
    try {
      const payload = {
        name: form.name, email: form.email, phone: form.phone, education_level: form.education_level, notes: form.notes,
        country: form.target_countries.join(', '), course: form.target_courses.join(', '),
      };
      await axios.post(`${API}/agent/students`, payload, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: 'Student added' });
      setAdding(false); load();
    } catch (e) { toast({ title: 'Error', description: e?.response?.data?.detail || 'Please try again.' }); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-[24px] sm:text-[28px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">Student Roster</h2>
          <p className="text-[13px] text-muted-foreground">{students?.length || 0} students in your portfolio</p>
        </div>
        {!adding && (
          <Button onClick={() => setAdding(true)} className="rounded-xl btn-primary text-white h-11 px-5 font-bold text-[13px]">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Student
          </Button>
        )}
      </div>

      {adding && (
        <div className="rounded-2xl bg-white border border-[hsl(var(--blue-700))]/20 overflow-hidden">
          <div className="px-5 py-3 border-b border-border font-bold text-[14px] text-[hsl(var(--blue-900))]">New Student</div>
          <StudentForm onSave={save} onCancel={() => setAdding(false)} busy={busy} />
        </div>
      )}

      {!students && <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blue-700))]" />}
      {students?.length === 0 && !adding && (
        <div className="rounded-2xl bg-[hsl(var(--soft-bg))] border border-dashed border-slate-300 p-8 sm:p-12 text-center">
          <Users className="w-8 h-8 text-[hsl(var(--blue-900))]/20 mx-auto mb-3" />
          <div className="font-bold text-[18px] text-[hsl(var(--blue-900))]">No students yet</div>
          <p className="text-[13px] text-muted-foreground mt-1">Add your first student to start managing applications.</p>
        </div>
      )}

      {students?.map((s) => (
        <div key={s._id || s.id} className="rounded-2xl bg-white border border-border overflow-hidden">
          <div className="p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-[hsl(var(--blue-700))]/10 flex items-center justify-center font-bold text-[hsl(var(--blue-700))] text-[16px] shrink-0">
              {(s.name || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[15px] text-[hsl(var(--blue-900))]">{s.name}</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">{s.email || s.phone || '—'}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.country && <span className="text-[12px] font-semibold rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 uppercase">{s.country}</span>}
                {s.course && <span className="text-[12px] font-semibold rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 capitalize">{s.course}</span>}
                {s.education_level && <span className="text-[12px] font-semibold rounded-full bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] px-2 py-0.5">{s.education_level}</span>}
              </div>
            </div>
          </div>
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
      .then(r => setStudents(r.data?.items || []))
      .catch(() => toast({ title: 'Could not load students', description: 'Please refresh and try again.' }));
  }, [token, toast]);

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

  const STATUS_COLOR = { pending: 'bg-amber-100 text-amber-800', verified: 'bg-emerald-100 text-emerald-800', rejected: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-[24px] sm:text-[28px] tracking-[-0.02em] text-[hsl(var(--blue-900))] flex items-center gap-2.5">
        <FolderOpen className="w-5 h-5 text-[hsl(var(--blue-700))]" /> Document Centre
      </h2>

      <div>
        <label htmlFor="agent-doc-student" className="block text-[13px] font-semibold text-[hsl(var(--blue-900))] mb-1.5">Select student</label>
        <select id="agent-doc-student" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
          className="w-full sm:w-72 h-11 rounded-xl border border-slate-300 bg-white px-3 text-[14px] text-[hsl(var(--blue-900))] outline-none focus:border-[hsl(var(--blue-700))]">
          <option value="">— Choose student —</option>
          {students.map(s => <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>)}
        </select>
      </div>

      {selectedStudent && (
        <div className="rounded-2xl border border-border bg-[hsl(var(--soft-bg))] p-4 sm:p-5 space-y-4">
          <div className="text-[15px] font-semibold text-[hsl(var(--blue-900))]">Upload document</div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label htmlFor="agent-doc-type" className="block text-[13px] font-semibold text-[hsl(var(--blue-900))] mb-1.5">Document type</label>
              <select id="agent-doc-type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-[14px] text-[hsl(var(--blue-900))] outline-none focus:border-[hsl(var(--blue-700))]">
                {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label htmlFor="agent-doc-note" className="block text-[13px] font-semibold text-[hsl(var(--blue-900))] mb-1.5">Note (optional)</label>
              <input id="agent-doc-note" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Band score 7.0"
                className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3 text-[14px] text-[hsl(var(--blue-900))] outline-none focus:border-[hsl(var(--blue-700))]" />
            </div>
            <label className={`inline-flex items-center gap-2 rounded-xl h-11 px-5 font-semibold text-[14px] cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[hsl(var(--blue-700))] ${uploading ? 'bg-slate-100 text-slate-500' : 'btn-accent text-white'}`}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Uploading…' : 'Upload File'}
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
            </label>
          </div>

          {docs.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-[14px]">No documents yet for this student.</div>
          )}
          {docs.length > 0 && (
            <table className="w-full text-[13px]">
              <thead><tr className="border-b border-border">
                <th className="text-left text-[12px] uppercase tracking-[0.12em] font-bold text-muted-foreground py-2 pr-3">Type</th>
                <th className="text-left py-2 pr-3 text-muted-foreground font-bold text-[12px] uppercase tracking-[0.12em]">File</th>
                <th className="text-left py-2 pr-3 text-muted-foreground font-bold text-[12px] uppercase tracking-[0.12em]">Status</th>
                <th className="text-left py-2 text-muted-foreground font-bold text-[12px] uppercase tracking-[0.12em]">Uploaded</th>
              </tr></thead>
              <tbody>
                {docs.map((d, i) => (
                  <tr key={d._id || i} className="border-b border-border">
                    <td className="py-2.5 pr-3 font-semibold text-[hsl(var(--blue-900))]">{d.doc_type || d.type}</td>
                    <td className="py-2.5 pr-3">
                      {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--blue-700))] font-bold hover:underline flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{d.filename || 'View'}</a> : <span className="text-slate-400">{d.filename || 'File'}</span>}
                    </td>
                    <td className="py-2.5 pr-3"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold capitalize ${STATUS_COLOR[d.status] || 'bg-slate-100 text-slate-700'}`}>{d.status || 'pending'}</span></td>
                    <td className="py-2.5 text-muted-foreground text-[12px]">{d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : '—'}</td>
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
function CommissionsTab({ token, stats }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    axios.get(`${API}/agent/ai/commission-summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setSummary(r.data))
      .catch(() => setSummary({}));
  }, [token]);

  return (
    <div className="space-y-5">
      <h2 className="font-display font-bold text-[24px] sm:text-[28px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">Commissions & Earnings</h2>
      {!summary && <Loader2 className="w-5 h-5 animate-spin" />}
      {summary && (
        <>
          <div className="rounded-2xl bg-[hsl(var(--blue-900))] p-5 sm:p-6 text-white flex flex-wrap gap-x-6 gap-y-4 items-center">
            <div>
              <div className="text-[12px] uppercase tracking-[0.14em] text-white/75 mb-1">Total revenue</div>
              <div className="text-[32px] sm:text-[36px] font-display font-bold tabular-nums tracking-[-0.02em]">₹{(stats?.total_revenue || 0).toLocaleString()}</div>
            </div>
            <div className="border-l border-white/20 pl-6">
              <div className="text-[12px] uppercase tracking-[0.14em] text-white/75 mb-1">Pending</div>
              <div className="text-[28px] font-display font-bold">₹{(summary.pending || 0).toLocaleString()}</div>
            </div>
            <div className="sm:border-l border-white/20 sm:pl-6 sm:ml-auto">
              <div className="text-[13px] text-white/80 mt-1">{stats?.commission_rate ?? '—'}% commission rate</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[['Approved apps', stats?.approved_applications || 0, CheckCircle], ['Paid', `₹${(summary.paid || 0).toLocaleString()}`, DollarSign], ['Earned', `₹${(summary.total_earned || 0).toLocaleString()}`, Award]].map(([l, v, Icon]) => (
              <StatCard key={l} label={l} value={v} Icon={Icon} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Analytics tab ────────────────────────────────────────────────────────────
function AnalyticsTab({ token, stats }) {
  const [apps, setApps] = useState(null);
  useEffect(() => {
    axios.get(`${API}/agent/applications`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setApps(Array.isArray(r.data) ? r.data : []))
      .catch(() => setApps([]));
  }, [token]);

  if (!apps) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blue-700))]" /></div>;

  const pipeline = {};
  const countries = {};
  apps.forEach((a) => {
    const status = a.status || 'draft';
    pipeline[status] = (pipeline[status] || 0) + 1;
    const country = (a.country_id || a.country_name || '').toLowerCase();
    if (country) {
      countries[country] = countries[country] || { country, total: 0, successful: 0 };
      countries[country].total += 1;
      if (status === 'approved') countries[country].successful += 1;
    }
  });
  const top_countries = Object.values(countries).sort((x, y) => y.total - x.total).slice(0, 6);
  const pipelineColors = { draft: 'bg-slate-400', submitted: 'bg-[hsl(var(--blue-700))]', in_review: 'bg-amber-500', approved: 'bg-emerald-600', rejected: 'bg-red-500' };
  const pipelineTotal = Object.values(pipeline).reduce((a, b) => a + b, 0) || 1;
  const successRate = stats?.total_applications ? Math.round((stats.approved_applications || 0) / stats.total_applications * 100) : 0;

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-[24px] sm:text-[28px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">Analytics</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[['Total students', stats?.total_students || 0, Users], ['Applications', stats?.total_applications || 0, FileText], ['Success rate', `${successRate}%`, TrendingUp], ['Upcoming appts', stats?.upcoming_appointments || 0, Award]].map(([l, v, Icon]) => (
          <StatCard key={l} label={l} value={v} Icon={Icon} />
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white border border-border shadow-sm p-5">
          <div className="font-semibold text-[15px] text-[hsl(var(--blue-900))] mb-4">Application pipeline</div>
          {Object.keys(pipeline).length === 0 ? <div className="text-[13px] text-muted-foreground">No applications yet</div> : (
            <div className="space-y-2.5">
              {Object.entries(pipeline).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <div className="text-[12px] font-bold capitalize text-muted-foreground w-24 shrink-0">{status.replace('_', ' ')}</div>
                  <div className="flex-1 h-2 rounded-full bg-[hsl(var(--soft-bg))] overflow-hidden">
                    <div className={`h-full rounded-full ${pipelineColors[status] || 'bg-slate-400'}`} style={{ width: `${(count / pipelineTotal) * 100}%` }} />
                  </div>
                  <div className="text-[12px] font-bold text-[hsl(var(--blue-900))] w-6 shrink-0">{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-border shadow-sm p-5">
          <div className="font-semibold text-[15px] text-[hsl(var(--blue-900))] mb-4">Top countries</div>
          {top_countries.length === 0 ? <div className="text-[13px] text-muted-foreground">No data yet</div> : (
            <div className="space-y-2.5">
              {top_countries.map(({ country, total, successful }) => (
                <div key={country} className="flex items-center gap-3">
                  <span className="text-xl shrink-0">{COUNTRY_FLAGS[country] || <Globe className="w-5 h-5 text-slate-400" />}</span>
                  <div className="flex-1">
                    <div className="text-[12px] font-bold text-[hsl(var(--blue-900))] capitalize">{country.toUpperCase()}</div>
                    <div className="text-[12px] text-muted-foreground">{successful}/{total} successful</div>
                  </div>
                  <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">{total ? Math.round(successful / total * 100) : 0}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shell nav ────────────────────────────────────────────────────────────────
function TabNav({ value, onChange }) {
  return (
    <nav aria-label="Agent portal sections" className="-mx-4 px-4 sm:mx-0 sm:px-0 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible snap-x scroll-px-4 [scrollbar-width:none] pb-1 lg:pb-0 lg:sticky lg:top-24">
      {TABS.map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <button key={id} onClick={() => onChange(id)} aria-current={active ? 'page' : undefined}
            className={`shrink-0 snap-start lg:w-full flex items-center gap-2.5 lg:gap-3 px-3.5 lg:px-4 min-h-[44px] rounded-xl text-[14px] font-semibold whitespace-nowrap transition-colors duration-200 ${active ? 'bg-[hsl(var(--blue-700))] text-white shadow-sm' : 'text-muted-foreground bg-white lg:bg-transparent border border-border lg:border-transparent hover:bg-[hsl(var(--blue-50))] hover:text-[hsl(var(--blue-900))]'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
// Agents authenticate separately from students (see AgentLogin.jsx), so the
// portal uses the agent token, not the student useAuth() token.
const AGENT_TOKEN_KEY = 'agent_token';

export default function AgentPortal() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';

  const [token] = useState(() => localStorage.getItem(AGENT_TOKEN_KEY));
  const [agent, setAgent] = useState(null);
  const [stats, setStats] = useState(null);
  const [agentLoading, setAgentLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(AGENT_TOKEN_KEY);
    localStorage.removeItem('agent_data');
    navigate('/agent/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!token) { navigate('/agent/login', { replace: true }); return; }
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${API}/agent/settings`, { headers }),
      axios.get(`${API}/agent/dashboard`, { headers }),
    ])
      .then(([s, d]) => { setAgent(s.data); setStats(d.data?.stats || null); })
      .catch((e) => { if ([401, 403].includes(e?.response?.status)) logout(); })
      .finally(() => setAgentLoading(false));
  }, [token, navigate, logout]);

  if (!token || agentLoading) {
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
        <div className="max-w-lg mx-auto py-32 px-4 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-500" />
          <div className="font-bold text-[18px] text-[hsl(var(--blue-900))]">Could not load the agent portal</div>
          <p className="text-[13px] text-muted-foreground mt-1">Please check your connection and try again.</p>
          <Button onClick={logout} variant="outline" className="mt-5 rounded-xl h-11 px-5">Sign in again</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const summary = {
    tier: agent.tier || 'bronze',
    total_earned_inr: stats?.total_revenue || 0,
    commission_rate_pct: stats?.commission_rate ?? agent.commission_rate,
    successful_applications: stats?.approved_applications || 0,
  };

  return (
    <div className="bg-white">
      <Navbar />
      <main className="pt-24 sm:pt-28 pb-16 bg-[hsl(var(--soft-bg))] min-h-[80vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-4 lg:gap-8">
          <aside className="lg:col-span-3 min-w-0">
            <div className="rounded-2xl bg-white border border-border shadow-sm p-4 mb-3 lg:mb-4 flex lg:block items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[hsl(var(--blue-700))]/10 flex items-center justify-center font-bold text-[hsl(var(--blue-700))] text-[16px]">
                  {(agent.agency_name || agent.name || 'A')[0]}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold truncate text-[hsl(var(--blue-900))]">{agent.agency_name || agent.name}</div>
                  <TierBadge tier={summary.tier} />
                </div>
              </div>
              <button onClick={logout} className="lg:mt-3 shrink-0 min-h-[36px] text-[13px] font-semibold text-muted-foreground hover:text-[hsl(var(--blue-700))] transition-colors">Sign out</button>
            </div>
            <TabNav value={tab} onChange={(t) => setParams({ tab: t })} />
          </aside>
          <section className="lg:col-span-9 min-w-0">
            <div className="rounded-2xl bg-white border border-border shadow-sm p-5 sm:p-8 min-h-[420px]">
              {tab === 'overview'    && <OverviewTab agent={agent} summary={summary} stats={stats} />}
              {tab === 'students'   && <StudentsTab token={token} />}
              {tab === 'documents'  && <DocumentsTab token={token} />}
              {tab === 'commissions'&& <CommissionsTab token={token} stats={stats} />}
              {tab === 'analytics'  && <AnalyticsTab token={token} stats={stats} />}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

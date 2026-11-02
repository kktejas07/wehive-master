import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Reveal from '../components/Reveal';
import { API, useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import {
  ChevronLeft, Search, Filter, FileText, Sparkles, Copy, Download,
  Check, Loader2, ChevronRight, GraduationCap, Globe, BookOpen,
  X, ArrowRight, Eye,
} from 'lucide-react';

const TONE_COLORS = {
  professional: 'bg-blue-50 text-blue-700 border-blue-200',
  academic: 'bg-purple-50 text-purple-700 border-purple-200',
  personal: 'bg-amber-50 text-amber-700 border-amber-200',
  compelling: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  technical: 'bg-slate-50 text-slate-700 border-slate-200',
  creative: 'bg-pink-50 text-pink-700 border-pink-200',
};

function ToneBadge({ tone }) {
  const cls = TONE_COLORS[tone] || TONE_COLORS.professional;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}>
      {tone}
    </span>
  );
}

function TemplateCard({ template, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full text-left rounded-2xl border border-[hsl(var(--border))] bg-white p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-[hsl(var(--blue-900))] group-hover:text-[hsl(var(--blue-700))] transition-colors truncate">
            {template.title}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
              <Globe className="w-3 h-3" /> {template.country_name}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-[12px] text-muted-foreground">{template.word_count} words</span>
          </div>
        </div>
        <ToneBadge tone={template.tone} />
      </div>
      <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">
        {template.sample_opening}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(template.tags || []).slice(0, 4).map(tag => (
          <span key={tag} className="px-2 py-0.5 rounded-md bg-[hsl(var(--soft-bg))] text-[11px] font-semibold text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>
    </motion.button>
  );
}

function TemplateDetail({ template, onBack, onPersonalise }) {
  const [copied, setCopied] = useState(false);
  const fullSample = [template.sample_opening, template.sample_body, template.sample_closing].filter(Boolean).join('\n\n');

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(fullSample); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-[hsl(var(--blue-700))] mb-4">
        <ChevronLeft className="w-4 h-4" /> Back to templates
      </button>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ToneBadge tone={template.tone} />
              <span className="text-[12px] text-muted-foreground">{template.word_count} words target</span>
            </div>
            <h2 className="font-display font-bold text-[24px] sm:text-[28px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
              {template.title}
            </h2>
            <div className="flex items-center gap-3 mt-2 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {template.country_name}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {template.program_type}</span>
            </div>
          </div>
          <button
            onClick={onPersonalise}
            className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white px-5 h-11 text-[14px] font-semibold transition-colors"
          >
            <Sparkles className="w-4 h-4" /> Personalise with AI
          </button>
        </div>

        {/* Sections guide */}
        <div className="mb-6">
          <h3 className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-3">Structure</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {(template.sections || []).map((s, i) => (
              <div key={i} className="rounded-xl bg-[hsl(var(--soft-bg))] border border-[hsl(var(--border))] p-3">
                <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">{s.heading}</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">{s.hint}</div>
                <div className="text-[11px] font-semibold text-[hsl(var(--blue-700))] mt-1">~{s.target_words} words</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        {template.tips?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-3">Writing Tips</h3>
            <ul className="space-y-2">
              {template.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-[hsl(var(--blue-900))]">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sample text */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))]">Sample SOP</h3>
            <button onClick={handleCopy} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-800))]">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy sample'}
            </button>
          </div>
          <div className="rounded-xl bg-[hsl(var(--soft-bg))] border border-[hsl(var(--border))] p-5 text-[14px] text-[hsl(var(--blue-900))] leading-relaxed whitespace-pre-wrap">
            {fullSample}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PersonalisePanel({ template, onBack, onDone }) {
  const { token, isAuthed } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    applicant_name: '',
    university_name: '',
    program: '',
    background: '',
    achievements: '',
    goals: '',
    extra_context: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const generate = async () => {
    if (!isAuthed) return;
    setLoading(true);
    try {
      const r = await axios.post(`${API}/sop-templates/personalise`, {
        template_id: template.id,
        ...form,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setResult(r.data);
      toast({ title: 'SOP generated', description: `${r.data.word_count} words` });
    } catch {
      toast({ title: 'Generation failed', description: 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.content) return;
    try { await navigator.clipboard.writeText(result.content); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result?.content) return;
    const blob = new Blob([result.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOP-${template.country_name}-${template.program_type}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-[hsl(var(--blue-700))] mb-4">
        <ChevronLeft className="w-4 h-4" /> Back to template
      </button>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-[hsl(var(--blue-700))]" />
          <span className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))]">AI Personalisation</span>
        </div>
        <h2 className="font-display font-bold text-[22px] text-[hsl(var(--blue-900))] mb-1">{template.title}</h2>
        <p className="text-[13px] text-muted-foreground mb-6">Fill in your details and we'll generate a personalised SOP based on this template.</p>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-4">
            {[
              { key: 'applicant_name', label: 'Your Name', placeholder: 'e.g. Krishna Chintakayala' },
              { key: 'university_name', label: 'Target University', placeholder: 'e.g. MIT, Oxford, TU Munich' },
              { key: 'program', label: 'Program / Course', placeholder: 'e.g. MSc Computer Science' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[12px] uppercase tracking-[0.12em] font-bold text-muted-foreground block mb-1">{f.label}</label>
                <input
                  value={form[f.key]}
                  onChange={set(f.key)}
                  placeholder={f.placeholder}
                  className="w-full h-11 rounded-xl border border-[hsl(var(--border))] focus:border-[hsl(var(--blue-700))] outline-none px-3 text-[14px] text-[hsl(var(--blue-900))]"
                />
              </div>
            ))}
            {[
              { key: 'background', label: 'Academic Background', placeholder: 'Education, GPA, relevant coursework...' },
              { key: 'achievements', label: 'Achievements', placeholder: 'Research, publications, awards, projects...' },
              { key: 'goals', label: 'Career Goals', placeholder: 'Short and long-term career objectives...' },
              { key: 'extra_context', label: 'Extra Context (optional)', placeholder: 'Anything else you want included...' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[12px] uppercase tracking-[0.12em] font-bold text-muted-foreground block mb-1">{f.label}</label>
                <textarea
                  value={form[f.key]}
                  onChange={set(f.key)}
                  placeholder={f.placeholder}
                  rows={3}
                  className="w-full rounded-xl border border-[hsl(var(--border))] focus:border-[hsl(var(--blue-700))] outline-none p-3 text-[14px] text-[hsl(var(--blue-900))] resize-none"
                />
              </div>
            ))}

            <button
              onClick={generate}
              disabled={loading || !isAuthed}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white h-12 text-[14px] font-bold transition-colors disabled:opacity-60"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate My SOP</>}
            </button>
            {!isAuthed && <p className="text-[12px] text-muted-foreground text-center">Sign in to generate documents</p>}
          </div>

          {/* Result */}
          <div>
            {result ? (
              <div className="rounded-2xl bg-[hsl(var(--soft-bg))] border border-[hsl(var(--border))] p-5 min-h-[400px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))]">Your SOP</span>
                    <span className="ml-2 text-[12px] text-muted-foreground">{result.word_count} words</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleCopy} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-[hsl(var(--border))] bg-white text-[12px] font-semibold text-[hsl(var(--blue-900))] hover:bg-[hsl(var(--soft-bg))]">
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button onClick={handleDownload} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-[hsl(var(--border))] bg-white text-[12px] font-semibold text-[hsl(var(--blue-900))] hover:bg-[hsl(var(--soft-bg))]">
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                </div>
                <div className="text-[14px] text-[hsl(var(--blue-900))] leading-relaxed whitespace-pre-wrap">{result.content}</div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-[hsl(var(--border))] p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
                <FileText className="w-12 h-12 text-[hsl(var(--blue-900))]/20" />
                <p className="mt-4 text-[15px] font-bold text-muted-foreground">Your personalised SOP will appear here</p>
                <p className="mt-1 text-[13px] text-muted-foreground max-w-sm">Fill in your details and click Generate.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SOPBuilder() {
  const [templates, setTemplates] = useState([]);
  const [filters, setFilters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [programType, setProgramType] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [detailTemplate, setDetailTemplate] = useState(null);
  const [view, setView] = useState('browse'); // browse | detail | personalise
  const { token } = useAuth();

  const fetchFilters = async () => {
    try {
      const r = await axios.get(`${API}/sop-templates/filters`);
      setFilters(r.data);
    } catch {}
  };

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search.trim()) params.search = search.trim();
      if (country) params.country = country;
      if (programType) params.program_type = programType;
      const r = await axios.get(`${API}/sop-templates`, { params });
      setTemplates(r.data.items || []);
      setTotal(r.data.total || 0);
      setPages(r.data.pages || 1);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, country, programType]);

  useEffect(() => { fetchFilters(); }, []);
  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => { setPage(1); }, [search, country, programType]);

  const openDetail = async (template) => {
    try {
      const r = await axios.get(`${API}/sop-templates/${template.id}`);
      setDetailTemplate(r.data);
      setView('detail');
    } catch {
      setDetailTemplate(template);
      setView('detail');
    }
  };

  return (
    <div className="bg-[hsl(var(--soft-bg))] min-h-screen">
      <Navbar />
      <main className="pt-24 sm:pt-28 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <AnimatePresence mode="wait">
            {view === 'browse' ? (
              <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Reveal>
                  <Link to="/account" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-[hsl(var(--blue-700))] mb-4">
                    <ChevronLeft className="w-4 h-4" /> Back to account
                  </Link>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--blue-700))]/10">
                      <BookOpen className="w-5 h-5 text-[hsl(var(--blue-700))]" />
                    </div>
                    <div>
                      <h1 className="font-display font-bold text-[28px] sm:text-[34px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
                        SOP Template Library
                      </h1>
                    </div>
                  </div>
                  <p className="text-[15px] text-muted-foreground mb-8 max-w-2xl">
                    Browse {total > 0 ? `${total.toLocaleString()}+` : ''} professionally crafted Statement of Purpose templates. Find one for your country and program, then personalise it with AI.
                  </p>
                </Reveal>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-[hsl(var(--border))] bg-white text-[14px] text-[hsl(var(--blue-900))] placeholder:text-muted-foreground focus:border-[hsl(var(--blue-700))] outline-none"
                    />
                  </div>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="h-11 rounded-xl border border-[hsl(var(--border))] bg-white px-3 text-[14px] text-[hsl(var(--blue-900))] focus:border-[hsl(var(--blue-700))] outline-none"
                  >
                    <option value="">All Countries</option>
                    {(filters?.countries || []).map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  <select
                    value={programType}
                    onChange={(e) => setProgramType(e.target.value)}
                    className="h-11 rounded-xl border border-[hsl(var(--border))] bg-white px-3 text-[14px] text-[hsl(var(--blue-900))] focus:border-[hsl(var(--blue-700))] outline-none"
                  >
                    <option value="">All Programs</option>
                    {(filters?.program_types || []).map(p => (
                      <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  {(search || country || programType) && (
                    <button
                      onClick={() => { setSearch(''); setCountry(''); setProgramType(''); }}
                      className="inline-flex items-center gap-1.5 h-11 px-3 rounded-xl border border-[hsl(var(--border))] bg-white text-[13px] font-semibold text-muted-foreground hover:text-[hsl(var(--blue-900))]"
                    >
                      <X className="w-3.5 h-3.5" /> Clear
                    </button>
                  )}
                </div>

                {/* Results */}
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-white p-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground/30" />
                    <p className="mt-4 font-bold text-[16px] text-[hsl(var(--blue-900))]">No templates found</p>
                    <p className="mt-1 text-[14px] text-muted-foreground">Try adjusting your search or filters.</p>
                  </div>
                ) : (
                  <>
                    <div className="text-[13px] text-muted-foreground mb-4">
                      Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} templates
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {templates.map(t => (
                        <TemplateCard key={t.id} template={t} onClick={() => openDetail(t)} />
                      ))}
                    </div>
                    {pages > 1 && (
                      <div className="mt-8 flex items-center justify-center gap-3">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-[hsl(var(--border))] bg-white text-[13px] font-semibold disabled:opacity-40"
                        >
                          <ChevronLeft className="w-4 h-4" /> Previous
                        </button>
                        <span className="text-[13px] text-muted-foreground">Page {page} of {pages}</span>
                        <button
                          onClick={() => setPage(p => Math.min(pages, p + 1))}
                          disabled={page === pages}
                          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-[hsl(var(--border))] bg-white text-[13px] font-semibold disabled:opacity-40"
                        >
                          Next <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            ) : view === 'detail' && detailTemplate ? (
              <TemplateDetail
                key="detail"
                template={detailTemplate}
                onBack={() => setView('browse')}
                onPersonalise={() => setView('personalise')}
              />
            ) : view === 'personalise' && detailTemplate ? (
              <PersonalisePanel
                key="personalise"
                template={detailTemplate}
                onBack={() => setView('detail')}
                onDone={() => setView('browse')}
              />
            ) : null}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
}

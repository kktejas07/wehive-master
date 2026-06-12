import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Send, Loader2, Sparkles, Check, X, ChevronRight, BookOpen, User, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';

const SOP_TEMPLATES = {
  us: { country: 'United States', type: 'F-1 Student Visa', focus: 'Academic goals, research interests, career plans in the US', tone: 'Professional and ambitious' },
  uk: { country: 'United Kingdom', type: 'Tier 4 Student Visa', focus: 'Course interest, academic background, future career', tone: 'Academic and structured' },
  de: { country: 'Germany', type: 'Student Visa', focus: 'Research fit, program structure, post-study plans in Europe', tone: 'Technical and precise' },
  common: { country: 'General', type: 'University Application', focus: 'Personal story, achievements, motivation', tone: 'Personal and compelling' },
};

const LOR_TEMPLATES = {
  academic: { label: 'Academic Reference', focus: 'Academic performance, research projects, classroom contributions' },
  professional: { label: 'Professional Reference', focus: 'Work experience, skills, leadership, teamwork' },
  research: { label: 'Research Reference', focus: 'Research capabilities, methodology, independent work' },
};

export default function AISOPLORWriter({ university, compact = false }) {
  const { token, isAuthed } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState('sop');
  const [country, setCountry] = useState(university?.country || 'common');
  const [program, setProgram] = useState('');
  const [background, setBackground] = useState('');
  const [achievements, setAchievements] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [strength, setStrength] = useState('');

  const handleGenerate = async () => {
    if (!isAuthed) return;
    setLoading(true);
    setResult(null);
    try {
      const template = SOP_TEMPLATES[country] || SOP_TEMPLATES.common;
      const name = university?.name || 'your target university';
      let prompt;
      if (mode === 'sop') {
        prompt = `Write a compelling Statement of Purpose for ${name}. Context: ${template.focus}. Tone: ${template.tone}. Applicant background: ${background}. Achievements: ${achievements}. Goals: ${goal}.`;
      } else {
        const lorType = LOR_TEMPLATES[strength] || LOR_TEMPLATES.academic;
        prompt = `Write a professional Letter of Recommendation (${lorType.label}) for a student applying to ${name}. Focus: ${lorType.focus}. Background: ${background}. Achievements: ${achievements}. Strengths: ${strength}.`;
      }
      const r = await axios.post(`${API}/apps/generate-doc`, {
        type: mode === 'sop' ? 'sop' : 'lor',
        university_id: university?.id,
        context: { program, background, achievements, goal, strength, country },
      }, { headers: { Authorization: `Bearer ${token}` } });
      setResult(r.data?.content || r.data?.text || 'Generated content will appear here.');
      toast({ title: `${mode === 'sop' ? 'SOP' : 'LOR'} generated`, description: 'Check the preview below.' });
    } catch {
      const sample = mode === 'sop'
        ? `Statement of Purpose — ${university?.name || 'University'}\n\nI am writing to express my strong interest in pursuing ${program || 'my chosen program'} at ${university?.name || 'your university'}. My background in ${background || 'my field'} has prepared me well for this program. ${achievements ? `I have achieved ${achievements}.` : ''} ${goal ? `My goal is to ${goal}.` : ''}\n\nI am confident that this program will help me achieve my career aspirations and contribute meaningfully to my field.`
        : `Letter of Recommendation — ${university?.name || 'University'}\n\nIt is my pleasure to recommend this exceptional candidate for admission to ${university?.name || 'your program'}. I have had the opportunity to work with them in ${background || 'an academic setting'} where they demonstrated outstanding ${strength || 'abilities'}.\n\nTheir achievements include ${achievements || 'notable accomplishments'} that showcase their dedication and capability. I am confident they will excel in your program.`;
      setResult(sample);
      toast({ title: 'Generated', description: 'Sample content (API unavailable).' });
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 p-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] font-bold text-purple-700 mb-2">
          <FileText className="w-3.5 h-3.5" /> AI SOP / LOR Writer
        </div>
        <p className="text-[13px] text-purple-800/70 mb-3">
          Generate university-specific SOPs and recommendation letters.
        </p>
        <button onClick={() => document.getElementById('ai-sop-writer')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-purple-700 hover:text-purple-800">
          Write my documents <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <motion.div
      id="ai-sop-writer"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8"
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-1">
        <Sparkles className="w-3.5 h-3.5" /> AI Writer
      </div>
      <h2 className="font-display font-extrabold text-[24px] text-[hsl(var(--blue-900))] mb-2">
        SOP / LOR Generator
      </h2>
      <p className="text-[14px] text-[hsl(var(--blue-900))]/60 mb-6">
        Generate university-specific Statements of Purpose and recommendation letters.
      </p>

      <div className="flex items-center gap-2 mb-6">
        {[
          { id: 'sop', label: 'Statement of Purpose', icon: BookOpen },
          { id: 'lor', label: 'Letter of Recommendation', icon: User },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setResult(null); }}
            className={`px-5 py-2.5 rounded-full text-[13px] font-bold transition flex items-center gap-2 ${
              mode === m.id ? 'bg-[hsl(var(--blue-700))] text-white shadow-lg' : 'bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))]/60 hover:bg-[hsl(var(--blue-50))]'
            }`}
          >
            <m.icon className="w-4 h-4" />
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {mode === 'sop' ? (
            <>
              <div>
                <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">Target Country</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full h-11 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-3 text-[14px] text-[hsl(var(--blue-900))]">
                  {Object.entries(SOP_TEMPLATES).map(([k, v]) => (
                    <option key={k} value={k}>{v.country} — {v.type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">Program / Course</label>
                <input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="e.g. MSc Computer Science" className="w-full h-11 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-3 text-[14px] text-[hsl(var(--blue-900))]" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">Academic Background</label>
                <textarea value={background} onChange={(e) => setBackground(e.target.value)} placeholder="Your previous education, GPA, relevant coursework..." className="w-full min-h-[80px] rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none p-3 text-[14px] text-[hsl(var(--blue-900))] resize-none" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">Achievements</label>
                <textarea value={achievements} onChange={(e) => setAchievements(e.target.value)} placeholder="Research, publications, awards, projects..." className="w-full min-h-[80px] rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none p-3 text-[14px] text-[hsl(var(--blue-900))] resize-none" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">Career Goals</label>
                <textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Short and long-term career objectives..." className="w-full min-h-[80px] rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none p-3 text-[14px] text-[hsl(var(--blue-900))] resize-none" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">Reference Type</label>
                <div className="space-y-2">
                  {Object.entries(LOR_TEMPLATES).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setStrength(k)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition ${
                        strength === k ? 'border-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))]' : 'border-black/5 hover:border-[hsl(var(--blue-700))]/30'
                      }`}
                    >
                      <div className="font-bold text-[14px] text-[hsl(var(--blue-900))]">{v.label}</div>
                      <div className="text-[12px] text-[hsl(var(--blue-900))]/60">{v.focus}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">Relationship with Applicant</label>
                <input value={background} onChange={(e) => setBackground(e.target.value)} placeholder="e.g. Professor, Manager, Research Supervisor" className="w-full h-11 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-3 text-[14px] text-[hsl(var(--blue-900))]" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">Key Strengths</label>
                <textarea value={strength} onChange={(e) => setStrength(e.target.value)} placeholder="Academic abilities, leadership, research skills..." className="w-full min-h-[80px] rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none p-3 text-[14px] text-[hsl(var(--blue-900))] resize-none" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">Notable Achievements</label>
                <textarea value={achievements} onChange={(e) => setAchievements(e.target.value)} placeholder="Projects, publications, awards..." className="w-full min-h-[80px] rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none p-3 text-[14px] text-[hsl(var(--blue-900))] resize-none" />
              </div>
            </>
          )}

          <Button
            onClick={handleGenerate}
            disabled={loading || !isAuthed}
            className="w-full h-12 rounded-full btn-accent text-white font-bold"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate {mode === 'sop' ? 'SOP' : 'LOR'}</>
            )}
          </Button>
          {!isAuthed && (
            <p className="text-[12px] text-[hsl(var(--blue-900))]/50 text-center">Sign in to generate documents</p>
          )}
        </div>

        <div className="lg:col-span-3">
          {result ? (
            <div className="rounded-2xl border border-black/5 bg-[hsl(var(--soft-bg))] p-6 min-h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--accent))]">
                  {mode === 'sop' ? 'Statement of Purpose' : 'Letter of Recommendation'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard?.writeText(result)}
                  className="rounded-full text-[12px]"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" /> Copy
                </Button>
              </div>
              <div className="text-[14px] text-[hsl(var(--blue-900))]/80 leading-relaxed whitespace-pre-wrap">
                {result}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-black/10 p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
              <FileText className="w-12 h-12 text-[hsl(var(--blue-900))]/20" />
              <p className="mt-4 text-[15px] font-bold text-[hsl(var(--blue-900))]/40">
                Your {mode === 'sop' ? 'SOP' : 'LOR'} will appear here
              </p>
              <p className="mt-1 text-[13px] text-[hsl(var(--blue-900))]/30 max-w-sm">
                Fill in the details on the left and generate a personalized document for {university?.name || 'your target university'}.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

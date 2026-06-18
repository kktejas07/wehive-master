import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Sparkles, Send, Mic, MicOff, Volume2, Plane, FileText,
  GraduationCap, FileCheck2, Compass, Loader2, KeyRound, Globe2,
  RotateCcw, ShieldCheck,
} from 'lucide-react';
import { API, useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

// ── Static UI spec — matches the Hive mockup exactly ──────────────────────
const AGENTS = [
  { id: 'hive_visa',          label: 'Visa assistant',  icon: ShieldCheck, accent: 'navy' },
  { id: 'hive_travel',        label: 'Travel planner',  icon: Compass,     accent: 'navy' },
  { id: 'hive_documents',     label: 'Documents',       icon: FileCheck2,  accent: 'navy' },
  { id: 'hive_study_abroad',  label: 'Study abroad',    icon: GraduationCap, accent: 'navy' },
];

const PROMPT_KIT = {
  hive_visa: [
    {
      title: 'Check visa requirements',
      sub: 'Passport, destination, purpose',
      sample: 'Do I need a visa for Japan on an Indian passport?',
    },
    {
      title: 'Visa fees & timelines',
      sub: 'Tourist / business / student',
      sample: 'What is the US B1/B2 visa fee and wait time from India?',
    },
  ],
  hive_travel: [
    {
      title: 'Plan a trip',
      sub: 'Dates, budget, interests',
      sample: 'Plan a 7-day Japan trip in April for 2 people under ₹2.5 lakh.',
    },
    {
      title: 'Best season to visit',
      sub: 'Weather, crowds, budget',
      sample: 'When is the cheapest time to visit Switzerland from India?',
    },
  ],
  hive_documents: [
    {
      title: 'Review my documents',
      sub: 'Passport, financials, forms',
      sample: 'What documents do I need for a Schengen tourist visa from India?',
    },
    {
      title: 'Document checklist',
      sub: 'Tourist / student / work',
      sample: 'Give me the F1 student visa document checklist.',
    },
  ],
  hive_study_abroad: [
    {
      title: 'Match me to universities',
      sub: 'Budget, country, course',
      sample: 'Match me to universities in Germany under ₹20 lakh/year for CS.',
    },
    {
      title: 'Compare programs',
      sub: 'Tuition, scholarships, intake',
      sample: 'Compare MIT, Stanford, and CMU for MS in Computer Science.',
    },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────
const todayLabel = () =>
  new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function pickSourcesFromRun(run) {
  if (!run) return [];
  const out = new Set();
  for (const step of run.steps || []) {
    if (step.tool_name) out.add(step.tool_name);
  }
  return [...out];
}

function parseAnswerParts(answer) {
  // Split on the closing reminder that the Visa/Travel agents add.
  const reminderRe = /(Confirm with the official embassy|confirm with the embassy|Prices and availability change frequently)/i;
  const idx = answer.search(reminderRe);
  if (idx < 0) return { main: answer.trim(), reminder: null };
  return {
    main: answer.slice(0, idx).trim(),
    reminder: answer.slice(idx).trim(),
  };
}

// ── Message bubble ────────────────────────────────────────────────────────
function Bubble({ m, onSpeak, speaking, ttsEnabled }) {
  const me = m.role === 'user';
  return (
    <div className={cn('flex', me ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3 shadow-sm text-[14px] leading-snug whitespace-pre-wrap',
          me
            ? 'bg-[hsl(var(--blue-700))] text-white rounded-br-sm'
            : 'bg-white border border-black/5 text-[hsl(var(--blue-900))] rounded-bl-sm'
        )}
      >
        {m.text}
      </div>
    </div>
  );
}

function AssistantBlock({ m, onSpeak, speaking, ttsEnabled, checkedAt }) {
  const parts = useMemo(() => parseAnswerParts(m.text || ''), [m.text]);
  const sources = m.sources || [];

  return (
    <div className="rounded-2xl border border-black/5 bg-white shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[12px] font-bold tracking-wide text-[hsl(var(--blue-700))]">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          {m.agentLabel || 'Hive assistant'}
        </div>
        <button
          onClick={() => onSpeak(parts.main)}
          disabled={!ttsEnabled}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold transition',
            ttsEnabled
              ? 'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-100))]'
              : 'bg-black/5 text-[hsl(var(--blue-900))]/40'
          )}
          aria-label="Listen"
        >
          {speaking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
          Listen
        </button>
      </div>

      <div className="text-[14.5px] leading-relaxed text-[hsl(var(--blue-900))] whitespace-pre-wrap">
        {parts.main}
      </div>

      {parts.reminder && (
        <div className="mt-3 rounded-xl bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] px-3 py-2 text-[12.5px] font-semibold border border-[hsl(var(--blue-100))]">
          {parts.reminder}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-black/5 flex flex-wrap items-center gap-2 text-[11.5px] text-[hsl(var(--blue-900))]/65">
        <span className="font-semibold">Sources</span>
        {sources.length > 0 ? (
          sources.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--blue-900))] text-white px-2.5 py-0.5"
            >
              {s === 'visa_lookup' ? 'Live visa API' : s.replace(/_/g, ' ')}
            </span>
          ))
        ) : (
          <span className="text-[hsl(var(--blue-900))]/40">RAG knowledge base</span>
        )}
        <span className="ml-auto font-semibold text-[hsl(var(--blue-900))]/55">
          {checkedAt || `Checked today · confirm with the embassy`}
        </span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function Hive({ inOverlay }) {
  const { token, isAuthed } = useAuth();
  const navigate = useNavigate();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [activeAgent, setActiveAgent] = useState('hive_visa');
  const [modelMode, setModelMode] = useState('platform');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const scroller = useRef(null);
  const recognitionRef = useRef(null);

  const activeSpec = AGENTS.find((a) => a.id === activeAgent);
  const promptCards = PROMPT_KIT[activeAgent] || [];

  // Reset transcript when switching agents
  useEffect(() => {
    setMessages([]);
    setText('');
    setError(null);
  }, [activeAgent]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages, sending]);

  // ── Voice input ────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError('Voice recognition not supported in this browser.');
      return;
    }
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = 'en-IN';
    r.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setText(t);
      setListening(false);
      setTimeout(() => send(t), 200);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
    setListening(true);
    recognitionRef.current = r;
  }, [activeAgent]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  // ── Text-to-speech ─────────────────────────────────────────────────────
  const speak = useCallback(
    (text) => {
      if (!ttsEnabled || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(
        (text || '').replace(/[#*_₹$\[\]()]/g, '').slice(0, 600)
      );
      u.lang = 'en-IN';
      u.rate = 1.0;
      u.pitch = 1.05;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    },
    [ttsEnabled]
  );

  // ── Send a message to the active agent ─────────────────────────────────
  const send = useCallback(
    async (override) => {
      const q = (override ?? text).trim();
      if (!q || sending) return;

      if (!isAuthed) {
        setMessages((m) => [
          ...m,
          {
            id: 'u-' + Date.now(),
            role: 'user',
            text: q,
            ts: new Date().toISOString(),
          },
          {
            id: 'auth-' + Date.now(),
            role: 'assistant',
            text: '',
            isAuthPrompt: true,
            ts: new Date().toISOString(),
          },
        ]);
        setText('');
        return;
      }

      setSending(true);
      setText('');
      setError(null);

      const userMsg = {
        id: 'u-' + Date.now(),
        role: 'user',
        text: q,
        ts: new Date().toISOString(),
      };
      setMessages((m) => [...m, userMsg]);

      try {
        const r = await axios.post(
          `${API}/agents-v2/${activeAgent}/run`,
          {
            input: q,
            context: '',
            conversation_history: messages
              .filter((x) => x.role === 'user' || x.role === 'assistant')
              .slice(-6)
              .map((x) => ({ role: x.role, content: x.text })),
          },
          { headers }
        );
        const run = r.data?.run || {};
        const replyText = (run.final_answer || '').trim();
        const sources = pickSourcesFromRun(run);

        const assistantMsg = {
          id: 'a-' + Date.now(),
          role: 'assistant',
          text: replyText || '(no answer)',
          agentId: activeAgent,
          agentLabel: activeSpec?.label || 'Hive',
          sources,
          ts: run.finished_at || new Date().toISOString(),
        };
        setMessages((m) => [...m, assistantMsg]);
        if (replyText) speak(partsMain(replyText));
      } catch (e) {
        const detail = e?.response?.data?.detail || e.message;
        setError(`Could not reach Hive: ${detail}`);
        setMessages((m) => [
          ...m,
          {
            id: 'err-' + Date.now(),
            role: 'assistant',
            text: `Hmm, I could not reply. Please try again.\n\nDetail: ${detail}`,
            agentId: activeAgent,
            agentLabel: activeSpec?.label || 'Hive',
            sources: [],
            ts: new Date().toISOString(),
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [text, sending, activeAgent, activeSpec, headers, messages, speak, isAuthed]
  );

  const partsMain = (s) => parseAnswerParts(s).main;

  return (
    <div className="relative min-h-screen pb-16">
      {/* Aurora backdrop — same We Hive hero treatment */}
      <div className="absolute inset-0 -z-10 aurora-bg" aria-hidden />
      <div className="absolute inset-0 -z-10 bg-grain opacity-30" aria-hidden />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14">
        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="rounded-3xl glass-tint-navy border border-[hsl(var(--blue-100))] shadow-[0_25px_60px_-30px_rgba(10,44,138,0.35)] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-[hsl(var(--blue-700))] text-white inline-flex items-center justify-center shadow-[0_10px_30px_-10px_rgba(10,44,138,0.55)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-extrabold text-[24px] sm:text-[28px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
                Hive
              </h1>
              <p className="text-[12.5px] sm:text-[13.5px] text-[hsl(var(--blue-900))]/65">
                WeHive travel & visa assistant
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <ModelToggle
                active={modelMode === 'platform'}
                onClick={() => setModelMode('platform')}
                icon={<Globe2 className="w-3.5 h-3.5" />}
                label="Platform model"
              />
              <ModelToggle
                active={modelMode === 'byok'}
                onClick={() => setModelMode('byok')}
                icon={<KeyRound className="w-3.5 h-3.5" />}
                label="Your key"
              />
            </div>
          </div>

          {/* Mobile model toggle */}
          <div className="flex sm:hidden items-center gap-2 mt-4">
            <ModelToggle
              active={modelMode === 'platform'}
              onClick={() => setModelMode('platform')}
              icon={<Globe2 className="w-3.5 h-3.5" />}
              label="Platform model"
            />
            <ModelToggle
              active={modelMode === 'byok'}
              onClick={() => setModelMode('byok')}
              icon={<KeyRound className="w-3.5 h-3.5" />}
              label="Your key"
            />
          </div>

          {/* Agent tabs */}
          <nav className="mt-5 flex flex-wrap gap-2">
            {AGENTS.map((a) => {
              const Icon = a.icon;
              const active = a.id === activeAgent;
              return (
                <button
                  key={a.id}
                  onClick={() => setActiveAgent(a.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition border',
                    active
                      ? 'bg-[hsl(var(--blue-700))] text-white border-[hsl(var(--blue-700))] shadow-[0_10px_25px_-12px_rgba(10,44,138,0.7)]'
                      : 'bg-white text-[hsl(var(--blue-900))] border-[hsl(var(--blue-100))] hover:border-[hsl(var(--blue-700))]/30'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {a.label}
                </button>
              );
            })}
          </nav>
        </header>

        {/* ── Prompt kit ──────────────────────────────────────────────── */}
        <section className="mt-6">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[hsl(var(--blue-900))]/55 mb-2.5">
            Prompt kit
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {promptCards.map((p) => (
              <button
                key={p.title}
                onClick={() => send(p.sample)}
                className="text-left rounded-2xl bg-white border border-black/5 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition group"
              >
                <div className="font-display font-extrabold text-[15px] text-[hsl(var(--blue-900))] group-hover:text-[hsl(var(--blue-700))]">
                  {p.title}
                </div>
                <div className="text-[12px] text-[hsl(var(--blue-900))]/55 mt-0.5">{p.sub}</div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Chat transcript ────────────────────────────────────────── */}
        <section className="mt-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_25px_60px_-30px_rgba(10,44,138,0.25)] overflow-hidden">
          <div ref={scroller} className="p-4 sm:p-5 space-y-3 min-h-[280px] max-h-[60vh] overflow-y-auto">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <div className="inline-flex h-12 w-12 rounded-2xl bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h2 className="font-display font-extrabold text-[20px] text-[hsl(var(--blue-900))]">
                  Ask {activeSpec?.label || 'Hive'} anything
                </h2>
                <p className="text-[12.5px] text-[hsl(var(--blue-900))]/60 mt-1 max-w-sm mx-auto">
                  Pick a prompt above or type below. Visa and travel answers
                  are date-stamped and cite the source.
                </p>
              </div>
            )}

            {messages.map((m) =>
              m.role === 'user' ? (
                <Bubble key={m.id} m={m} ttsEnabled={ttsEnabled} />
              ) : m.isAuthPrompt ? (
                <div key={m.id} className="rounded-2xl border border-[hsl(var(--accent))]/20 bg-[hsl(var(--accent))]/5 shadow-sm p-6 text-center">
                  <Sparkles className="w-8 h-8 mx-auto mb-3 text-[hsl(var(--accent))]" />
                  <h3 className="font-display font-extrabold text-[18px] text-[hsl(var(--blue-900))] mb-2">
                    Sign in to continue
                  </h3>
                  <p className="text-[13px] text-[hsl(var(--blue-900))]/65 mb-4 max-w-sm mx-auto">
                    Create an account or sign in to ask custom questions and get
                    personalised visa, travel, and document assistance.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      onClick={() => navigate('/signup')}
                      className="rounded-full font-bold h-10 px-5 text-white"
                      style={{ background: 'linear-gradient(135deg, hsl(var(--blue-700)) 0%, hsl(var(--accent)) 130%)' }}
                    >
                      Create account
                    </Button>
                    <Button
                      onClick={() => navigate('/login')}
                      variant="outline"
                      className="rounded-full font-bold h-10 px-5 border-[hsl(var(--blue-700))]/30 text-[hsl(var(--blue-700))]"
                    >
                      Sign in
                    </Button>
                  </div>
                </div>
              ) : (
                <AssistantBlock
                  key={m.id}
                  m={m}
                  onSpeak={speak}
                  speaking={speaking}
                  ttsEnabled={ttsEnabled}
                  checkedAt={m.ts ? `Checked ${new Date(m.ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · confirm with the embassy` : null}
                />
              )
            )}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-white border border-black/5 px-4 py-3 inline-flex items-center gap-2 text-[hsl(var(--blue-900))]/65">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[13px]">
                    {activeSpec?.label || 'Hive'} is thinking…
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-[12.5px]">
                {error}
              </div>
            )}
          </div>

          {/* ── Composer ─────────────────────────────────────────────── */}
          <div className="border-t border-black/5 p-3 bg-white/80">
            <div className="flex items-center gap-1.5">
              <button
                onClick={listening ? stopListening : startListening}
                className={cn(
                  'h-10 w-10 rounded-full inline-flex items-center justify-center transition',
                  listening
                    ? 'bg-red-100 text-red-600 animate-pulse'
                    : 'bg-black/5 text-[hsl(var(--blue-900))]/50 hover:text-[hsl(var(--blue-700))]'
                )}
                aria-label={listening ? 'Stop listening' : 'Voice input'}
                title={listening ? 'Stop listening' : 'Voice input'}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={`Ask ${activeSpec?.label || 'Hive'} about visas, trips, or documents…`}
                className="flex-1 h-11 rounded-full border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px] text-[hsl(var(--blue-900))] bg-white"
              />
              <button
                onClick={() => send()}
                disabled={sending || !text.trim()}
                className="h-11 w-11 rounded-full text-white inline-flex items-center justify-center disabled:opacity-50"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(var(--blue-700)) 0%, hsl(var(--accent)) 130%)',
                }}
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMessages([])}
                className="h-10 w-10 rounded-full inline-flex items-center justify-center bg-black/5 text-[hsl(var(--blue-900))]/50 hover:text-[hsl(var(--blue-700))]"
                aria-label="Clear chat"
                title="Clear chat"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTtsEnabled((v) => !v)}
                className={cn(
                  'h-10 w-10 rounded-full inline-flex items-center justify-center transition',
                  ttsEnabled
                    ? 'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))]'
                    : 'bg-black/5 text-[hsl(var(--blue-900))]/40'
                )}
                aria-label={ttsEnabled ? 'Mute voice' : 'Enable voice'}
                title={ttsEnabled ? 'Mute voice' : 'Enable voice'}
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[11px] text-[hsl(var(--blue-900))]/45 mt-2 px-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" />
              {activeAgent === 'hive_visa' && 'Visa answers are date-stamped. Always confirm with the official embassy.'}
              {activeAgent === 'hive_travel' && 'Trip prices come from live tools. Confirm before booking.'}
              {activeAgent === 'hive_documents' && 'Documents are encrypted at rest. We never ask for raw passport numbers in chat.'}
              {activeAgent === 'hive_study_abroad' && 'University data is from our RAG. Use the Study Abroad page for a personalised match.'}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ModelToggle({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold border transition',
        active
          ? 'bg-white text-[hsl(var(--blue-700))] border-[hsl(var(--blue-100))] shadow-sm'
          : 'bg-white/40 text-[hsl(var(--blue-900))]/60 border-white/40 hover:bg-white/70'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

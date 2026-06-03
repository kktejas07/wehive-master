import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Calendar, ShieldAlert, ListChecks, MessageSquare, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { API } from '../context/AuthContext';
import Reveal from './Reveal';

const AI_TOOLS = [
  {
    id: 'cover-letter',
    Icon: FileText,
    color: '#0a2c8a',
    label: 'Cover Letter / SOP Writer',
    desc: 'AI generates professional visa cover letters and statements of purpose tailored to your application.',
    cta: 'Write my cover letter',
    badge: 'Popular',
    href: '/account?tab=aitools',
  },
  {
    id: 'itinerary',
    Icon: Calendar,
    color: '#f59e0b',
    label: 'AI Itinerary Planner',
    desc: 'Get a personalised day-by-day travel plan — activities, meals, budget estimates — in seconds.',
    cta: 'Plan my trip',
    badge: 'New',
    href: '/account?tab=aitools',
  },
  {
    id: 'risk',
    Icon: ShieldAlert,
    color: '#dc2626',
    label: 'Rejection Risk Analyser',
    desc: 'AI reviews your documents and flags issues before you submit — so nothing gets rejected.',
    cta: 'Check my risk',
    badge: 'New',
    href: '/account?tab=aitools',
  },
  {
    id: 'checklist',
    Icon: ListChecks,
    color: '#059669',
    label: 'Smart Document Checklist',
    desc: 'Tell us your destination, purpose, and nationality — AI generates your personalised checklist.',
    cta: 'Build my checklist',
    badge: null,
    href: '/account?tab=aitools',
  },
  {
    id: 'chatbot',
    Icon: MessageSquare,
    color: '#7c3aed',
    label: 'AI Visa Assistant Eva',
    desc: 'Ask anything: "Can I visit Japan with an Indian passport?" Get instant answers from our AI consultant.',
    cta: 'Chat with Eva',
    badge: null,
    href: null,
  },
];

function AIToolCard({ tool, index, isAuthed }) {
  const [launching, setLaunching] = useState(false);
  const Icon = tool.Icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group relative rounded-2xl border border-black/8 bg-white p-5 sm:p-6 hover:border-[hsl(var(--accent))]/30 hover:shadow-[0_12px_40px_-12px_rgba(10,44,138,0.18)] transition-all"
    >
      {tool.badge && (
        <span className={`absolute top-4 right-4 text-[10px] uppercase tracking-[0.14em] font-bold px-2.5 py-0.5 rounded-full ${
          tool.badge === 'New' ? 'bg-emerald-100 text-emerald-700' : 'bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]'
        }`}>
          {tool.badge}
        </span>
      )}
      <div
        className="h-11 w-11 rounded-xl inline-flex items-center justify-center mb-4"
        style={{ background: `${tool.color}15` }}
      >
        <Icon className="w-5 h-5" style={{ color: tool.color }} />
      </div>
      <h3 className="font-display text-[17px] font-extrabold text-[hsl(var(--blue-900))] tracking-[-0.01em]">
        {tool.label}
      </h3>
      <p className="mt-2 text-[13px] text-[hsl(var(--blue-900))]/60 leading-relaxed">
        {tool.desc}
      </p>
      <div className="mt-5">
        {tool.id === 'chatbot' ? (
          <button
            onClick={() => {
              const ev = new CustomEvent('open-chatbot');
              window.dispatchEvent(ev);
            }}
            className="inline-flex items-center gap-1.5 rounded-full text-[13px] font-bold text-[hsl(var(--accent))] hover:gap-2.5 transition-all"
          >
            {tool.cta} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <Link
            to={tool.href}
            className="inline-flex items-center gap-1.5 rounded-full text-[13px] font-bold text-[hsl(var(--accent))] hover:gap-2.5 transition-all"
          >
            {launching ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Launching…
              </>
            ) : (
              <>
                {tool.cta} <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Link>
        )}
      </div>
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${tool.color}08 0%, transparent 60%)` }}
      />
    </motion.div>
  );
}

export default function AIServices() {
  return (
    <section className="py-16 sm:py-24 lg:py-28 bg-[hsl(var(--soft-bg))]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-bold text-[hsl(var(--accent))] mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Powered by AI
          </div>
          <h2 className="font-display font-extrabold text-[28px] sm:text-[40px] lg:text-[48px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
            Your visa application,{' '}
            <span className="text-[hsl(var(--accent))]">supercharged by AI.</span>
          </h2>
          <p className="mt-4 text-[15px] sm:text-[17px] text-[hsl(var(--blue-900))]/60 max-w-2xl mx-auto">
            From auto-filling forms to rejection risk analysis — our AI handles the tedious parts so you can focus on the journey.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {AI_TOOLS.map((tool, i) => (
            <AIToolCard key={tool.id} tool={tool} index={i} />
          ))}
        </div>

        <Reveal className="text-center mt-10">
          <Link to="/account">
            <Button className="rounded-full btn-accent text-white h-11 px-7 font-bold">
              Start your application <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
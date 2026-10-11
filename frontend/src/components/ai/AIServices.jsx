import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Calendar, ShieldAlert, ListChecks, MessageSquare, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import Reveal from '../Reveal';
import { useAuth } from '../../context/AuthContext';

const AI_TOOLS = [
  {
    id: 'cover-letter',
    Icon: FileText,
    label: 'Cover Letter / SOP Writer',
    desc: 'AI generates professional visa cover letters and statements of purpose tailored to your application.',
    cta: 'Write my cover letter',
    badge: 'Popular',
    href: '/account?tab=aitools',
  },
  {
    id: 'itinerary',
    Icon: Calendar,
    label: 'AI Itinerary Planner',
    desc: 'Get a personalised day-by-day travel plan — activities, meals, budget estimates — in seconds.',
    cta: 'Plan my trip',
    badge: 'New',
    href: '/account?tab=aitools',
  },
  {
    id: 'risk',
    Icon: ShieldAlert,
    label: 'Rejection Risk Analyser',
    desc: 'AI reviews your documents and flags issues before you submit — so nothing gets rejected.',
    cta: 'Check my risk',
    badge: 'New',
    href: '/account?tab=aitools',
  },
  {
    id: 'checklist',
    Icon: ListChecks,
    label: 'Smart Document Checklist',
    desc: 'Tell us your destination, purpose, and nationality — AI generates your personalised checklist.',
    cta: 'Build my checklist',
    badge: null,
    href: '/account?tab=aitools',
  },
  {
    id: 'chatbot',
    Icon: MessageSquare,
    label: 'AI Visa Assistant Hive',
    desc: 'Ask anything: "Can I visit Japan with an Indian passport?" Get instant answers from our AI consultant.',
    cta: 'Chat with Hive',
    badge: null,
    href: null,
  },
];

function AIToolCard({ tool, index }) {
  const navigate = useNavigate();
  const Icon = tool.Icon;
  const clickable = Boolean(tool.href);
  const Tag = clickable ? 'button' : 'div';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
      className="h-full"
    >
      <Tag
        {...(clickable ? { type: 'button', onClick: () => navigate(tool.href) } : {})}
        className={`group relative flex h-full w-full flex-col text-left rounded-2xl border border-[hsl(var(--border))] bg-white p-6 shadow-sm transition duration-200 ${clickable ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-[hsl(var(--blue-700))]/30' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="h-11 w-11 shrink-0 rounded-xl inline-flex items-center justify-center bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))]">
            <Icon className="w-5 h-5" aria-hidden="true" />
          </span>
          {tool.badge && (
            <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full bg-[hsl(var(--soft-bg))] border border-[hsl(var(--border))] text-[hsl(var(--blue-900))]">
              {tool.badge}
            </span>
          )}
        </div>
        <h3 className="mt-5 font-display text-[18px] font-semibold text-[hsl(var(--blue-900))] leading-snug">
          {tool.label}
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground flex-1">
          {tool.desc}
        </p>
        <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[hsl(var(--blue-700))]">
          {tool.cta} <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </Tag>
    </motion.div>
  );
}

export default function AIServices() {
  const { isAuthed } = useAuth();
  const navigate = useNavigate();

  const handleStartApp = () => {
    if (isAuthed) {
      navigate('/account');
    } else {
      navigate('/signup');
    }
  };

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl mb-10 sm:mb-12">
          <div className="text-[12px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--blue-700))] mb-3">
            AI tools
          </div>
          <h2 className="font-display font-bold text-[28px] sm:text-[36px] leading-[1.15] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
            Your visa application, supercharged by AI
          </h2>
          <p className="mt-4 text-[16px] sm:text-[18px] leading-relaxed text-muted-foreground">
            From auto-filling forms to rejection risk analysis — our AI handles the tedious parts so you can focus on the journey.
          </p>
        </Reveal>

        <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AI_TOOLS.map((tool, i) => (
            <AIToolCard key={tool.id} tool={tool} index={i} />
          ))}
        </div>

        <Reveal className="mt-10">
          <Button onClick={handleStartApp} variant="outline" className="rounded-xl h-12 px-6 font-semibold border-[hsl(var(--border))] text-[hsl(var(--blue-900))] hover:text-[hsl(var(--blue-700))] hover:border-[hsl(var(--blue-700))]/40">
            Start your application <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

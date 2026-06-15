import { useState, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Award, Users, Home, PenTool, DollarSign, ChevronRight, Calendar, Banknote } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const ScholarshipMatcher = lazy(() => import('../components/ScholarshipMatcher'));
const AlumniMentor = lazy(() => import('../components/AlumniMentor'));
const CostOfLivingCalculator = lazy(() => import('../components/CostOfLivingCalculator'));
const StudentHousing = lazy(() => import('../components/StudentHousing'));
const AISOPLORWriter = lazy(() => import('../components/AISOPLORWriter'));
const ProgramRecommender = lazy(() => import('../components/ProgramRecommender'));

const SECTIONS = [
  {
    id: 'recommender',
    label: 'University Matcher',
    Icon: BookOpen,
    color: 'hsl(var(--blue-700))',
    bg: 'hsl(var(--blue-50))',
    desc: 'AI-powered university recommendations based on your budget, IELTS, and course.',
    Component: ProgramRecommender,
  },
  {
    id: 'scholarships',
    label: 'Scholarship Matcher',
    Icon: Award,
    color: '#f59e0b',
    bg: '#fef3c7',
    desc: 'Find scholarships you qualify for based on your profile, country, and course.',
    Component: ScholarshipMatcher,
  },
  {
    id: 'soplor',
    label: 'SOP / LOR Writer',
    Icon: PenTool,
    color: 'hsl(var(--blue-700))',
    bg: 'hsl(var(--blue-50))',
    desc: 'AI-powered Statement of Purpose and Letter of Recommendation drafting.',
    Component: AISOPLORWriter,
  },
  {
    id: 'cost',
    label: 'Cost of Living',
    Icon: DollarSign,
    color: '#10b981',
    bg: '#d1fae5',
    desc: 'Compare monthly expenses across cities — rent, food, transport, utilities.',
    Component: CostOfLivingCalculator,
  },
  {
    id: 'housing',
    label: 'Student Housing',
    Icon: Home,
    color: 'hsl(var(--blue-500))',
    bg: 'hsl(var(--blue-50))',
    desc: 'Browse on-campus and off-campus housing options by university and city.',
    Component: StudentHousing,
  },
  {
    id: 'mentors',
    label: 'Alumni Mentors',
    Icon: Users,
    color: '#ec4899',
    bg: '#fce7f3',
    desc: 'Connect with alumni who studied at your target universities for guidance.',
    Component: AlumniMentor,
  },
];

function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 rounded-full border-2 border-[hsl(var(--blue-100))] border-t-[hsl(var(--accent))] animate-spin" />
    </div>
  );
}

export default function StudentResources() {
  const [active, setActive] = useState(null);

  const current = SECTIONS.find(s => s.id === active);

  return (
    <div className="min-h-screen bg-white text-[hsl(var(--blue-900))]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-5 pt-28 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-[hsl(var(--accent))] mb-3">
            Student Tools
          </div>
          <h1 className="font-display font-extrabold text-[38px] sm:text-[52px] tracking-[-0.03em] text-[hsl(var(--blue-900))] leading-[1.05]">
            Resource Hub
          </h1>
          <p className="mt-4 text-[16px] text-[hsl(var(--blue-900))]/60 max-w-xl">
            Everything you need to prepare for studying abroad — scholarships, housing, costs, SOP writing, and alumni connections.
          </p>
        </motion.div>

        {!active && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {SECTIONS.map((s, i) => {
                const Icon = s.Icon;
                return (
                  <motion.button
                    key={s.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    onClick={() => setActive(s.id)}
                    className="group relative text-left rounded-2xl bg-white border border-black/5 p-6 hover:border-[hsl(var(--blue-700))]/20 hover:shadow-lg transition-all card-lift"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: s.bg }}>
                      <Icon className="w-6 h-6" style={{ color: s.color }} />
                    </div>
                    <div className="font-bold text-[17px] text-[hsl(var(--blue-900))] mb-1.5">{s.label}</div>
                    <div className="text-[13px] text-[hsl(var(--blue-900))]/60 leading-relaxed">{s.desc}</div>
                    <div className="mt-5 flex items-center gap-1 text-[12px] font-bold" style={{ color: s.color }}>
                      Open tool <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="mt-8 border-t border-black/5 pt-8">
              <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--blue-900))]/40 mb-4">Also useful</div>
              <div className="flex flex-wrap gap-3">
                {[
                  { to: '/intake-calendar', Icon: Calendar, label: 'Intake Calendar', desc: 'When to apply by country' },
                  { to: '/financial-tools', Icon: Banknote, label: 'Financial Tools', desc: 'GIC, budgets, loans' },
                  { to: '/universities', Icon: BookOpen, label: 'University Search', desc: 'Browse & compare universities' },
                ].map(({ to, Icon, label, desc }) => (
                  <Link key={to} to={to}
                    className="flex items-center gap-3 rounded-xl border border-black/5 bg-white px-4 py-3 hover:border-[hsl(var(--blue-700))]/20 hover:shadow-sm transition">
                    <Icon className="w-4 h-4 text-[hsl(var(--blue-900))]/40" />
                    <div>
                      <div className="font-bold text-[13px] text-[hsl(var(--blue-900))]">{label}</div>
                      <div className="text-[11.5px] text-[hsl(var(--blue-900))]/50">{desc}</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--blue-900))]/30 ml-2" />
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}

        {active && current && (
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => setActive(null)}
                  className="text-[13px] font-bold text-[hsl(var(--blue-900))]/50 hover:text-[hsl(var(--blue-900))] flex items-center gap-1"
                >
                  ← All Resources
                </button>
                <span className="text-[hsl(var(--blue-900))]/30">/</span>
                <span className="text-[13px] font-bold text-[hsl(var(--blue-900))]">{current.label}</span>
              </div>
              <Suspense fallback={<SectionLoader />}>
                <current.Component />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      <Footer />
    </div>
  );
}

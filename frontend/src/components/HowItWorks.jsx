import {
  ScanLine, ShieldCheck, Headphones, Lock, ArrowUpRight,
  Compass, Building2, FileCheck2, Scale, MessageSquare,
  CalendarClock, Plane, LifeBuoy,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { FEATURES, STEPS, STATS, SERVICES } from '../data/mock';
import Reveal from './Reveal';

const ICONS = {
  ScanLine, ShieldCheck, Headphones, Lock,
  Compass, Building2, FileCheck2, Scale, MessageSquare,
  CalendarClock, Plane, LifeBuoy,
};

function StepCard({ step, isLast, index = 0 }) {
  return (
    <Reveal index={index} className="relative">
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.25 }}
        className="relative rounded-2xl border border-black/5 bg-white p-7 h-full"
      >
        <div className="flex items-center justify-between">
          <div className="font-display font-extrabold text-[64px] leading-none text-[hsl(var(--blue-700))]">
            0{step.id}
          </div>
          <ArrowUpRight className="w-5 h-5 text-[hsl(var(--blue-900))]/30" />
        </div>
        <h3 className="mt-3 text-[22px] font-bold tracking-tight text-[hsl(var(--blue-900))]">{step.title}</h3>
        <p className="mt-2 text-[14.5px] leading-relaxed text-[hsl(var(--blue-900))]/65">{step.desc}</p>
        {!isLast && (
          <div className="hidden md:block absolute top-1/2 -right-3.5 h-px w-7 bg-black/10" />
        )}
      </motion.div>
    </Reveal>
  );
}

function FeatureCard({ feature, index = 0 }) {
  const Icon = ICONS[feature.icon] || ShieldCheck;
  return (
    <Reveal index={index}>
      <motion.div
        whileHover={{ y: -3 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl border border-black/5 bg-white p-6 hover:border-[hsl(var(--blue-700))]/15 hover:shadow-[0_20px_40px_-25px_rgba(10,44,138,0.3)] transition"
      >
        <div className="h-11 w-11 rounded-xl bg-[hsl(var(--blue-50))] flex items-center justify-center text-[hsl(var(--blue-700))]">
          <Icon className="w-5 h-5" />
        </div>
        <h4 className="mt-5 text-[16.5px] font-bold tracking-tight text-[hsl(var(--blue-900))]">{feature.title}</h4>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[hsl(var(--blue-900))]/65">{feature.desc}</p>
      </motion.div>
    </Reveal>
  );
}

function ServiceCard({ service, index = 0 }) {
  const Icon = ICONS[service.icon] || Compass;
  return (
    <Reveal index={index}>
      <motion.div
        whileHover={{ y: -4, transition: { duration: 0.25 } }}
        className="group rounded-2xl bg-white border border-black/5 p-6 hover:border-[hsl(var(--accent))]/30 hover:bg-[hsl(var(--blue-700))] hover:text-white transition-colors duration-300"
      >
        <div className="h-12 w-12 rounded-xl bg-[hsl(var(--accent))]/10 group-hover:bg-white/15 flex items-center justify-center text-[hsl(var(--accent))] group-hover:text-white transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <h4 className="mt-5 text-[17px] font-bold tracking-tight">{service.title}</h4>
        <p className="mt-1.5 text-[13.5px] leading-relaxed opacity-75">{service.desc}</p>
      </motion.div>
    </Reveal>
  );
}

function StatCard({ stat, index = 0 }) {
  return (
    <Reveal index={index} direction="up">
      <div>
        <div className="font-display font-extrabold text-[44px] sm:text-[54px] leading-none">{stat.value}</div>
        <div className="mt-2 text-[13.5px] text-white/65">{stat.label}</div>
      </div>
    </Reveal>
  );
}

export default function HowItWorks() {
  return (
    <section id="services" className="relative py-20 sm:py-28 bg-[hsl(var(--soft-bg))] border-y border-black/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
            How We Hive works
          </div>
          <h2 className="mt-3 text-[32px] sm:text-[52px] leading-[1.05] font-display font-extrabold tracking-[-0.03em]">
            <span className="gradient-text-hover">Three steps. Zero stress.</span>{' '}
            <span className="gradient-text">One promise.</span>
          </h2>
          <p className="mt-4 text-[15px] sm:text-[16px] leading-relaxed text-[hsl(var(--blue-900))]/65 max-w-2xl">
            Honest timelines, transparent fees, and a senior consultant on
            every case. From your first walk-in to your boarding gate.
          </p>
        </Reveal>

        <div className="mt-12 sm:mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-7">
          {STEPS.map((s, i) => (
            <StepCard key={s.id} step={s} isLast={i === STEPS.length - 1} index={i} />
          ))}
        </div>

        {/* Real services */}
        <div className="mt-16 sm:mt-20">
          <Reveal className="flex items-end justify-between flex-wrap gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
                Service in every detail
              </div>
              <h3 className="mt-2 text-[26px] sm:text-[40px] font-display font-extrabold tracking-[-0.025em] text-[hsl(var(--blue-900))]">
                Everything we handle for you
              </h3>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {SERVICES.map((s, i) => (
              <ServiceCard key={s.id} service={s} index={i} />
            ))}
          </div>
        </div>

        {/* Why us */}
        <div className="mt-16 sm:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.id} feature={f} index={i} />
          ))}
        </div>

        {/* Stats strip */}
        <Reveal className="mt-14 sm:mt-16 rounded-3xl bg-[hsl(var(--blue-900))] text-white p-8 sm:p-10 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-[260px] w-[260px] rounded-full bg-[hsl(var(--accent))]/20 blur-3xl" />
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <StatCard key={s.id} stat={s} index={i} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

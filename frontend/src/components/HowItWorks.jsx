import {
  ScanLine, ShieldCheck, Headphones, Lock,
  Compass, Building2, FileCheck2, Scale, MessageSquare,
  CalendarClock, Plane, LifeBuoy,
} from 'lucide-react';
import { FEATURES, STEPS, STATS, SERVICES } from '../data/mock';
import Reveal from './Reveal';

const ICONS = {
  ScanLine, ShieldCheck, Headphones, Lock,
  Compass, Building2, FileCheck2, Scale, MessageSquare,
  CalendarClock, Plane, LifeBuoy,
};

function StepCard({ step, index = 0 }) {
  return (
    <Reveal index={index} className="relative">
      <div className="card-surface card-lift p-6 sm:p-7 h-full">
        <div className="font-display font-bold text-[40px] leading-none tracking-[-0.02em] text-[hsl(var(--blue-700))]">
          0{step.id}
        </div>
        <h3 className="h-card mt-5">{step.title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{step.desc}</p>
      </div>
    </Reveal>
  );
}

function FeatureCard({ feature, index = 0 }) {
  const Icon = ICONS[feature.icon] || ShieldCheck;
  return (
    <Reveal index={index}>
      <div className="h-full p-1">
        <span className="icon-tile">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </span>
        <h4 className="mt-4 text-[16px] font-semibold text-[hsl(var(--blue-900))]">{feature.title}</h4>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{feature.desc}</p>
      </div>
    </Reveal>
  );
}

function ServiceCard({ service, index = 0 }) {
  const Icon = ICONS[service.icon] || Compass;
  return (
    <Reveal index={index}>
      <div className="card-surface card-lift p-6 h-full hover:border-[hsl(var(--blue-200))]">
        <span className="icon-tile">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </span>
        <h4 className="mt-5 text-[17px] font-semibold text-[hsl(var(--blue-900))]">{service.title}</h4>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{service.desc}</p>
      </div>
    </Reveal>
  );
}

function StatCard({ stat, index = 0 }) {
  return (
    <Reveal index={index} direction="up">
      <div className="border-l-2 border-[hsl(var(--blue-100))] pl-4">
        <div className="font-display font-bold text-[36px] sm:text-[44px] leading-none tracking-[-0.02em] text-[hsl(var(--blue-900))]">{stat.value}</div>
        <div className="mt-2 text-[14px] text-muted-foreground">{stat.label}</div>
      </div>
    </Reveal>
  );
}

export default function HowItWorks() {
  return (
    <section id="services" className="section section-tint border-y border-[hsl(var(--border))]">
      <div className="container-page">
        <Reveal className="max-w-3xl">
          <div className="eyebrow">How We Hive works</div>
          <h2 className="h-section mt-3">
            Three steps. One promise.
          </h2>
          <p className="lead mt-4 max-w-2xl">
            Honest timelines, transparent fees, and a senior consultant on
            every case. From your first walk-in to your boarding gate.
          </p>
        </Reveal>

        <div className="mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {STEPS.map((s, i) => (
            <StepCard key={s.id} step={s} index={i} />
          ))}
        </div>

        {/* Real services */}
        <div className="mt-16 sm:mt-20">
          <Reveal className="mb-8">
            <div className="eyebrow">Service in every detail</div>
            <h3 className="h-section mt-3">Everything we handle for you</h3>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SERVICES.map((s, i) => (
              <ServiceCard key={s.id} service={s} index={i} />
            ))}
          </div>
        </div>

        {/* Why us */}
        <div className="mt-16 sm:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.id} feature={f} index={i} />
          ))}
        </div>

        {/* Stats strip */}
        <Reveal className="mt-14 sm:mt-16 card-surface p-6 sm:p-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
            {STATS.map((s, i) => (
              <StatCard key={s.id} stat={s} index={i} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

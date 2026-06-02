import { ComponentType } from 'react';

interface ApplicationTimelineSectionProps {
  app: {
    timeline?: unknown[];
    status?: string;
  };
  TimelineComponent: ComponentType<{ events: unknown[]; currentStatus?: string }>;
}

export default function ApplicationTimelineSection({
  app,
  TimelineComponent,
}: ApplicationTimelineSectionProps) {
  return (
    <section className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8">
      <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
        Application timeline
      </div>
      <h2 className="mt-1 font-display font-extrabold text-[24px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
        Track every step
      </h2>
      <div className="mt-6">
        <TimelineComponent events={app.timeline || []} currentStatus={app.status} />
      </div>
    </section>
  );
}

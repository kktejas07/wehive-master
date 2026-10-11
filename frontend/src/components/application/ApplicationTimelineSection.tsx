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
    <section className="rounded-2xl bg-white border border-border shadow-sm p-5 sm:p-8">
      <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))]">
        Application timeline
      </div>
      <h2 className="mt-1 font-display font-bold text-[24px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
        Track every step
      </h2>
      <div className="mt-6">
        <TimelineComponent events={app.timeline || []} currentStatus={app.status} />
      </div>
    </section>
  );
}

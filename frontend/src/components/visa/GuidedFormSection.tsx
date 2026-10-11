'use client';
import { motion } from 'framer-motion';
import { FileText, Zap, Clock } from 'lucide-react';

export default function GuidedFormSection({ countryName }) {
  const formTimeSaved = {
    government: '6+ Hours',
    wehive: '10 Min',
  };

  return (
    <section className="py-16 md:py-24 bg-[hsl(var(--soft-bg))] border-t border-[hsl(var(--border))]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-3">
            <FileText className="w-3.5 h-3.5" />
            Guided Application
          </div>
          <h2 className="font-display font-bold text-[28px] sm:text-[36px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-tight">
            Guided {countryName} Application
          </h2>
          <p className="mt-3 text-[16px] text-muted-foreground max-w-xl mx-auto">
            While the {countryName} application form takes 6+ hours on the government website, We Hive simplifies it into quick and easy questions.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl border border-[hsl(var(--border))] shadow-sm p-6 text-center"
          >
            <div className="w-14 h-14 rounded-xl bg-[hsl(var(--soft-bg))] flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-muted-foreground" />
            </div>
            <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground mb-2">
              Government Website
            </div>
            <div className="font-display font-bold text-[32px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
              {formTimeSaved.government}
            </div>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Complex forms, confusing fields, no guidance
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl border-2 border-[hsl(var(--blue-700))] shadow-sm p-6 text-center"
          >
            <div className="w-14 h-14 rounded-xl bg-[hsl(var(--blue-50))] flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-[hsl(var(--blue-700))]" />
            </div>
            <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-2">
              With We Hive
            </div>
            <div className="font-display font-bold text-[32px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
              {formTimeSaved.wehive}
            </div>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Simple questions, auto-save, real-time validation
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 flex flex-wrap justify-center gap-2 sm:gap-3"
        >
          {['Auto-save progress', 'Real-time validation', 'Document checklist', 'Interview tips'].map((feature) => (
            <div key={feature} className="inline-flex items-center gap-2 rounded-full bg-white border border-[hsl(var(--border))] px-4 py-2 text-[12px] font-bold text-[hsl(var(--blue-900))]">
              <Zap className="w-3.5 h-3.5 text-[hsl(var(--blue-700))]" />
              {feature}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
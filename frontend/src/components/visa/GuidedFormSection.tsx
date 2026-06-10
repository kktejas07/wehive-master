'use client';
import { motion } from 'framer-motion';
import { FileText, Zap, Clock } from 'lucide-react';

export default function GuidedFormSection({ countryName }) {
  const formTimeSaved = {
    government: '6+ Hours',
    wehive: '10 Min',
  };

  return (
    <section className="py-16 bg-[hsl(var(--soft-bg))] border-t border-black/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-3">
            <FileText className="w-3.5 h-3.5" />
            Guided Application
          </div>
          <h2 className="font-display font-extrabold text-[26px] sm:text-[36px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
            Guided {countryName} Application
          </h2>
          <p className="mt-3 text-[14px] text-[hsl(var(--blue-900))]/60 max-w-xl mx-auto">
            While the {countryName} application form takes 6+ hours on the government website, We Hive simplifies it into quick and easy questions.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl border border-black/5 p-6 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-red-500" />
            </div>
            <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-red-500 mb-2">
              Government Website
            </div>
            <div className="font-display font-extrabold text-[32px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
              {formTimeSaved.government}
            </div>
            <p className="mt-2 text-[13px] text-[hsl(var(--blue-900))]/60">
              Complex forms, confusing fields, no guidance
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-900))] rounded-2xl p-6 text-center text-white"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/70 mb-2">
              With We Hive
            </div>
            <div className="font-display font-extrabold text-[32px] tracking-[-0.03em]">
              {formTimeSaved.wehive}
            </div>
            <p className="mt-2 text-[13px] text-white/80">
              Simple questions, auto-save, real-time validation
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 flex flex-wrap justify-center gap-4"
        >
          {['Auto-save progress', 'Real-time validation', 'Document checklist', 'Interview tips'].map((feature) => (
            <div key={feature} className="inline-flex items-center gap-2 rounded-full bg-white border border-black/10 px-4 py-2 text-[12px] font-bold text-[hsl(var(--blue-900))]">
              <Zap className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
              {feature}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
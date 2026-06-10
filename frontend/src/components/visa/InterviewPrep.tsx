'use client';
import { motion } from 'framer-motion';
import { MessageSquare, UserCheck, RefreshCw, Star } from 'lucide-react';

const INTERVIEW_FEATURES = [
  {
    icon: MessageSquare,
    title: 'AI Interview Simulator',
    description: 'Practice with our AI bot trained on thousands of real interview questions and consular patterns.',
  },
  {
    icon: UserCheck,
    title: 'Consular Officer Trained',
    description: 'Our bot is trained on actual US consulate officer behaviors and common pitfalls.',
  },
  {
    icon: RefreshCw,
    title: 'Get Feedback to Improve',
    description: 'Receive instant feedback on your answers and suggestions for improvement.',
  },
];

export default function InterviewPrep({ countryName }) {
  return (
    <section className="py-16 bg-white border-t border-black/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-3">
            <MessageSquare className="w-3.5 h-3.5" />
            Interview Preparation
          </div>
          <h2 className="font-display font-extrabold text-[26px] sm:text-[36px] tracking-[-0.03em]">
            <span className="gradient-text-hover">Mock {countryName} Interview Tool</span>
          </h2>
          <p className="mt-3 text-[14px] text-[hsl(var(--blue-900))]/60 max-w-xl mx-auto">
            This is a crucial piece to your approval and we have built an extensive bot (fully free for you!) to train and understand where you stand.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="space-y-4">
              {INTERVIEW_FEATURES.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 bg-[hsl(var(--soft-bg))] rounded-2xl p-5"
                >
                  <div className="w-12 h-12 rounded-xl bg-white border border-black/5 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-[hsl(var(--blue-700))]" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-[15px] text-[hsl(var(--blue-900))]">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-[13px] text-[hsl(var(--blue-900))]/60 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] text-white px-4 py-2 text-[12px] font-bold">
                <Star className="w-3.5 h-3.5" />
                FREE
              </div>
              <span className="text-[13px] text-[hsl(var(--blue-900))]/60">
                Use as many times as you need
              </span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-900))] rounded-3xl p-8 text-white text-center"
            >
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10" />
              </div>
              <h3 className="font-display font-extrabold text-[22px]">
                Start Your Practice Session
              </h3>
              <p className="mt-3 text-white/70 text-[14px]">
                Get instant feedback and improve your chances of approval
              </p>
              <button className="mt-6 w-full rounded-full bg-white text-[hsl(var(--blue-900))] h-12 font-bold transition hover:bg-white/90">
                Start Free Practice
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
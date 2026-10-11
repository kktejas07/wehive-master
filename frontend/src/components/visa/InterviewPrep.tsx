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
    <section className="py-16 md:py-24 bg-white border-t border-[hsl(var(--border))]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-3">
            <MessageSquare className="w-3.5 h-3.5" />
            Interview Preparation
          </div>
          <h2 className="font-display font-bold text-[28px] sm:text-[36px] tracking-[-0.02em] text-[hsl(var(--blue-900))] leading-tight">
            <span>Mock {countryName} Interview Tool</span>
          </h2>
          <p className="mt-3 text-[16px] text-muted-foreground max-w-xl mx-auto">
            This is a crucial piece to your approval and we have built an extensive bot (fully free for you!) to train and understand where you stand.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="space-y-4">
              {INTERVIEW_FEATURES.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 bg-white border border-[hsl(var(--border))] rounded-2xl p-5"
                >
                  <div className="w-12 h-12 rounded-xl bg-[hsl(var(--blue-50))] flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-[hsl(var(--blue-700))]" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-[18px] text-[hsl(var(--blue-900))]">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-[14px] text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] px-4 py-2 text-[12px] font-semibold">
                <Star className="w-3.5 h-3.5" />
                FREE
              </div>
              <span className="text-[13px] text-muted-foreground">
                Use as many times as you need
              </span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-[hsl(var(--blue-900))] rounded-2xl p-6 sm:p-8 text-white text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-[22px]">
                Start Your Practice Session
              </h3>
              <p className="mt-3 text-white/80 text-[16px]">
                Get instant feedback and improve your chances of approval
              </p>
              <button className="mt-6 w-full rounded-xl bg-white text-[hsl(var(--blue-900))] h-12 font-semibold transition-colors hover:bg-[hsl(var(--blue-50))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--blue-900))]">
                Start Free Practice
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
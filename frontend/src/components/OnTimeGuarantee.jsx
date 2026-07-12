import { motion } from 'framer-motion';
import { Shield, Clock, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, Phone } from 'lucide-react';
import Reveal from './Reveal';
import { BRAND } from '../data/mock';

const MISSED_CASES = [
  { name: 'Priya Sharma', missed_by: '2 days', reason: 'Singapore Passport Pickup Delay', avatar: 'PS' },
  { name: 'Rahul Mehta', missed_by: '4 hrs', reason: 'Vietnam Visa Correction', avatar: 'RM' },
  { name: 'Anita Desai', missed_by: '23 min', reason: 'Oman Visa Public Holiday', avatar: 'AD' },
];

const TRUST_POINTS = [
  {
    Icon: Shield,
    title: '100% Refund if we miss',
    desc: 'If we cannot deliver your visa within the promised timeframe, you get a full refund — guaranteed. You still receive your visa when it arrives.',
  },
  {
    Icon: Clock,
    title: 'Data-driven timelines',
    desc: 'We leverage historical visa timelines, PRO team insights, seasonal variations, and embassy holidays to give you accurate delivery estimates.',
  },
  {
    Icon: RefreshCw,
    title: 'Real-time tracking',
    desc: 'Track your visa application live as it moves through stages. Our team monitors every application to ensure timely delivery.',
  },
];

export default function OnTimeGuarantee() {
  return (
    <section className="relative py-16 sm:py-24 bg-[hsl(var(--blue-900))] overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[hsl(var(--accent))] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-400 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
        <Reveal className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))] mb-4">
            <Shield className="w-4 h-4" />
            Our promise
          </div>
          <h2 className="font-display font-extrabold text-[42px] sm:text-[56px] lg:text-[64px] tracking-[-0.03em] leading-[1.05] text-white">
            On Time.
            <br />
            <span className="text-[hsl(var(--accent))]">Guaranteed.</span>
          </h2>
          <p className="mt-6 text-[16px] sm:text-[18px] text-white/70 max-w-2xl mx-auto leading-relaxed">
            We understand the anxiety of the visa process. That's why we commit to delivering your visa exactly as promised — or we make it right.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {TRUST_POINTS.map((point, i) => {
            const Icon = point.Icon;
            return (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="relative rounded-2xl p-7 bg-white/5 backdrop-blur border border-white/10"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))] mb-5">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-[18px] font-display font-extrabold text-white mb-3">
                  {point.title}
                </h3>
                <p className="text-[14px] text-white/60 leading-relaxed">
                  {point.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

        <Reveal>
          <div className="rounded-3xl p-8 sm:p-10 bg-white/5 backdrop-blur border border-white/10">
            <div className="flex items-start gap-4 mb-6">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[20px] font-display font-extrabold text-white mb-1">
                  When we miss our commitment
                </h3>
                <p className="text-[14px] text-white/60">
                  We believe in radical transparency. Here's when and why we've missed our on-time guarantee:
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {MISSED_CASES.map((c, i) => (
                <motion.div
                  key={c.name}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="rounded-xl p-5 bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[13px] font-bold">
                      {c.avatar}
                    </div>
                    <div>
                      <div className="text-[14px] font-bold text-white">{c.name}</div>
                      <div className="text-[11px] text-red-400 font-medium">Missed by {c.missed_by}</div>
                    </div>
                  </div>
                  <div className="text-[12px] text-white/50">{c.reason}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-12 text-center">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[13px] font-bold">
              <CheckCircle2 className="w-4 h-4" />
              On-time delivery rate: 98.6%
            </div>
            <p className="text-white/60 text-[14px] max-w-md">
              We process visas across 120+ destinations. Our PRO team monitors every application to ensure it reaches you on time.
            </p>
            <a
              href={`tel:${BRAND.phoneRaw}`}
              className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[hsl(var(--accent))] text-white font-bold hover:opacity-90 transition"
            >
              <Phone className="w-4 h-4" />
              Talk to our team
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
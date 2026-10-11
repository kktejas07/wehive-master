import { motion } from 'framer-motion';
import { Shield, Clock, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, Phone } from 'lucide-react';
import Reveal from './Reveal';
import { BRAND, KEY_STATS } from '../data/mock';

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
    <section className="relative section bg-white">
      <div className="container-page">
        <Reveal className="text-center mb-12 md:mb-16">
          <div className="eyebrow inline-flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4" aria-hidden="true" />
            Our promise
          </div>
          <h2 className="h-section">
            On Time. Guaranteed.
          </h2>
          <p className="lead mt-5 max-w-2xl mx-auto">
            We understand the anxiety of the visa process. That's why we commit to delivering your visa exactly as promised — or we make it right.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-12 md:mb-16">
          {TRUST_POINTS.map((point, i) => {
            const Icon = point.Icon;
            return (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.3, ease: 'easeOut' }}
                className="relative card-surface p-6 sm:p-7"
              >
                <div className="icon-tile mb-5">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="h-card mb-2">
                  {point.title}
                </h3>
                <p className="text-[15px] text-muted-foreground leading-relaxed">
                  {point.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

        <Reveal>
          <div className="rounded-2xl p-6 sm:p-10 bg-[hsl(var(--soft-bg))] border border-[hsl(var(--border))]">
            <div className="flex items-start gap-4 mb-6">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="h-card mb-1">
                  When we miss our commitment
                </h3>
                <p className="text-[15px] text-muted-foreground">
                  We believe in radical transparency. Here's when and why we've missed our on-time guarantee:
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {MISSED_CASES.map((c, i) => (
                <motion.div
                  key={c.name}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.3, ease: 'easeOut' }}
                  className="rounded-xl p-5 bg-white border border-[hsl(var(--border))]"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--blue-50))] flex items-center justify-center text-[hsl(var(--blue-700))] text-[13px] font-semibold">
                      {c.avatar}
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold text-[hsl(var(--blue-900))]">{c.name}</div>
                      <div className="text-[12px] text-red-700 font-medium">Missed by {c.missed_by}</div>
                    </div>
                  </div>
                  <div className="text-[13px] text-muted-foreground">{c.reason}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-12 text-center">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              On-time delivery rate: {KEY_STATS.onTimeRate}
            </div>
            <p className="text-muted-foreground text-[15px] max-w-md">
              We process visas across {KEY_STATS.countries} countries. Our PRO team monitors every application to ensure it reaches you on time.
            </p>
            <a
              href={`tel:${BRAND.phoneRaw}`}
              className="mt-2 inline-flex items-center gap-2 h-12 px-6 rounded-xl btn-accent font-semibold"
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
'use client';
import { motion } from 'framer-motion';
import { UserCheck, ShieldCheck, BarChart2, AlertTriangle } from 'lucide-react';

const COMPARISON_ITEMS = [
  {
    icon: UserCheck,
    title: 'Built around your profile',
    others: 'Give everyone the same long checklist.',
    atlys: 'We create a custom checklist based on your profile to get you approved.',
    img: 'https://images.unsplash.com/photo-1434626881859-194d67b2b86f?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: ShieldCheck,
    title: 'We verify everything. Not just forward it.',
    others: 'Collect your documents and forward as-is.',
    atlys: 'We check every document. Because one weak document can undo everything.',
    img: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca55?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: BarChart2,
    title: 'Backed by Data. Not Generic Advice.',
    others: 'Treat every case in isolation.',
    atlys: 'We use insights from past applications to predict risks & plug gaps.',
    img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: AlertTriangle,
    title: 'Catches risks before submission',
    others: 'Discover issues only after rejection.',
    atlys: 'We spot red flags and fix them before submission.',
    img: 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?auto=format&fit=crop&w=600&q=80',
  },
];

function ComparisonCard({ item, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="bg-white rounded-2xl border border-black/5 overflow-hidden"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <img src={item.img} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4">
          <item.icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-display font-extrabold text-[18px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
          {item.title}
        </h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
            <p className="text-[13px] text-[hsl(var(--blue-900))]/60 leading-relaxed">{item.others}</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--accent))] mt-1.5 flex-shrink-0" />
            <p className="text-[13px] text-[hsl(var(--blue-900))]/80 leading-relaxed">{item.atlys}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function VisaComparison({ countryName }) {
  return (
    <section className="py-16 bg-[hsl(var(--soft-bg))]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display font-extrabold text-[28px] sm:text-[38px] tracking-[-0.03em]">
            <span className="gradient-text-hover">We optimize for approval,</span>
            <br />
            <span className="gradient-text">not submission</span>
          </h2>
          <p className="mt-3 text-[15px] text-[hsl(var(--blue-900))]/60 max-w-xl mx-auto">
            Here&apos;s the comparison between others and We Hive for your {countryName} visa.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {COMPARISON_ITEMS.map((item, i) => (
            <ComparisonCard key={item.title} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
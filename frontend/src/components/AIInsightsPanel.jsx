import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AIInsightsPanel({ profileData = {} }) {
  // Mock fallback if profileData is empty
  const {
    crsScore = 448,
    targetCountry = 'Canada',
    ieltsScore = 'CLB 8',
    documentStatus = 'pending_action',
    daysToDeadline = 12,
  } = profileData;

  const insights = [
    {
      id: 1,
      type: 'warning',
      title: 'Action Required: Transcript Audit',
      desc: 'Our AI Document Validator detected a signature occlusion on page 2. Re-upload a clear scan to avoid filing rejection.',
      cta: 'Manage Documents',
      to: '/account',
      icon: AlertCircle,
      color: 'rose',
    },
    {
      id: 2,
      type: 'insight',
      title: 'CRS Point Booster (+24 points)',
      desc: `Your current score is ${crsScore}. Elevating your IELTS score from ${ieltsScore} to CLB 9 increases your profile weight by 24 points, matching the last draw threshold.`,
      cta: 'View Prep Resources',
      to: '/resources',
      icon: Sparkles,
      color: 'amber',
    },
    {
      id: 3,
      type: 'info',
      title: 'Upcoming Intake Deadline',
      desc: `The Fall 2026 application portal for premium Universities in ${targetCountry} closes in ${daysToDeadline} days. Finalize your LORs soon.`,
      cta: 'View Intake Calendar',
      to: '/intake-calendar',
      icon: Info,
      color: 'blue',
    },
  ];

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-xl shadow-blue-900/5 relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-[hsl(var(--accent))]/10 blur-xl pointer-events-none" />

      <div className="flex items-center gap-2 mb-6">
        <span className="h-8 w-8 rounded-lg bg-[hsl(var(--soft-bg))] text-[hsl(var(--accent))] inline-flex items-center justify-center shrink-0">
          <Sparkles className="w-4.5 h-4.5 animate-pulse" />
        </span>
        <div>
          <h3 className="font-display font-extrabold text-[16px] text-[hsl(var(--blue-900))]">
            AI Insights & Smart Suggestions
          </h3>
          <p className="text-[11.5px] text-[hsl(var(--blue-900))]/50">
            Real-time recommendations curated by WeHive Multi-Agent System
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {insights.map((insight) => {
          const Icon = insight.icon;
          const isRose = insight.color === 'rose';
          const isAmber = insight.color === 'amber';
          
          return (
            <div 
              key={insight.id}
              className={`p-4.5 rounded-2xl border transition-all ${
                isRose 
                  ? 'bg-rose-50/40 border-rose-100/60' 
                  : isAmber 
                  ? 'bg-amber-50/40 border-amber-100/60' 
                  : 'bg-blue-50/40 border-blue-100/60'
              }`}
            >
              <div className="flex gap-3">
                <span className={`h-7 w-7 rounded-lg inline-flex items-center justify-center shrink-0 ${
                  isRose 
                    ? 'bg-rose-100 text-rose-600' 
                    : isAmber 
                    ? 'bg-amber-100 text-amber-600' 
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 space-y-1">
                  <div className="font-extrabold text-[13.5px] text-[hsl(var(--blue-900))]">
                    {insight.title}
                  </div>
                  <p className="text-[12px] text-[hsl(var(--blue-900))]/70 leading-relaxed">
                    {insight.desc}
                  </p>
                  
                  <div className="pt-2">
                    <Link
                      to={insight.to}
                      className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider ${
                        isRose 
                          ? 'text-rose-700 hover:text-rose-800' 
                          : isAmber 
                          ? 'text-amber-700 hover:text-amber-800' 
                          : 'text-blue-700 hover:text-blue-800'
                      }`}
                    >
                      {insight.cta} <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

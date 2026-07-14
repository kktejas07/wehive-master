import { Sparkles, ArrowRight, AlertCircle, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

// profileData must be explicitly supplied with real, user-derived values (crsScore from an
// actual assessment, documentStatus from an actual scan, etc). There is no mock/placeholder
// fallback here on purpose — this panel previously showed hardcoded example content
// ("Your current score is 448...") to every account regardless of whether they had taken an
// assessment or uploaded anything, which read as fabricated AI output. See F7 in
// playwright/REPORT.md.
export default function AIInsightsPanel({ profileData }) {
  const insights = [];

  if (profileData?.documentIssue) {
    insights.push({
      id: 'doc-issue',
      title: 'Action required: document issue detected',
      desc: profileData.documentIssue,
      cta: 'Manage documents',
      to: '/account',
      icon: AlertCircle,
      color: 'rose',
    });
  }

  if (profileData?.crsScore != null && profileData?.ieltsScore) {
    insights.push({
      id: 'crs-booster',
      title: 'Score improvement opportunity',
      desc: `Your current score is ${profileData.crsScore}. Improving your IELTS band from ${profileData.ieltsScore} could raise your profile weight.`,
      cta: 'View prep resources',
      to: '/resources',
      icon: Sparkles,
      color: 'amber',
    });
  }

  if (profileData?.targetCountry && profileData?.daysToDeadline != null) {
    insights.push({
      id: 'deadline',
      title: 'Upcoming intake deadline',
      desc: `An intake window for ${profileData.targetCountry} closes in ${profileData.daysToDeadline} days.`,
      cta: 'View intake calendar',
      to: '/intake-calendar',
      icon: Info,
      color: 'blue',
    });
  }

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-xl shadow-blue-900/5 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-[hsl(var(--accent))]/10 blur-xl pointer-events-none" />

      <div className="flex items-center gap-2 mb-6">
        <span className="h-8 w-8 rounded-lg bg-[hsl(var(--soft-bg))] text-[hsl(var(--accent))] inline-flex items-center justify-center shrink-0">
          <Sparkles className="w-4.5 h-4.5" />
        </span>
        <div>
          <h3 className="font-display font-extrabold text-[16px] text-[hsl(var(--blue-900))]">
            AI Insights & Smart Suggestions
          </h3>
          <p className="text-[11.5px] text-[hsl(var(--blue-900))]/50">
            Personalized recommendations based on your applications and documents
          </p>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-[hsl(var(--soft-bg))]/60 p-6 text-center">
          <Info className="w-5 h-5 text-[hsl(var(--blue-900))]/40 mx-auto mb-2" />
          <p className="text-[13px] font-semibold text-[hsl(var(--blue-900))]">No insights yet</p>
          <p className="mt-1 text-[12px] text-[hsl(var(--blue-900))]/60">
            Start an application, take the visa assessment, or upload a document and we'll surface personalized suggestions here.
          </p>
        </div>
      ) : (
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
      )}
    </div>
  );
}

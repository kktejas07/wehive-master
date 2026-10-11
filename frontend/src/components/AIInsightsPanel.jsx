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
    <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-sm">

      <div className="flex items-center gap-2 mb-5">
        <span className="h-8 w-8 rounded-lg bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] inline-flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </span>
        <div>
          <h3 className="font-display font-bold text-[16px] text-[hsl(var(--blue-900))]">
            AI Insights & Smart Suggestions
          </h3>
          <p className="text-[12px] text-muted-foreground">
            Personalized recommendations based on your applications and documents
          </p>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-[hsl(var(--soft-bg))]/60 p-6 text-center">
          <Info className="w-5 h-5 text-[hsl(var(--blue-900))]/40 mx-auto mb-2" />
          <p className="text-[13px] font-semibold text-[hsl(var(--blue-900))]">No insights yet</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
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
                className={`p-4 rounded-xl border transition-colors ${
                  isRose
                    ? 'bg-red-50/60 border-red-100'
                    : isAmber
                    ? 'bg-amber-50/60 border-amber-100'
                    : 'bg-[hsl(var(--blue-50))]/60 border-[hsl(var(--blue-700))]/10'
                }`}
              >
                <div className="flex gap-3">
                  <span className={`h-7 w-7 rounded-lg inline-flex items-center justify-center shrink-0 ${
                    isRose
                      ? 'bg-red-100 text-red-700'
                      : isAmber
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))]'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="flex-1 space-y-1">
                    <div className="font-bold text-[14px] text-[hsl(var(--blue-900))]">
                      {insight.title}
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      {insight.desc}
                    </p>
                    <div className="pt-2">
                      <Link
                        to={insight.to}
                        className={`inline-flex items-center gap-1 text-[13px] font-semibold ${
                          isRose
                            ? 'text-red-700 hover:text-red-800'
                            : isAmber
                            ? 'text-amber-700 hover:text-amber-800'
                            : 'text-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-800))]'
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

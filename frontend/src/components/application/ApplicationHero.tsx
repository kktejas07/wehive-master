import { Link } from 'react-router-dom';
import { ChevronRight, Download, Send, Loader2, Sparkles, Share2, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { COUNTRIES } from '../../data/mock';

interface AppShape {
  id: string;
  country_id?: string;
  visa_type?: string;
  status?: string;
}

interface CountryShape {
  name: string;
  flag?: string;
}

interface ApplicationHeroProps {
  app: AppShape;
  country: CountryShape;
  readyCount: number;
  requiredDocs: unknown[];
  submitting?: boolean;
  canSubmit?: boolean;
  onScan: () => void;
  onCoverLetter: () => void;
  onItinerary: () => void;
  onRiskAnalysis: () => void;
  onDownloadReceipt: () => void;
  onSubmit: () => void;
}

export default function ApplicationHero({
  app,
  country,
  readyCount,
  requiredDocs,
  submitting,
  canSubmit,
  onScan,
  onCoverLetter,
  onItinerary,
  onRiskAnalysis,
  onDownloadReceipt,
  onSubmit,
}: ApplicationHeroProps) {
  const heroImg = COUNTRIES.find((c) => c.id === app.country_id)?.image;

  return (
    <section className="pt-24 sm:pt-28 pb-8 sm:pb-10 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Link to="/account?tab=applications" className="hover:text-[hsl(var(--blue-700))]">My applications</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[hsl(var(--blue-900))] font-bold">
            {country.name} · {app.visa_type}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            {heroImg && (
              <div className="hidden sm:block relative h-20 w-20 rounded-2xl overflow-hidden">
                <img src={heroImg} alt={country.name} className="absolute inset-0 h-full w-full object-cover" />
              </div>
            )}
            <div>
              <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))]">
                Application #{app.id.slice(0, 8).toUpperCase()}
              </div>
              <h1 className="mt-1 font-display font-bold text-[32px] sm:text-[44px] leading-[1.1] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
                <span className="text-[28px] sm:text-[40px] mr-2">{country.flag}</span>
                {country.name}{' '}
                <span className="text-[hsl(var(--blue-700))]">{app.visa_type}</span>
              </h1>
              <div className="mt-1 text-[14px] text-muted-foreground">
                Status: <span className="font-bold capitalize">{(app.status || 'draft').replace('_', ' ')}</span>
                {' · '}{readyCount}/{requiredDocs.length} docs ready
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              data-testid="open-ai-scan-btn"
              onClick={onScan}
              variant="outline"
              className="rounded-xl h-11 px-4 font-semibold bg-white border-slate-300 text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-700))]/40 hover:text-[hsl(var(--blue-700))]"
            >
              <Sparkles className="w-4 h-4 mr-1" /> Scan with AI
            </Button>
            <Button
              onClick={onCoverLetter}
              variant="outline"
              className="rounded-xl h-11 px-4 font-semibold bg-white border-slate-300 text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-700))]/40 hover:text-[hsl(var(--blue-700))]"
            >
              Cover Letter
            </Button>
            <Button
              onClick={onItinerary}
              variant="outline"
              className="rounded-xl h-11 px-4 font-semibold bg-white border-slate-300 text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-700))]/40 hover:text-[hsl(var(--blue-700))]"
            >
              AI Itinerary
            </Button>
            <Button
              onClick={onRiskAnalysis}
              variant="outline"
              className="rounded-xl h-11 px-4 font-semibold bg-white border-slate-300 text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-700))]/40 hover:text-[hsl(var(--blue-700))]"
            >
              Risk Analysis
            </Button>
            <Button
              onClick={onDownloadReceipt}
              variant="outline"
              className="rounded-xl h-11 px-4 font-semibold bg-white border-slate-300 text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-700))]/40 hover:text-[hsl(var(--blue-700))]"
            >
              <Download className="w-4 h-4 mr-1" /> Download receipt
            </Button>
            <a
              href={`/track/${app.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl h-11 px-4 text-[14px] font-semibold bg-white border border-slate-300 hover:border-[hsl(var(--blue-700))]/40 text-[hsl(var(--blue-900))] hover:text-[hsl(var(--blue-700))] transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Track status
            </a>
            <Button variant="accent"
              onClick={onSubmit}
              disabled={!canSubmit || submitting}
              className="rounded-xl text-white h-11 px-5 font-semibold disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Send className="w-4 h-4" />
                  {app.status === 'draft' ? 'Submit application' : 'Already submitted'}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

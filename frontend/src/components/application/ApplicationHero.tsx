import { Link } from 'react-router-dom';
import { ChevronRight, Download, Send, Loader2, Sparkles } from 'lucide-react';
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
    <section className="pt-28 pb-10 bg-[hsl(var(--soft-bg))] border-b border-black/5 aurora-bg aurora-grain">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center gap-1.5 text-[13px] text-[hsl(var(--blue-900))]/55">
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
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
                Application #{app.id.slice(0, 8).toUpperCase()}
              </div>
              <h1 className="mt-1 font-display font-extrabold text-[34px] sm:text-[48px] leading-[1.0] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
                <span className="text-[28px] sm:text-[40px] mr-2">{country.flag}</span>
                {country.name}{' '}
                <span className="text-[hsl(var(--accent))]">{app.visa_type}</span>
              </h1>
              <div className="mt-1 text-[13.5px] text-[hsl(var(--blue-900))]/65">
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
              className="rounded-full h-11 px-5 font-bold border-[hsl(var(--accent))]/40 text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/5"
            >
              <Sparkles className="w-4 h-4 mr-1" /> Scan with AI
            </Button>
            <Button
              onClick={onCoverLetter}
              variant="outline"
              className="rounded-full h-11 px-4 font-bold border-[hsl(var(--accent))]/40 text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/5"
            >
              Cover Letter
            </Button>
            <Button
              onClick={onItinerary}
              variant="outline"
              className="rounded-full h-11 px-4 font-bold border-[hsl(var(--accent))]/40 text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/5"
            >
              AI Itinerary
            </Button>
            <Button
              onClick={onRiskAnalysis}
              variant="outline"
              className="rounded-full h-11 px-4 font-bold border-[hsl(var(--accent))]/40 text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/5"
            >
              Risk Analysis
            </Button>
            <Button
              onClick={onDownloadReceipt}
              variant="outline"
              className="rounded-full h-11 px-5 font-bold border-black/10 hover:border-[hsl(var(--blue-700))]/30"
            >
              <Download className="w-4 h-4 mr-1" /> Download receipt
            </Button>
            <Button
              onClick={onSubmit}
              disabled={!canSubmit || submitting}
              className="rounded-full btn-accent text-white h-11 px-6 font-bold disabled:opacity-50"
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

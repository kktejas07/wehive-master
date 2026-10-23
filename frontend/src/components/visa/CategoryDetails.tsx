import { Button } from '../ui/button';
import { Clock, Calendar, CreditCard, Loader2, LucideIcon } from 'lucide-react';
import { BRAND, COUNTRIES } from '../../data/mock';
import { landmarkFor } from '../../lib/landmarks';
import DeliveryCountdown from '../DeliveryCountdown';
import { computeFees } from '../FeeBreakdown';

interface VisaCategory {
  name: string;
  validity: string;
  processing_days: number;
  multi_entry?: boolean;
  documents?: string[];
  fees_inr?: number;
  fees_usd?: number;
}

interface VisaCountry {
  id: string;
  name: string;
  flag?: string;
  flag_url?: string;
  delivery?: { same_day?: boolean } & Record<string, unknown>;
}

interface MetaCardProps {
  Icon: LucideIcon;
  k: string;
  v: string;
}

function MetaCard({ Icon, k, v }: MetaCardProps) {
  return (
    <div className="min-w-0 rounded-2xl bg-white border border-[hsl(var(--border))] shadow-sm p-3 sm:p-4">
      <Icon className="w-4 h-4 text-[hsl(var(--blue-700))]" />
      <div className="mt-2 text-[12px] sm:uppercase sm:tracking-[0.14em] text-muted-foreground font-semibold truncate">{k}</div>
      <div className="mt-1 text-[14px] font-bold text-[hsl(var(--blue-900))] break-words">{v}</div>
    </div>
  );
}

interface CategoryDetailsProps {
  cat: VisaCategory;
  country: VisaCountry;
  onApply: () => void;
  applying?: boolean;
  typeId: string;
  applicants?: number;
}

export default function CategoryDetails({
  cat,
  country,
  onApply,
  applying,
  typeId,
  applicants,
}: CategoryDetailsProps) {
  const fallbackImg =
    landmarkFor(country) || country.flag_url || COUNTRIES.find((c) => c.id === country.id)?.image;
  const fees = computeFees({ category: cat, applicants, country, visaType: typeId });

  return (
    <div className="grid lg:grid-cols-12 gap-10 items-start">
      <div className="lg:col-span-7">
        <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[hsl(var(--border))] px-3 py-1.5 text-[12px] font-semibold text-[hsl(var(--blue-900))]">
          <span className="text-base leading-none">{country.flag}</span>
          {cat.name} · Valid {cat.validity}
        </div>
        <h1 className="mt-4 font-display font-bold text-[36px] sm:text-[56px] leading-[1.05] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
          <span>{country.name}</span>{' '}
          <span className="text-[hsl(var(--red-500))]">{cat.name}.</span>
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-muted-foreground max-w-xl">
          Apply online with {BRAND.name}: we check your documents before they reach the embassy,
          which makes the decision.
        </p>

        {country.delivery?.same_day && (
          <div className="mt-5">
            <DeliveryCountdown deliveryDays={cat.processing_days} />
          </div>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          <Button variant="accent"
            onClick={onApply}
            disabled={applying}
            className="rounded-xl text-white h-12 px-6 font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent))]"
            data-testid="visa-apply-button"
          >
            {applying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              `Apply · ₹${fees.total.toLocaleString('en-IN')}`
            )}
          </Button>
          <a
            href={`tel:${BRAND.phoneRaw}`}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-[hsl(var(--border))] text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-700))] h-12 px-5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--blue-700))]"
          >
            Talk to a counsellor
          </a>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-4 max-w-lg">
          <MetaCard Icon={Clock} k="Processing" v={`${cat.processing_days}d`} />
          <MetaCard Icon={Calendar} k="Validity" v={cat.validity} />
          <MetaCard Icon={CreditCard} k="Total" v={`₹${fees.total.toLocaleString('en-IN')}`} />
        </div>
      </div>
      <div className="lg:col-span-5">
        <div className="relative rounded-2xl overflow-hidden aspect-[4/5] border border-[hsl(var(--border))] shadow-sm">
          <img src={fallbackImg} alt={country.name} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 text-white">
            <div className="text-[12px] uppercase tracking-[0.14em] text-white/70 font-bold">Multi-entry</div>
            <div className="text-[18px] font-bold mt-1">
              {cat.multi_entry ? 'Yes — re-enter as needed' : 'Single entry'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

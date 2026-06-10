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
    <div className="rounded-2xl bg-white border border-black/5 p-4">
      <Icon className="w-4 h-4 text-[hsl(var(--blue-700))]" />
      <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--blue-900))]/55 font-bold">{k}</div>
      <div className="mt-1 text-[14px] font-bold text-[hsl(var(--blue-900))]">{v}</div>
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
        <div className="inline-flex items-center gap-2 rounded-full bg-white border border-black/5 px-3 py-1.5 text-[12px] font-bold text-[hsl(var(--blue-900))]/75">
          <span className="text-base leading-none">{country.flag}</span>
          {cat.name} · Valid {cat.validity}
        </div>
        <h1 className="mt-4 font-display font-extrabold text-[42px] sm:text-[64px] leading-[1.0] tracking-[-0.035em]">
          <span className="gradient-text-hover">{country.name}</span>{' '}
          <span className="gradient-text">{cat.name.toLowerCase()}.</span>
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-[hsl(var(--blue-900))]/65 max-w-xl">
          Apply in 12 minutes. Approved in {cat.processing_days} days. Backed by{' '}
          {BRAND.name}'s on-time guarantee — refund if we are even a day late.
        </p>

        {country.delivery?.same_day && (
          <div className="mt-5">
            <DeliveryCountdown deliveryDays={cat.processing_days} />
          </div>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          <Button
            onClick={onApply}
            disabled={applying}
            className="rounded-full btn-primary text-white h-12 px-6 font-bold"
            data-testid="visa-apply-btn"
          >
            {applying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              `Apply · ₹${fees.total.toLocaleString('en-IN')}`
            )}
          </Button>
          <a
            href={`tel:${BRAND.phoneRaw}`}
            className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] hover:bg-[hsl(var(--red-600))] text-white h-12 px-5 font-bold transition-colors"
          >
            Talk to a counsellor
          </a>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
          <MetaCard Icon={Clock} k="Processing" v={`${cat.processing_days}d`} />
          <MetaCard Icon={Calendar} k="Validity" v={cat.validity} />
          <MetaCard Icon={CreditCard} k="Total" v={`₹${fees.total.toLocaleString('en-IN')}`} />
        </div>
      </div>
      <div className="lg:col-span-5">
        <div className="relative rounded-3xl overflow-hidden aspect-[4/5] shadow-[0_30px_70px_-30px_rgba(10,44,138,0.5)]">
          <img src={fallbackImg} alt={country.name} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 text-white">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/70 font-bold">Multi-entry</div>
            <div className="text-[18px] font-bold mt-1">
              {cat.multi_entry ? 'Yes — re-enter as needed' : 'Single entry'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

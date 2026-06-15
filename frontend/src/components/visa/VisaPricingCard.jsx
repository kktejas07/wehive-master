import { useState } from 'react';
import { Users, Minus, Plus, Zap, ShieldCheck, Landmark, Clock, Receipt, Info } from 'lucide-react';
import { computeFees } from '../FeeBreakdown';
import { inr } from '../../lib/utils';

const FAST_TRACK_PREMIUM_PER = 1500;

function deliveryDateLabel(addDays) {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function VisaPricingCard({
  category,
  country,
  visaType,
  onApply,
  onApplicantsChange,
}) {
  const [applicants, setApplicants] = useState(1);
  const [processing, setProcessing] = useState('standard');

  const handleApplicants = (n) => {
    const clamped = Math.min(20, Math.max(1, n));
    setApplicants(clamped);
    onApplicantsChange?.(clamped);
  };

  const fees = computeFees({ category, applicants, country, visaType });
  const isFast = processing === 'fast';

  const standardDays = country?.delivery?.standard_days || 7;
  const deliveryDays = isFast ? Math.max(1, standardDays - 1) : standardDays;
  const deliveryLabel = deliveryDateLabel(deliveryDays);
  const standardLabel = deliveryDateLabel(standardDays);

  const fastPremium = isFast ? FAST_TRACK_PREMIUM_PER * applicants : 0;

  // Split payment model
  // Pay Now  → embassy / government / appointment fees (due immediately)
  // Pay Later → Wehive service fee + GST + fast track premium (due on delivery)
  const payNow = fees.embassyFee + fees.appointment;
  const payLater = fees.serviceFee + fees.gst + fastPremium;
  const totalAmount = payNow + payLater;

  if (fees.isVisaFree) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-2">
        <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
        <div className="text-[15px] font-bold text-emerald-800">No Visa Required</div>
        <p className="text-[13px] text-emerald-700/80">
          Indian passport holders can enter this destination visa-free or with visa-on-arrival.
        </p>
        <button
          onClick={() => onApply?.()}
          className="mt-2 w-full py-3 rounded-xl bg-emerald-600 text-white text-[15px] font-bold hover:bg-emerald-700 transition"
        >
          Plan My Holiday
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/10 overflow-hidden bg-white shadow-sm">
      {/* Processing tabs */}
      <div className="grid grid-cols-2 bg-[hsl(var(--soft-bg))] border-b border-black/8">
        <button
          onClick={() => setProcessing('standard')}
          className={`flex items-center gap-1.5 px-3 py-3 text-[12.5px] font-bold transition text-left ${
            processing === 'standard'
              ? 'bg-white text-[hsl(var(--blue-900))]'
              : 'text-[hsl(var(--blue-900))]/55 hover:text-[hsl(var(--blue-900))]'
          }`}
        >
          <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${processing === 'standard' ? 'text-[hsl(var(--blue-700))]' : 'text-[hsl(var(--blue-900))]/40'}`} />
          <span>Guaranteed by {standardLabel}</span>
        </button>
        <button
          onClick={() => setProcessing('fast')}
          className={`flex items-center gap-1.5 px-3 py-3 text-[12.5px] font-bold transition border-l border-black/8 ${
            processing === 'fast'
              ? 'bg-white text-amber-700'
              : 'text-[hsl(var(--blue-900))]/55 hover:text-amber-600'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 shrink-0 ${processing === 'fast' ? 'text-amber-500' : 'text-[hsl(var(--blue-900))]/40'}`} />
          <span>1 day faster</span>
        </button>
      </div>

      {isFast && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center gap-2 text-[11.5px] text-amber-800">
          <Zap className="w-3 h-3 text-amber-500 shrink-0" />
          Fast Track: +{inr(FAST_TRACK_PREMIUM_PER)} per traveller · Guaranteed by {deliveryLabel}
        </div>
      )}

      <div className="px-5 py-5 space-y-4">
        {/* Travellers stepper */}
        <div className="flex items-center justify-between rounded-xl border border-black/8 px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[hsl(var(--blue-700))]" />
            <span className="text-[14px] font-bold text-[hsl(var(--blue-900))]">Travellers</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleApplicants(applicants - 1)}
              disabled={applicants <= 1}
              className="w-7 h-7 rounded-full border border-black/15 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 transition"
              aria-label="Remove traveller"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-[16px] font-bold w-5 text-center tabular-nums text-[hsl(var(--blue-900))]">
              {applicants}
            </span>
            <button
              onClick={() => handleApplicants(applicants + 1)}
              disabled={applicants >= 20}
              className="w-7 h-7 rounded-full border border-black/15 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 transition"
              aria-label="Add traveller"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Amount hero */}
        <div className="text-center py-1">
          <div className="text-[40px] sm:text-[44px] font-display font-extrabold tracking-[-0.04em] text-[hsl(var(--blue-900))]">
            {inr(payNow || payLater)}
          </div>
          <div className="text-[10.5px] uppercase tracking-[0.2em] font-bold text-[hsl(var(--blue-900))]/45 mt-1">
            {payNow > 0 ? 'To be paid now' : 'Due on delivery'}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => onApply?.()}
          className="w-full py-3.5 rounded-xl bg-[hsl(var(--blue-700))] text-white text-[15.5px] font-bold hover:bg-[hsl(var(--blue-800))] active:scale-[0.98] transition shadow-sm"
        >
          Start Application
        </button>

        {/* Payment timeline */}
        <div className="pt-1">
          {/* Row 1 — Pay Now */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-[hsl(var(--soft-bg))] border border-black/10 flex items-center justify-center shrink-0">
                <Landmark className="w-3.5 h-3.5 text-[hsl(var(--blue-700))]" />
              </div>
              <div className="w-px bg-black/10 my-1" style={{ height: 32 }} />
            </div>
            <div className="flex-1 pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">Pay Now</div>
                  <div className="text-[12px] text-[hsl(var(--blue-900))]/55 underline decoration-dotted cursor-default mt-0.5">
                    Government Fees
                    {fees.requiresAppointment && ' + Appointment'}
                  </div>
                </div>
                <span className="text-[14.5px] font-bold text-[hsl(var(--blue-900))] tabular-nums shrink-0">
                  {inr(payNow)}
                </span>
              </div>
            </div>
          </div>

          {/* Row 2 — Pay on delivery */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[hsl(var(--soft-bg))] border border-black/10 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 text-[hsl(var(--blue-900))]/50" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">Pay on {deliveryLabel}</div>
                  <div className="text-[12px] text-[hsl(var(--blue-900))]/55 underline decoration-dotted cursor-default mt-0.5">
                    Wehive Fees{isFast ? ' + Fast Track' : ''}
                  </div>
                </div>
                <span className="text-[14.5px] font-bold text-[hsl(var(--blue-900))] tabular-nums shrink-0">
                  {inr(payLater)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="border-t border-black/8 pt-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[hsl(var(--soft-bg))] border border-black/10 flex items-center justify-center shrink-0">
            <Receipt className="w-3.5 h-3.5 text-[hsl(var(--blue-900))]" />
          </div>
          <div className="flex-1 flex items-center justify-between gap-2">
            <span className="text-[15px] font-bold text-[hsl(var(--blue-900))]">Total Amount</span>
            <span className="text-[18px] font-display font-extrabold text-[hsl(var(--blue-900))] tabular-nums">
              {inr(totalAmount)}
            </span>
          </div>
        </div>

        {/* Footnote */}
        <div className="flex items-start gap-1.5 text-[11px] text-[hsl(var(--blue-900))]/45 px-0.5">
          <Info className="w-3 h-3 shrink-0 mt-0.5" />
          <span>GST included. Embassy fees are set by the destination government and may change.</span>
        </div>
      </div>
    </div>
  );
}

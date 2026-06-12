/**
 * Wehive fee structure (revised — Feb 2026, round 5)
 * --------------------------------------------------
 * Visible rows on screen:
 *   1.  Application fee        = (Govt fee + Base service)  × applicants
 *   2.  Appointment / VFS fee  = appointment_fee_inr        × applicants  (only when required)
 *   3.  GST (18%)              = 18% on (Base + Appointment) × applicants  +  ₹350 × extra applicants
 *   ─────────────────────────────────────────────
 *   Total payable              = sum of the above.
 *
 * Internally the formula is identical to the old one:
 *     Total = Govt × n
 *           + Base × n
 *           + Appointment × n
 *           + 350 × (n − 1)
 *           + 18 % × (Base × n + Appointment × n)
 *
 * but we now hide "Base service fee" (it's folded into Application fee) and
 * the per-extra-applicant surcharge (it's folded into the GST line). The
 * customer sees one Application-fee number that scales with applicants, plus
 * Appointment + GST.
 *
 * Base service fee is tiered by visa category:
 *   Tourist                ₹3,500
 *   Business               ₹4,500
 *   Student / F1           ₹5,500
 *   Work / employment      ₹7,500
 *   Transit                ₹2,500
 *   Medical                ₹4,000
 *
 * Govt fee comes from the country category metadata. GST is applied **only**
 * to Wehive's portion (base + appointment + surcharge); never on the govt fee.
 */
import { useState } from 'react';
import { Users, Plus, Minus, Info, BadgeCheck } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { inr } from '../lib/utils';

const DEFAULT_BASE_FEE_BY_TYPE = {
  Tourist:  3500,
  Business: 4500,
  Student:  5500,
  Work:     7500,
  Transit:  2500,
  Medical:  4000,
};

const pricingState = {
  baseFees: { ...DEFAULT_BASE_FEE_BY_TYPE },
  surchargeInr: 350,
  gstRate: 0.18,
};

export const PER_EXTRA_APPLICANT_INR = pricingState.surchargeInr;
export const GST_RATE = pricingState.gstRate;
export const BASE_FEE_BY_TYPE = pricingState.baseFees;

export function setPricing({ base_fees, surcharge_inr, gst_rate } = {}) {
  if (base_fees && typeof base_fees === 'object') {
    pricingState.baseFees = { ...DEFAULT_BASE_FEE_BY_TYPE, ...base_fees };
  }
  if (Number.isFinite(Number(surcharge_inr))) pricingState.surchargeInr = Number(surcharge_inr);
  if (Number.isFinite(Number(gst_rate))) pricingState.gstRate = Number(gst_rate);
}

export function baseFeeFor(visaType, categoryName = '') {
  const fees = pricingState.baseFees;
  if (visaType && fees[visaType] != null) return fees[visaType];
  const n = (categoryName || '').toLowerCase();
  if (n.includes('student') || n.includes('f1') || n.includes('admission')) return fees.Student;
  if (n.includes('work') || n.includes('employment') || n.includes('h1')) return fees.Work;
  if (n.includes('business')) return fees.Business;
  if (n.includes('transit')) return fees.Transit;
  if (n.includes('medical')) return fees.Medical;
  return fees.Tourist;
}

export function computeFees({ category, applicants = 1, country, visaType }) {
  const n = Math.max(1, Number(applicants) || 1);
  const govtPer = Number(category?.fees_inr || 0);
  const base = baseFeeFor(visaType, category?.name);

  const isVisaFree =
    !!country?.no_visa ||
    (govtPer === 0 && (category?.name || '').toLowerCase().includes('visa-free'));

  const requiresAppt = !!country?.requires_appointment && !isVisaFree;
  const apptPer = requiresAppt ? Number(country?.appointment_fee_inr || 0) : 0;

  const application = (govtPer + base) * n;
  const appointment = apptPer * n;
  const surcharge = (n - 1) * pricingState.surchargeInr;

  const gstOnService = Math.round((base * n + apptPer * n) * pricingState.gstRate);
  const gstDisplay = gstOnService + surcharge;

  const total = application + appointment + gstDisplay;

  return {
    govt: govtPer * n,
    base: base * n,
    application,
    appointment,
    requiresAppointment: requiresAppt,
    isVisaFree,
    surcharge,
    gstOnService,
    gst: gstDisplay,
    total,
    applicants: n,
    baseFeeUnit: base,
  };
}

function ApplicantsStepper({ value, onChange }) {
  const { t } = useI18n();
  const dec = () => onChange(Math.max(1, value - 1));
  const inc = () => onChange(Math.min(20, value + 1));
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[hsl(var(--soft-bg))] border border-black/5 px-4 py-3" data-testid="applicants-stepper">
      <div className="flex items-center gap-2.5">
        <Users className="w-4 h-4 text-[hsl(var(--blue-700))]" />
        <div>
          <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">{t('fee.applicants')}</div>
          <div className="text-[11.5px] text-[hsl(var(--blue-900))]/55">{t('fee.applicantsSub')}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          data-testid="applicants-decrement"
          onClick={dec}
          disabled={value <= 1}
          className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-white border border-black/8 disabled:opacity-40 hover:border-[hsl(var(--blue-700))]/30"
          aria-label="Remove applicant"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span data-testid="applicants-count" className="w-8 text-center text-[15px] font-bold tabular-nums text-[hsl(var(--blue-900))]">
          {value}
        </span>
        <button
          data-testid="applicants-increment"
          onClick={inc}
          disabled={value >= 20}
          className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-white border border-black/8 disabled:opacity-40 hover:border-[hsl(var(--blue-700))]/30"
          aria-label="Add applicant"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function FeeBreakdown({ category, country, visaType, onApplicantsChange }) {
  const [applicants, setApplicants] = useState(1);
  const { t } = useI18n();
  const fees = computeFees({ category, applicants, country, visaType });

  const handleApplicants = (n) => {
    setApplicants(n);
    onApplicantsChange?.(n);
  };

  const lines = [];
  const nStr = String(applicants);
  const sPlural = applicants > 1 ? 's' : '';
  const applicationSub = fees.isVisaFree
    ? t('fee.applicationSubFree').replace('{n}', nStr).replace('{s}', sPlural)
    : t('fee.applicationSubEmbassy').replace('{n}', nStr).replace('{s}', sPlural);
  lines.push({
    id: 'application',
    label: t('fee.application'),
    amount: fees.application,
    sub: applicationSub,
  });
  if (fees.requiresAppointment && fees.appointment > 0) {
    lines.push({
      id: 'appointment',
      label: t('fee.appointment'),
      amount: fees.appointment,
      sub: t('fee.appointmentSub').replace('{n}', nStr).replace('{s}', sPlural),
    });
  }
  lines.push({
    id: 'gst',
    label: t('fee.gst'),
    amount: fees.gst,
    sub: t('fee.gstSub'),
  });

  return (
    <div className="space-y-3" data-testid="fee-breakdown">
      <ApplicantsStepper value={applicants} onChange={handleApplicants} />

      <div className="rounded-2xl bg-white border border-black/8 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/5 flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
            {t('fee.heading')}
          </div>
          <div className="text-[11px] text-[hsl(var(--blue-900))]/55">{t('fee.currencyNote')}</div>
        </div>

        {fees.isVisaFree && (
          <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2 text-[12.5px] text-emerald-800" data-testid="visa-free-note">
            <BadgeCheck className="w-4 h-4 shrink-0" />
            <span>{t('fee.visaFreeNote')}</span>
          </div>
        )}

        <ul className="divide-y divide-black/5">
          {lines.map((r) => (
            <li
              key={r.id}
              className="px-5 py-3.5 grid grid-cols-[1fr_auto] gap-3"
              data-testid={`fee-row-${r.id}`}
            >
              <div>
                <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{r.label}</div>
                <div className="text-[12px] text-[hsl(var(--blue-900))]/55 leading-snug mt-0.5">{r.sub}</div>
              </div>
              <div className="text-[15px] font-bold text-[hsl(var(--blue-900))] tabular-nums">
                {inr(r.amount)}
              </div>
            </li>
          ))}
        </ul>
        <div className="px-5 py-3.5 bg-[hsl(var(--soft-bg))] grid grid-cols-[1fr_auto] gap-3 border-t border-black/5" data-testid="fee-total-row">
          <div>
            <div className="text-[15px] font-display font-extrabold tracking-[-0.02em] text-[hsl(var(--blue-900))]">
              {t('fee.total')}
            </div>
            <div className="text-[11.5px] text-[hsl(var(--blue-900))]/55 mt-0.5">
              {t('fee.totalSub').replace('{n}', nStr).replace('{s}', sPlural)}
            </div>
          </div>
          <div data-testid="fee-total-amount" className="text-[20px] font-display font-extrabold tracking-[-0.02em] text-[hsl(var(--accent))] tabular-nums">
            {inr(fees.total)}
          </div>
        </div>
      </div>

      {!fees.requiresAppointment && !fees.isVisaFree && (
        <div className="flex items-start gap-2 text-[11.5px] text-[hsl(var(--blue-900))]/55 px-1">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{t('fee.noAppointment')}</span>
        </div>
      )}

      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 mt-3">
        <div className="flex items-start gap-2 text-[12px] text-amber-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Note:</span> Fees may vary based on government regulations and service charges. Please verify current rates at the time of application. The ₹20,000 application fee includes our service fees and the applicable government/embassy fee.
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Wehive fee structure (revised — Feb 2026)
 *
 *  Total payable = Government / embassy fee
 *               + Base service fee (₹3,500)
 *               + Additional-applicant surcharge (₹350 × extra applicants)
 *               + Country-specific appointment fee (only if required)
 *               + GST 18 % on (service + surcharge + appointment)
 *
 *  Government fee comes from the country category metadata. Pass-through, no markup.
 *  Visa-free destinations charge zero on every line.
 */
import { useState } from 'react';
import { Users, Plus, Minus, Info } from 'lucide-react';

export const BASE_SERVICE_FEE_INR = 3500;
export const PER_EXTRA_APPLICANT_INR = 350;
export const GST_RATE = 0.18;

export function computeFees({ category, applicants = 1, country }) {
  const govt = Number(category?.fees_inr || 0);
  const isVisaFree = govt === 0 && (category?.name || '').toLowerCase().includes('visa-free');

  const base = isVisaFree ? 0 : BASE_SERVICE_FEE_INR;
  const extra = isVisaFree ? 0 : Math.max(0, applicants - 1) * PER_EXTRA_APPLICANT_INR;

  const requiresAppt = !!country?.requires_appointment && !isVisaFree;
  const apptFee = requiresAppt ? Number(country?.appointment_fee_inr || 0) : 0;

  const taxable = base + extra + apptFee;
  const gst = Math.round(taxable * GST_RATE);
  const total = govt + taxable + gst;

  return {
    govt,
    base,
    extra,
    appointment: apptFee,
    requiresAppointment: requiresAppt,
    gst,
    total,
    applicants,
    isFree: total === 0,
  };
}

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

function ApplicantsStepper({ value, onChange }) {
  const dec = () => onChange(Math.max(1, value - 1));
  const inc = () => onChange(Math.min(20, value + 1));
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[hsl(var(--soft-bg))] border border-black/5 px-4 py-3" data-testid="applicants-stepper">
      <div className="flex items-center gap-2.5">
        <Users className="w-4 h-4 text-[hsl(var(--blue-700))]" />
        <div>
          <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">Applicants</div>
          <div className="text-[11.5px] text-[hsl(var(--blue-900))]/55">+₹350 for each additional traveller</div>
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

export default function FeeBreakdown({ category, country, onApplicantsChange }) {
  const [applicants, setApplicants] = useState(1);
  const fees = computeFees({ category, applicants, country });

  const handleApplicants = (n) => {
    setApplicants(n);
    onApplicantsChange?.(n);
  };

  if (fees.isFree) {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5" data-testid="fee-breakdown-free">
        <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-emerald-700">
          Visa-free for Indians
        </div>
        <div className="mt-1 text-[18px] font-display font-extrabold tracking-[-0.02em] text-emerald-800">
          No fees apply.
        </div>
        <p className="mt-1 text-[13px] text-emerald-800/80">
          You can travel on your Indian passport without applying for a visa in advance.
        </p>
      </div>
    );
  }

  const lines = [
    { id: 'govt', label: 'Government / embassy fee', amount: fees.govt, sub: 'Set by the consulate. Paid through us, no markup.' },
    { id: 'base', label: 'Base service fee', amount: fees.base, sub: 'Document review, application prep, submission and tracking.' },
  ];
  if (fees.extra > 0) {
    lines.push({
      id: 'extra',
      label: `Additional applicants (${applicants - 1} × ₹${PER_EXTRA_APPLICANT_INR})`,
      amount: fees.extra,
      sub: 'Per traveller beyond the primary applicant.',
    });
  }
  if (fees.requiresAppointment && fees.appointment > 0) {
    lines.push({
      id: 'appointment',
      label: 'Appointment / VFS fee',
      amount: fees.appointment,
      sub: 'Mandatory in-person biometrics for this country.',
    });
  }
  lines.push({
    id: 'gst',
    label: 'GST (18%)',
    amount: fees.gst,
    sub: 'On service + surcharge + appointment · HSN 998599.',
  });

  return (
    <div className="space-y-3" data-testid="fee-breakdown">
      <ApplicantsStepper value={applicants} onChange={handleApplicants} />

      <div className="rounded-2xl bg-white border border-black/8 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/5 flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
            Fee breakdown
          </div>
          <div className="text-[11px] text-[hsl(var(--blue-900))]/55">All amounts in INR</div>
        </div>
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
              Total payable
            </div>
            <div className="text-[11.5px] text-[hsl(var(--blue-900))]/55 mt-0.5">
              For {applicants} applicant{applicants > 1 ? 's' : ''} · No hidden fees · On-time guarantee
            </div>
          </div>
          <div data-testid="fee-total-amount" className="text-[20px] font-display font-extrabold tracking-[-0.02em] text-[hsl(var(--accent))] tabular-nums">
            {inr(fees.total)}
          </div>
        </div>
      </div>

      {!fees.requiresAppointment && (
        <div className="flex items-start gap-2 text-[11.5px] text-[hsl(var(--blue-900))]/55 px-1">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>No in-person appointment required for this country — fully online filing.</span>
        </div>
      )}
    </div>
  );
}

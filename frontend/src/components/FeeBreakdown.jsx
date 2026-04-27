/**
 * Wehive fee structure
 * --------------------
 * Total payable = Government / Embassy fee  +  Wehive service fee  +  GST 18%
 *
 *  - Government fee comes from the country/category metadata (cat.fees_inr).
 *    This is the actual fee the embassy/consulate charges, in INR. We never
 *    mark this up.
 *
 *  - Service fee is what We Hive charges for application preparation,
 *    document review, embassy submission and tracking. It scales with
 *    visa complexity (Tourist < Business ≈ Student < Work).
 *
 *  - GST (18%) is collected on the *service fee only* and remitted to the
 *    Government of India under HSN 998599.
 */
export const SERVICE_FEE_INR = {
  Tourist: 1499,
  Business: 2499,
  Student: 3999,
  Work: 4999,
  Transit: 999,
  Medical: 2999,
};

export const GST_RATE = 0.18;

export function computeFees(category) {
  const govt = Number(category?.fees_inr || 0);
  const visaType = category?.name && category.name.includes('Visa-Free')
    ? 'Tourist'
    : (category?._kind || 'Tourist');
  const service = SERVICE_FEE_INR[visaType] ?? SERVICE_FEE_INR.Tourist;
  // Visa-free entries should not charge a service fee
  const effectiveService = govt === 0 && (category?.name || '').toLowerCase().includes('visa-free')
    ? 0
    : service;
  const gst = Math.round(effectiveService * GST_RATE);
  const total = govt + effectiveService + gst;
  return {
    govt,
    service: effectiveService,
    gst,
    total,
    isFree: total === 0,
  };
}

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

export default function FeeBreakdown({ category, visaTypeId }) {
  // Inject the visa-type id so we can look up the right service fee tier.
  const cat = { ...category, _kind: visaTypeId };
  const { govt, service, gst, total, isFree } = computeFees(cat);

  if (isFree) {
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

  const rows = [
    { id: 'govt', label: 'Government / embassy fee', amount: govt, sub: 'Set by the consulate. Paid through us, no markup.' },
    { id: 'service', label: 'We Hive service fee', amount: service, sub: 'Document review, application prep, submission and tracking.' },
    { id: 'gst', label: 'GST (18%)', amount: gst, sub: 'Charged on service fee only · HSN 998599.' },
  ];

  return (
    <div className="rounded-2xl bg-white border border-black/8 overflow-hidden" data-testid="fee-breakdown">
      <div className="px-5 py-3 border-b border-black/5 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
          Fee breakdown
        </div>
        <div className="text-[11px] text-[hsl(var(--blue-900))]/55">All amounts in INR</div>
      </div>
      <ul className="divide-y divide-black/5">
        {rows.map((r) => (
          <li key={r.id} className="px-5 py-3.5 grid grid-cols-[1fr_auto] gap-3" data-testid={`fee-row-${r.id}`}>
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
            One-time charge · No hidden fees · On-time guarantee
          </div>
        </div>
        <div className="text-[20px] font-display font-extrabold tracking-[-0.02em] text-[hsl(var(--accent))] tabular-nums">
          {inr(total)}
        </div>
      </div>
    </div>
  );
}

import { ExternalLink, Award, CreditCard, Globe } from 'lucide-react';

const PARTNERS = [
  {
    id: 'credila',
    name: 'Credila',
    subtitle: 'HDFC Group',
    tagline: 'Education Loans for Abroad Studies',
    color: '#EE3424',
    bgLight: '#FFF5F4',
    borderColor: '#FECACA',
    icon: CreditCard,
    badge: 'Education Loans',
    features: [
      'No upper loan limit',
      'Collateral-free up to ₹40L',
      'Pre-visa loan sanction letter',
      'Covers tuition + living costs',
      'Repayment starts post course',
    ],
    ctaText: 'Apply for Education Loan',
    ctaUrl: 'https://credila.com/apply?utm_source=wehive&utm_medium=partner',
    stats: [{ label: 'Loan disbursed', value: '₹20,000 Cr+' }, { label: 'Students funded', value: '1L+' }],
  },
  {
    id: 'zolve',
    name: 'Zolve',
    subtitle: 'Banking Without Borders',
    tagline: 'US Banking & Credit Card Before You Land',
    color: '#7B2FBE',
    bgLight: '#FAF5FF',
    borderColor: '#DDD6FE',
    icon: Globe,
    badge: 'US Banking',
    features: [
      'No US credit history required',
      'Credit card before you land',
      '2% cashback on dining & travel',
      'Zero forex markup fees',
      'FDIC-insured US bank account',
    ],
    ctaText: 'Open US Account Now',
    ctaUrl: 'https://zolve.com/students?utm_source=wehive&utm_medium=partner',
    stats: [{ label: 'Students served', value: '2L+' }, { label: 'Countries covered', value: '25+' }],
  },
];

export default function PartnersBanner() {
  return (
    <section className="py-16 bg-gray-50" id="partners">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 mb-3">
            <Award size={12} />
            Trusted Partners
          </span>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Everything You Need to{' '}
            <span className="text-[#011CB5]">Study Abroad</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-sm">
            WeHive has partnered with industry leaders to give you end-to-end support — from funding your education to banking in a new country.
          </p>
        </div>

        {/* Partner cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PARTNERS.map((partner) => {
            const Icon = partner.icon;
            return (
              <div
                key={partner.id}
                className="rounded-2xl border overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                style={{ borderColor: partner.borderColor }}
              >
                {/* Card header band */}
                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{ background: partner.bgLight }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                      style={{ background: partner.color }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-base leading-tight">{partner.name}</p>
                      <p className="text-xs text-gray-500">{partner.subtitle}</p>
                    </div>
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                    style={{ background: partner.color }}
                  >
                    {partner.badge}
                  </span>
                </div>

                <div className="p-6">
                  <p className="text-gray-800 font-semibold mb-4 text-sm">{partner.tagline}</p>

                  {/* Stats row */}
                  <div className="flex gap-4 mb-5">
                    {partner.stats.map((s) => (
                      <div key={s.label} className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
                        <p className="font-bold text-gray-900 text-base">{s.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {partner.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <span
                          className="mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: partner.color }}
                        >
                          ✓
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={partner.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
                    style={{ background: partner.color }}
                  >
                    {partner.ctaText}
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          * WeHive may receive a referral fee from partners. This does not affect the advice or services you receive.
        </p>
      </div>
    </section>
  );
}

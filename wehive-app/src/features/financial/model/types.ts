export interface LoanCalcInput {
  amount: number;
  rate: number;
  tenureMonths: number;
}

export interface LoanCalcResult {
  emi: number;
  totalPayment: number;
  totalInterest: number;
}

export interface ProofOfFundsScheme {
  name: string;
  amount: number;
  currency: string;
  notes: string;
}

export const POF_SCHEMES: Record<string, ProofOfFundsScheme> = {
  Canada: { name: 'GIC (Guaranteed Investment Certificate)', amount: 10200, currency: 'CAD', notes: 'Required for first-year living expenses.' },
  USA: { name: 'I-20 Proof of Funds', amount: 35000, currency: 'USD', notes: 'Typical estimate for 1 year tuition + living. Varies by university.' },
  UK: { name: 'Tier 4 Maintenance Funds', amount: 12006, currency: 'GBP', notes: '1,334/month for 9 months (London). 1,023/month outside London.' },
  Germany: { name: 'Blocked Account (Sperrkonto)', amount: 11208, currency: 'EUR', notes: '934/month for 12 months.' },
};

export const FOREX_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'SGD', 'CHF'] as const;
export type ForexCurrency = (typeof FOREX_CURRENCIES)[number];

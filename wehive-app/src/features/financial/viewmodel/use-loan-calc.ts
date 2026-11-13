import { useMemo, useState } from 'react';

import type { LoanCalcResult } from '@/features/financial/model/types';

function calcEmi(principal: number, annualRate: number, months: number): LoanCalcResult | null {
  if (principal <= 0 || annualRate <= 0 || months <= 0) return null;
  const r = annualRate / 12 / 100;
  const emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const totalPayment = emi * months;
  return { emi: Math.round(emi), totalPayment: Math.round(totalPayment), totalInterest: Math.round(totalPayment - principal) };
}

export function useLoanCalc() {
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [tenure, setTenure] = useState('');

  const result = useMemo(() => {
    const a = parseFloat(amount);
    const r = parseFloat(rate);
    const t = parseInt(tenure, 10);
    if (isNaN(a) || isNaN(r) || isNaN(t)) return null;
    return calcEmi(a, r, t);
  }, [amount, rate, tenure]);

  return { amount, setAmount, rate, setRate, tenure, setTenure, result };
}

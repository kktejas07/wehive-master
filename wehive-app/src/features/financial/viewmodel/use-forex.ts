import { useCallback, useEffect, useState } from 'react';

import type { ForexCurrency } from '../model/types';

export function useForex() {
  const [amount, setAmount] = useState('1000');
  const [base, setBase] = useState<ForexCurrency>('USD');
  const [target, setTarget] = useState<ForexCurrency>('INR');
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRate = useCallback(async () => {
    if (base === target) { setRate(1); return; }
    setLoading(true);
    try {
      const res = await fetch(`https://api.frankfurter.dev/v1/latest?amount=${parseFloat(amount) || 1}&from=${base}&to=${target}`);
      const data = await res.json();
      setRate(data.rates?.[target] ?? null);
    } catch {
      setRate(null);
    } finally {
      setLoading(false);
    }
  }, [amount, base, target]);

  useEffect(() => {
    const t = setTimeout(fetchRate, 500);
    return () => clearTimeout(t);
  }, [fetchRate]);

  const swap = useCallback(() => {
    setBase(target);
    setTarget(base);
  }, [base, target]);

  return { amount, setAmount, base, setBase, target, setTarget, rate, loading, swap };
}

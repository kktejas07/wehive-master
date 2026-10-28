// TODO: wire this hook to views/pages/Pricing.jsx in Stage 3
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth, API } from '../../../context/AuthContext';

export interface Plan {
  id: string;
  name: string;
  price_inr: number;
  price_usd?: number;
  features: string[];
  is_popular?: boolean;
}

export interface Coupon {
  code: string;
  discount_percent: number;
  description: string;
}

export interface Promotion {
  id: string;
  title: string;
  discount_percent: number;
  valid_until?: string;
}

export function usePricingViewModel() {
  const { user, token, isAuthed, refreshUser } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [activePromos, setActivePromos] = useState<Promotion[]>([]);
  const [payBusy, setPayBusy] = useState(false);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    axios.get(`${API}/payments/plans`).then((r) => {
      setPlans(r.data?.items ?? r.data ?? []);
    }).catch(() => setPlans([])).finally(() => setLoading(false));

    axios.get(`${API}/promotions/active`, { params: { season: 'all' } })
      .then((r) => setActivePromos(r.data?.items ?? r.data ?? []))
      .catch(() => setActivePromos([]));
  }, []);

  const applyPromo = useCallback(async (code: string) => {
    setCouponLoading(true);
    setCouponError('');
    setCoupon(null);
    try {
      const r = await axios.post(`${API}/promotions/validate`, { code, cart_value: 0 });
      setCoupon(r.data);
    } catch (e: unknown) {
      setCouponError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Invalid promo code');
    } finally {
      setCouponLoading(false);
    }
  }, []);

  const initiatePayment = useCallback(async (planId: string) => {
    if (!token) return;
    setPayBusy(true);
    try {
      const r = await axios.post(`${API}/payments/orders`, {
        plan_id: planId,
        coupon_code: coupon?.code,
      }, { headers });
      // Return the Razorpay order to the view for checkout flow
      return r.data;
    } finally {
      setPayBusy(false);
    }
  }, [token, coupon]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    user,
    isAuthed,
    refreshUser,
    plans,
    loading,
    couponInput, setCouponInput,
    couponLoading,
    coupon,
    couponError,
    activePromos,
    payBusy,
    applyPromo,
    initiatePayment,
  };
}

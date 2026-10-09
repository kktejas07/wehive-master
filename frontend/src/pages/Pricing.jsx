import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, CheckCircle2, XCircle, ArrowRight, ShieldCheck, Lock, Building2, CreditCard } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';

function loadRazorpayCDN() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.body.appendChild(s);
  });
}

function getRazorpay() {
  if (typeof window !== 'undefined' && window.Razorpay) return window.Razorpay;
  return null;
}

function PlanCard({ plan, isCurrentPlan, isPremium, onSubscribe }) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!isPremium) {
      onSubscribe(plan.id, setLoading);
    }
  };

  return (
    <div className="group relative rounded-3xl p-[1px] bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 hover:shadow-[0_30px_70px_-20px_rgba(99,102,241,0.4)] transition-all duration-300 hover:-translate-y-1">
      <div
        className={`relative rounded-[22px] p-8 h-full ${
          plan.highlighted
            ? 'bg-[hsl(var(--blue-900))] text-white'
            : 'bg-white text-[hsl(var(--blue-900))]'
        }`}
      >
        {plan.highlighted && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[11px] uppercase tracking-[0.16em] font-bold px-3 py-1">
            Most popular
          </div>
        )}
        <div className={`text-[11px] uppercase tracking-[0.16em] font-bold ${plan.highlighted ? 'text-white/65' : 'text-[hsl(var(--blue-900))]/65'}`}>
          {plan.tag}
        </div>
        <h3 className="mt-2 font-display font-extrabold text-[28px] tracking-[-0.025em]">{plan.name}</h3>
        <div className="mt-5 flex items-baseline gap-1">
          <span className="font-display font-extrabold text-[64px] leading-none tracking-[-0.04em]">₹{plan.price.toLocaleString('en-IN')}</span>
          <span className={plan.highlighted ? 'text-white/65' : 'text-[hsl(var(--blue-900))]/65'}>/ visa application</span>
        </div>
        <button
          onClick={handleSubscribe}
          disabled={loading || (isPremium && isCurrentPlan(plan.id))}
          className={`mt-6 w-full rounded-full h-12 font-bold transition flex items-center justify-center gap-2 ${
            isPremium && isCurrentPlan(plan.id)
              ? 'bg-emerald-100 text-emerald-700 cursor-default'
              : plan.highlighted
                ? 'bg-white text-[hsl(var(--blue-900))] hover:bg-white/90'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90'
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPremium && isCurrentPlan(plan.id) ? (
            <>
              <CheckCircle2 className="w-4 h-4" /> Current plan
            </>
          ) : (
            <>
              {isPremium ? 'Switch to ' : 'Choose '}{plan.name} <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
        <ul className="mt-7 space-y-3">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[14.5px]">
              <span
                className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full ${
                  plan.highlighted ? 'bg-white/12 text-white' : 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-[hsl(var(--blue-700))]'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
              </span>
              <span className={plan.highlighted ? 'text-white/90' : ''}>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Pricing() {
  const { user, token, isAuthed, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [razorpayKey, setRazorpayKey] = useState('');
  const [loading, setLoading] = useState(true);
  const status = searchParams.get('status');
  const plan_id = searchParams.get('plan');

  const isPremium = user?.is_premium;

  const FALLBACK_PLANS = [
    { id: 'lite', name: 'Lite', price: 399, tag: 'One visa application with expert review', highlighted: false, features: ['One visa application', 'Document review by expert', 'Email support', '7–10 day processing'] },
    { id: 'standard', name: 'Standard', price: 799, tag: 'Most popular — priority support, on-time guarantee', highlighted: true, features: ['Everything in Lite', 'Priority chat support', 'On-time guarantee', 'Up to 4 applicants', 'Real-time tracking'] },
    { id: 'concierge', name: 'Concierge', price: 1099, tag: 'Dedicated specialist, 24/7 phone support', highlighted: false, features: ['Everything in Standard', 'Dedicated visa specialist', 'Same-day rush eligible', 'Up to 8 applicants', '24/7 phone support'] },
  ];

  useEffect(() => {
    axios.get(`${API}/payments/plans`).then((r) => {
      const data = r.data?.plans || [];
      if (data.length === 0) throw new Error('No plans');
      setPlans(data.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.amount_inr,
        tag: p.description,
        highlighted: p.id === 'standard',
        features: p.id === 'lite'
          ? ['One visa application', 'Document review by expert', 'Email support', '7–10 day processing']
          : p.id === 'standard'
          ? ['Everything in Lite', 'Priority chat support', 'On-time guarantee', 'Up to 4 applicants', 'Real-time tracking']
          : ['Everything in Standard', 'Dedicated visa specialist', 'Same-day rush eligible', 'Up to 8 applicants', '24/7 phone support'],
      })));
      setLoading(false);
    }).catch(() => {
      setPlans(FALLBACK_PLANS);
      setLoading(false);
    });
  }, []);

  const isCurrentPlan = (id) => user?.is_premium;

  const handleSubscribe = async (selectedPlanId, setLoadingCb) => {
    if (!isAuthed) {
      navigate(`/login?next=${encodeURIComponent('/pricing')}`);
      return;
    }
    setLoadingCb(true);
    try {
      const r = await axios.post(
        `${API}/payments/create-order`,
        { plan_id: selectedPlanId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { order_id, razorpay_key } = r.data;

      const options = {
        key: razorpay_key,
        amount: r.data.amount,
        currency: r.data.currency,
        name: 'We Hive',
        description: `Premium ${selectedPlanId} plan`,
        order_id,
        handler: async (res) => {
          try {
            await axios.post(
              `${API}/payments/verify`,
              {
                razorpay_order_id: res.razorpay_order_id,
                razorpay_payment_id: res.razorpay_payment_id,
                razorpay_signature: res.razorpay_signature,
                plan_id: selectedPlanId,
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            await refreshUser();
            navigate('/pricing?status=success&plan=' + selectedPlanId);
          } catch {
            navigate('/pricing?status=failure');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: 'hsl(var(--blue-700))' },
      };

      try {
        await loadRazorpayCDN();
        const Rz = getRazorpay();
        if (!Rz) {
          navigate('/pricing?status=failure');
          setLoadingCb(false);
          return;
        }
        const rz = new Rz(options);
        rz.on('payment.failed', () => navigate('/pricing?status=failure'));
        rz.open();
      } catch (e) {
        navigate('/pricing?status=failure');
      } finally {
        setLoadingCb(false);
      }
    } catch (e) {
      setLoadingCb(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-white min-h-screen">
        <Navbar />
        <div className="min-h-[70vh] flex flex-col items-center justify-center px-5 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="font-display font-extrabold text-[36px] text-[hsl(var(--blue-900))]">Payment successful!</h1>
          <p className="mt-3 text-[16px] text-[hsl(var(--blue-900))]/65 max-w-md">
            You're now a premium We Hive member. Your account has been upgraded and all AI tools are unlocked.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/account?tab=aitools" className="inline-flex items-center gap-2 rounded-full btn-accent text-white h-12 px-7 font-bold">
              Explore AI Tools <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-black/10 h-12 px-7 font-bold text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-700))]/30 transition">
              Back to home
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (status === 'failure') {
    return (
      <div className="bg-white min-h-screen">
        <Navbar />
        <div className="min-h-[70vh] flex flex-col items-center justify-center px-5 text-center">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="font-display font-extrabold text-[36px] text-[hsl(var(--blue-900))]">Payment failed</h1>
          <p className="mt-3 text-[16px] text-[hsl(var(--blue-900))]/65 max-w-md">
            Your payment could not be processed. No charges have been made. Please try again or contact us.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('/pricing')}
              className="inline-flex items-center gap-2 rounded-full btn-accent text-white h-12 px-7 font-bold"
            >
              Try again <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="https://wa.me/919113256726"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 h-12 px-7 font-bold text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-700))]/30 transition"
            >
              Contact support
            </a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-white">
      <Navbar />
      <section className="pt-32 pb-12 bg-[hsl(var(--soft-bg))] border-b border-black/5">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
            Pricing
          </div>
          <h1 className="mt-3 font-display font-extrabold text-[44px] sm:text-[68px] leading-[1.02] tracking-[-0.035em] text-[hsl(var(--blue-900))]">
            Fair, flat prices.{' '}
            <span className="text-[hsl(var(--accent))]">No surprises.</span>
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-[hsl(var(--blue-900))]/65 max-w-xl mx-auto">
            Government fees are passed through at cost. The only thing you pay us for is making the visa effortless.
          </p>
          {isPremium && (
            <div className="mt-4 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 text-[13px] font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" /> You're a premium member — all plans unlocked
            </div>
          )}
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-5">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrentPlan={isCurrentPlan}
                  isPremium={isPremium}
                  onSubscribe={handleSubscribe}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 border-t border-black/5 bg-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-10">
            <p className="text-[12px] uppercase tracking-[0.16em] font-bold text-[hsl(var(--blue-900))]/55">
              Trusted by thousands of applicants
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14">
            {[
              { Icon: Lock, label: '256-bit SSL', sub: 'Encrypted connection' },
              { Icon: ShieldCheck, label: 'PCI Compliant', sub: 'Secure payments' },
              { Icon: Building2, label: 'Govt. Registered', sub: 'Legal entity' },
              { Icon: CreditCard, label: 'Razorpay', sub: 'Trusted payment partner' },
            ].map(({ Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--blue-50))] border border-black/5">
                  <Icon className="w-5 h-5 text-[hsl(var(--blue-700))]" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">{label}</div>
                  <div className="text-[11.5px] text-[hsl(var(--blue-900))]/55">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
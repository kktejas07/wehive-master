import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, CheckCircle2, XCircle, ArrowRight, ShieldCheck, Lock, Building2, CreditCard, Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';
import { BRAND } from '../data/mock';
import { useToast } from '../hooks/use-toast';

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

  const current = isPremium && isCurrentPlan(plan.id);
  const hl = plan.highlighted;

  return (
    <div
      className={`relative flex flex-col rounded-2xl bg-white p-6 sm:p-8 transition duration-200 ${
        hl
          ? 'border-2 border-[hsl(var(--blue-700))] shadow-lg'
          : 'border border-[hsl(var(--border))] shadow-sm hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {hl && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full bg-[hsl(var(--blue-700))] text-white text-[12px] uppercase tracking-[0.14em] font-semibold px-3 py-1 whitespace-nowrap">
          Most popular
        </div>
      )}
      <h3 className={`font-display font-semibold text-[22px] ${hl ? 'text-[hsl(var(--blue-700))]' : 'text-[hsl(var(--blue-900))]'}`}>{plan.name}</h3>
      <p className="mt-2 md:min-h-[46px] text-[14px] leading-relaxed text-muted-foreground">
        {plan.tag}
      </p>
      <div className="mt-6 flex items-baseline gap-1.5 text-[hsl(var(--blue-900))]">
        <span className="font-display font-bold text-[44px] sm:text-[48px] leading-none tracking-[-0.02em] tabular-nums">₹{plan.price.toLocaleString('en-IN')}</span>
        <span className="text-[14px] text-muted-foreground">/ visa application</span>
      </div>
      <button
        type="button"
        data-testid={`plan-cta-${plan.id}`}
        onClick={handleSubscribe}
        disabled={loading || current}
        className={`mt-6 w-full shrink-0 rounded-xl h-12 px-5 font-semibold transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-80 ${
          current
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 cursor-default'
            : hl
              ? 'btn-accent text-white'
              : 'bg-white border border-[hsl(var(--border))] text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-700))]/50 hover:text-[hsl(var(--blue-700))]'
        }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-label="Loading" />
        ) : current ? (
          <>
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Current plan
          </>
        ) : (
          <>
            {isPremium ? 'Switch to ' : 'Choose '}{plan.name} <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </>
        )}
      </button>
      <div className="mt-8 pt-6 border-t border-[hsl(var(--border))]">
        <p className="text-[12px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">What&rsquo;s included</p>
        <ul className="mt-4 space-y-3">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-3 text-[15px] text-[hsl(var(--blue-900))]">
              <Check className="mt-0.5 w-4 h-4 shrink-0 text-[hsl(var(--blue-700))]" aria-hidden="true" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Prices and plan names come from GET /payments/plans; only the feature
// bullets live here.
const PLAN_FEATURES = {
  lite: ['One visa application', 'Document review by expert', 'Email support', '7–10 day processing'],
  standard: ['Everything in Lite', 'Priority chat support', 'Appointment & deadline reminders', 'Up to 4 applicants', 'Real-time tracking'],
  concierge: ['Everything in Standard', 'Dedicated visa specialist', 'Same-day rush eligible', 'Up to 8 applicants', '24/7 phone support'],
};

export default function Pricing() {
  const { user, token, isAuthed, refreshUser } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [razorpayKey, setRazorpayKey] = useState('');
  const [loading, setLoading] = useState(true);
  const status = searchParams.get('status');
  const plan_id = searchParams.get('plan');

  const isPremium = user?.is_premium;


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
        features: PLAN_FEATURES[p.id] || [],
      })));
      setLoading(false);
    }).catch(() => {
      setPlans([]);
      setLoading(false);
    });
  }, []);

  // /auth/me doesn't expose which plan was bought yet, so no card is marked current until it does.
  const isCurrentPlan = (id) => !!user?.is_premium && user?.plan_id === id;

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
        theme: { color: '#011CB5' },
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
      toast({ title: 'Could not start payment', description: e.response?.data?.detail || 'Please try again.' });
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-white min-h-screen">
        <Navbar />
        <div className="min-h-[70vh] pt-24 flex flex-col items-center justify-center px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" aria-hidden="true" />
          </div>
          <h1 className="font-display font-bold text-[32px] sm:text-[40px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">Payment successful!</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground max-w-md">
            You're now a premium We Hive member. Your account has been upgraded and all AI tools are unlocked.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/account?tab=aitools" className="inline-flex items-center gap-2 rounded-xl btn-accent text-white h-12 px-6 font-semibold">
              Explore AI Tools <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-white border border-[hsl(var(--border))] h-12 px-6 font-semibold text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-700))]/40 hover:text-[hsl(var(--blue-700))] transition-colors">
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
        <div className="min-h-[70vh] pt-24 flex flex-col items-center justify-center px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
            <XCircle className="w-8 h-8 text-red-600" aria-hidden="true" />
          </div>
          <h1 className="font-display font-bold text-[32px] sm:text-[40px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">Payment failed</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground max-w-md">
            Your payment could not be processed. No charges have been made. Please try again or contact us.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('/pricing')}
              className="inline-flex items-center gap-2 rounded-xl btn-accent text-white h-12 px-6 font-semibold"
            >
              Try again <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href={`https://wa.me/${BRAND.consultantPhoneRaw.slice(1)}`}
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-[hsl(var(--border))] h-12 px-6 font-semibold text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-700))]/40 hover:text-[hsl(var(--blue-700))] transition-colors"
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
      <section className="pt-32 sm:pt-36 pb-12 sm:pb-16 mesh-bg border-b border-[hsl(var(--border))]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-[12px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--blue-700))]">
            Pricing
          </div>
          <h1 className="mt-3 font-display font-bold text-[36px] sm:text-[48px] lg:text-[56px] leading-[1.08] tracking-[-0.02em] text-[hsl(var(--blue-900))] text-balance">
            Fair, flat prices. No surprises.
          </h1>
          <p className="mt-5 text-[16px] sm:text-[18px] leading-relaxed text-muted-foreground max-w-xl mx-auto">
            Government fees are passed through at cost. The only thing you pay us for is making the visa effortless.
          </p>
          {isPremium && (
            <div className="mt-6 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 text-[13px] font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> You're a premium member — all plans unlocked
            </div>
          )}
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[hsl(var(--soft-bg))]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-20" role="status" aria-label="Loading plans">
              <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" aria-hidden="true" />
            </div>
          ) : plans.length === 0 ? (
            <div className="card-surface max-w-lg mx-auto px-6 py-10 text-center" role="status">
              <p className="text-[15px] text-[hsl(var(--blue-900))] font-semibold">Plans couldn&rsquo;t load right now.</p>
              <p className="mt-2 text-[14px] text-muted-foreground">
                Please refresh, or call us on{' '}
                <a href={`tel:${BRAND.phoneRaw}`} className="link-primary font-semibold">{BRAND.phone}</a>.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 md:gap-5 lg:gap-6 items-stretch pt-3">
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
          <p className="mt-10 text-center text-[14px] text-muted-foreground">
            Prices exclude government and embassy fees, which are charged at cost.
          </p>
        </div>
      </section>

      <section className="py-16 border-t border-[hsl(var(--border))] bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-[12px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
              Trusted by thousands of applicants
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {[
              { Icon: Lock, label: '256-bit SSL', sub: 'Encrypted connection' },
              { Icon: ShieldCheck, label: 'PCI Compliant', sub: 'Secure payments' },
              { Icon: Building2, label: 'Govt. Registered', sub: 'Legal entity' },
              { Icon: CreditCard, label: 'Razorpay', sub: 'Trusted payment partner' },
            ].map(({ Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--blue-50))]">
                  <Icon className="w-5 h-5 text-[hsl(var(--blue-700))]" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[hsl(var(--blue-900))]">{label}</div>
                  <div className="text-[12px] text-muted-foreground">{sub}</div>
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
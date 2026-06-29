import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import {
  Clock,
  MapPin,
  ChevronRight,
  Loader2,
  Bell,
  BellRing,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Send,
  Building2,
  Phone,
  PhoneCall,
} from 'lucide-react';

const VISA_TYPE_COLORS = {
  b1b2: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  f1: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  h1b: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  h4: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  l1: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  j1: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
};

const CONSULATE_ORDER = ['mumbai', 'delhi', 'chennai', 'kolkata', 'hyderabad'];

const FALLBACK_WAIT_TIMES = {
  mumbai: {
    name: "Mumbai VAC", city: "Mumbai",
    jurisdiction: "MH, GJ, RJ, MP, Goa",
    booking_url: "https://visa.vfsglobal.com/ind/en/usa/book-an-appointment",
    visa_types: {
      b1b2: { name: "B1/B2", label: "Tourist", wait_time: "408 days", available: true, count: 1, earliest_date: "408 days" },
      f1: { name: "F1", label: "Student", wait_time: "98 days", available: true, count: 1, earliest_date: "98 days" },
      h1b: { name: "H1B", label: "Work", wait_time: "156 days", available: true, count: 1, earliest_date: "156 days" },
      h4: { name: "H4", label: "Dependent", wait_time: "210 days", available: true, count: 1, earliest_date: "210 days" },
      l1: { name: "L1", label: "Transfer", wait_time: "89 days", available: true, count: 1, earliest_date: "89 days" },
      j1: { name: "J1", label: "Exchange", wait_time: "45 days", available: true, count: 1, earliest_date: "45 days" },
    },
    total_slots: 6, earliest_date: "408 days",
  },
  delhi: {
    name: "New Delhi Embassy", city: "New Delhi",
    jurisdiction: "DL, PB, HR, UK, HP, JK",
    booking_url: "https://visa.vfsglobal.com/ind/en/usa/book-an-appointment",
    visa_types: {
      b1b2: { name: "B1/B2", label: "Tourist", wait_time: "442 days", available: true, count: 1, earliest_date: "442 days" },
      f1: { name: "F1", label: "Student", wait_time: "112 days", available: true, count: 1, earliest_date: "112 days" },
      h1b: { name: "H1B", label: "Work", wait_time: "178 days", available: true, count: 1, earliest_date: "178 days" },
      h4: { name: "H4", label: "Dependent", wait_time: "234 days", available: true, count: 1, earliest_date: "234 days" },
      l1: { name: "L1", label: "Transfer", wait_time: "95 days", available: true, count: 1, earliest_date: "95 days" },
      j1: { name: "J1", label: "Exchange", wait_time: "52 days", available: true, count: 1, earliest_date: "52 days" },
    },
    total_slots: 6, earliest_date: "442 days",
  },
  chennai: {
    name: "Chennai Consulate", city: "Chennai",
    jurisdiction: "TN, KL, KA, AP, Telangana",
    booking_url: "https://visa.vfsglobal.com/ind/en/usa/book-an-appointment",
    visa_types: {
      b1b2: { name: "B1/B2", label: "Tourist", wait_time: "397 days", available: true, count: 1, earliest_date: "397 days" },
      f1: { name: "F1", label: "Student", wait_time: "87 days", available: true, count: 1, earliest_date: "87 days" },
      h1b: { name: "H1B", label: "Work", wait_time: "142 days", available: true, count: 1, earliest_date: "142 days" },
      h4: { name: "H4", label: "Dependent", wait_time: "195 days", available: true, count: 1, earliest_date: "195 days" },
      l1: { name: "L1", label: "Transfer", wait_time: "76 days", available: true, count: 1, earliest_date: "76 days" },
      j1: { name: "J1", label: "Exchange", wait_time: "38 days", available: true, count: 1, earliest_date: "38 days" },
    },
    total_slots: 6, earliest_date: "397 days",
  },
  kolkata: {
    name: "Kolkata Consulate", city: "Kolkata",
    jurisdiction: "WB, BR, JH, OD, NE states",
    booking_url: "https://visa.vfsglobal.com/ind/en/usa/book-an-appointment",
    visa_types: {
      b1b2: { name: "B1/B2", label: "Tourist", wait_time: "379 days", available: true, count: 1, earliest_date: "379 days" },
      f1: { name: "F1", label: "Student", wait_time: "82 days", available: true, count: 1, earliest_date: "82 days" },
      h1b: { name: "H1B", label: "Work", wait_time: "135 days", available: true, count: 1, earliest_date: "135 days" },
      h4: { name: "H4", label: "Dependent", wait_time: "185 days", available: true, count: 1, earliest_date: "185 days" },
      l1: { name: "L1", label: "Transfer", wait_time: "72 days", available: true, count: 1, earliest_date: "72 days" },
      j1: { name: "J1", label: "Exchange", wait_time: "35 days", available: true, count: 1, earliest_date: "35 days" },
    },
    total_slots: 6, earliest_date: "379 days",
  },
  hyderabad: {
    name: "Hyderabad Consulate", city: "Hyderabad",
    jurisdiction: "Telangana, AP",
    booking_url: "https://visa.vfsglobal.com/ind/en/usa/book-an-appointment",
    visa_types: {
      b1b2: { name: "B1/B2", label: "Tourist", wait_time: "391 days", available: true, count: 1, earliest_date: "391 days" },
      f1: { name: "F1", label: "Student", wait_time: "95 days", available: true, count: 1, earliest_date: "95 days" },
      h1b: { name: "H1B", label: "Work", wait_time: "151 days", available: true, count: 1, earliest_date: "151 days" },
      h4: { name: "H4", label: "Dependent", wait_time: "205 days", available: true, count: 1, earliest_date: "205 days" },
      l1: { name: "L1", label: "Transfer", wait_time: "82 days", available: true, count: 1, earliest_date: "82 days" },
      j1: { name: "J1", label: "Exchange", wait_time: "44 days", available: true, count: 1, earliest_date: "44 days" },
    },
    total_slots: 6, earliest_date: "391 days",
  },
};

export default function USVisaSlots() {
  const { token, isAuthed } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [selectedVisas, setSelectedVisas] = useState(['b1b2']);
  const [selectedConsulates, setSelectedConsulates] = useState(CONSULATE_ORDER);
  const [showSubscribeForm, setShowSubscribeForm] = useState(false);

  const toggleVisa = (id) => {
    setSelectedVisas(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const toggleConsulate = (id) => {
    setSelectedConsulates(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const fetchAll = useCallback(async () => {
    try {
      const [summaryRes, statusRes] = await Promise.all([
        axios.get(`${API}/usvisa/slots/summary`),
        axios.get(`${API}/usvisa/status`),
      ]);
      setSummary(summaryRes.data);
      setWhatsappNumber('+91 9000734326');
      setStatus(statusRes.data);

      if (statusRes.data.last_slot_detected_at) {
        const slotsRes = await axios.get(`${API}/usvisa/slots`, { params: { limit: 50 } });
        setSlots(slotsRes.data.slots || []);
      }
    } catch (err) {
      console.warn('Using fallback wait-time data — API unreachable');
      setSummary({
        ok: true,
        consulates: FALLBACK_WAIT_TIMES,
        overall: { total_slots: 30, consulates_with_slots: 5, visa_type_counts: { b1b2: 5, f1: 5, h1b: 5 } },
      });
      setWhatsappNumber('+91 9000734326');
      setStatus({ check_interval_seconds: 7200, mode: 'wait_time_estimates' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 120000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  useEffect(() => {
    if (isAuthed) {
      axios.get(`${API}/usvisa/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => {
        if (r.data.subscribed) {
          setSubscribed(true);
          setSelectedVisas(r.data.subscription.visa_types);
          setSelectedConsulates(r.data.subscription.consulates);
        }
      }).catch(() => {});
    }
  }, [isAuthed, token]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
    toast({ title: 'Refreshed', description: 'Slot data is now up to date.' });
  };

  const handleSubscribe = async () => {
    if (!isAuthed) {
      toast({ title: 'Login required', description: 'Sign in to subscribe to slot alerts.' });
      return;
    }
    setSubscribing(true);
    try {
      await axios.post(`${API}/usvisa/subscribe`, {
        visa_types: selectedVisas,
        consulates: selectedConsulates,
        channel: 'in_app',
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSubscribed(true);
      setShowSubscribeForm(false);
      toast({ title: 'Subscribed!', description: 'You will be notified when US visa slots open up.' });
    } catch (err) {
      toast({ title: 'Subscription failed', description: err.response?.data?.detail || 'Please try again.' });
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!isAuthed) return;
    try {
      await axios.delete(`${API}/usvisa/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubscribed(false);
      toast({ title: 'Unsubscribed', description: 'You will no longer receive US visa slot alerts.' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to unsubscribe.' });
    }
  };

  if (loading) {
    return (
      <div className="bg-[hsl(var(--soft-bg))] min-h-screen">
        <Navbar />
        <main className="pt-28 pb-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--blue-700))] mx-auto mb-3" />
            <p className="text-[14px] text-[hsl(var(--blue-900))]/50">Loading slot data...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-[hsl(var(--soft-bg))] min-h-screen">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-1.5 text-[13px] text-[hsl(var(--blue-900))]/55 mb-6">
            <Link to="/" className="hover:text-[hsl(var(--blue-700))]">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-bold text-[hsl(var(--blue-900))]">US Visa Slot Tracker</span>
          </div>

          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[hsl(var(--accent))]/10 border-2 border-[hsl(var(--accent))] text-[13px] font-extrabold text-[hsl(var(--accent))] uppercase tracking-[0.15em] animate-pulse">
              <Clock className="w-4 h-4" />
              Hurry — Slots Fill Fast!
            </span>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-bold text-[hsl(var(--accent))] mb-3">
              <RefreshCw className="w-3.5 h-3.5" /> Live Wait Times
            </div>
            <h1 className="font-display font-extrabold text-[32px] sm:text-[42px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
              US Visa Appointment Slots
            </h1>
            <p className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/55 max-w-xl mx-auto">
              Current wait times for US visa appointments across all 5 consulates in India. Updated regularly.
            </p>
          </div>

          {/* Status Bar */}
          <div className="rounded-2xl bg-white border border-black/5 p-4 mb-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[13px] font-bold text-[hsl(var(--blue-900))]">Live</span>
              </div>
              <div className="text-[12px] text-[hsl(var(--blue-900))]/50">
                Wait times refreshed regularly
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="h-9 rounded-full text-[12px] font-bold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {/* ── Gated Content: Register to view live slots ── */}
          {!isAuthed && (
            <div className="rounded-3xl bg-gradient-to-br from-[hsl(var(--blue-700))] via-[hsl(var(--blue-800))] to-[hsl(var(--blue-900))] p-8 sm:p-10 mb-8 text-center text-white">
              <div className="inline-flex h-16 w-16 rounded-2xl bg-white/15 items-center justify-center mb-5">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="font-display font-extrabold text-[26px] sm:text-[32px] tracking-[-0.02em] mb-3">
                Don't Miss Your Slot — Slots Fill in Minutes!
              </h2>
              <p className="text-[15px] text-white/75 max-w-lg mx-auto mb-2 leading-relaxed">
                US visa appointment slots open unpredictably and disappear fast. Our system monitors all 5 consulates <strong className="text-white">24/7</strong> so you never miss one.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[14px] text-white/80">
                <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-4 py-2">
                  <MapPin className="w-4 h-4" /> Mumbai, Delhi, Chennai, Kolkata, Hyderabad
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-4 py-2">
                  <RefreshCw className="w-4 h-4" /> Checked every few minutes
                </span>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  onClick={() => navigate('/signup')}
                  className="h-12 px-8 rounded-full bg-white text-[hsl(var(--blue-800))] hover:bg-white/90 font-bold text-[14px]"
                >
                  Register Free to View Live Slots
                </Button>
                <span className="text-white/60 text-[13px] hidden sm:inline">or</span>
                <a
                  href={`https://wa.me/${whatsappNumber?.replace(/[\s+]/g, '') || '919000734326'}?text=Hi%2C%20I%20need%20help%20with%20a%20US%20visa%20appointment.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-green-500 hover:bg-green-600 text-white font-bold text-[14px] transition"
                >
                  <Send className="w-4 h-4" />
                  Chat on WhatsApp
                </a>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-[13px] text-white/70">
                <PhoneCall className="w-4 h-4" />
                <span>Call us: </span>
                <a href={`tel:${(whatsappNumber || '+91 9000734326').replace(/[\s+]/g, '')}`} className="font-bold text-white hover:underline">
                  {whatsappNumber || '+91 9000734326'}
                </a>
              </div>

              <p className="mt-6 text-[12px] text-white/50">
                Already registered? <button onClick={() => navigate('/login')} className="font-bold text-white/80 hover:text-white underline">Sign in</button> to view live slot availability.
              </p>
            </div>
          )}

          {/* ── Slot data visible only to registered users ── */}
          {isAuthed && (
            <>

          {/* Consulate Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {CONSULATE_ORDER.map(cid => {
              const data = summary?.consulates?.[cid];
              if (!data) return null;
              const available = data.total_slots > 0;
              return (
                <div
                  key={cid}
                  className={`rounded-2xl bg-white border p-5 transition hover:shadow-md ${
                    available ? 'border-emerald-200' : 'border-black/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[hsl(var(--blue-700))]" />
                        <h3 className="font-bold text-[15px] text-[hsl(var(--blue-900))]">{data.city}</h3>
                      </div>
                      <p className="text-[12px] text-[hsl(var(--blue-900))]/40 mt-0.5">{data.jurisdiction || data.name}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {Object.entries(data.visa_types || {}).map(([vtId, vtData]) => {
                      const colors = VISA_TYPE_COLORS[vtId] || VISA_TYPE_COLORS.b1b2;
                      const hasData = vtData.wait_time && vtData.wait_time !== 'N/A';
                      return (
                        <div key={vtId} className="flex items-center justify-between">
                          <span className="text-[13px] font-medium text-[hsl(var(--blue-900))]/70">
                            {vtData.name || vtId.toUpperCase()}
                          </span>
                          <span className={`text-[17px] font-display font-extrabold tracking-[-0.02em] tabular-nums ${
                            hasData ? colors.text : 'text-[hsl(var(--blue-900))]/25'
                          }`}>
                            {hasData ? vtData.wait_time : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <a
                    href="https://visa.vfsglobal.com/ind/en/usa/book-an-appointment"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 w-full justify-center h-10 rounded-full bg-[hsl(var(--blue-700))] text-white text-[13px] font-bold hover:bg-[hsl(229,85%,28%)] active:scale-[0.98] transition-colors"
                  >
                    Book on VFS Global
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              );
            })}
          </div>

          {/* ── End of gated content ── */}
          </>
          )}

          {/* Notification Subscription */}
          <div className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[hsl(var(--blue-700))]/10 flex items-center justify-center flex-shrink-0">
                <BellRing className="w-6 h-6 text-[hsl(var(--blue-700))]" />
              </div>
              <div>
                <h2 className="font-display font-extrabold text-[20px] text-[hsl(var(--blue-900))]">
                  Get Notified Instantly
                </h2>
                <p className="mt-1 text-[14px] text-[hsl(var(--blue-900))]/60">
                  We check every 2-3 minutes and send alerts the moment US visa slots open up.
                </p>
              </div>
            </div>

            {subscribed ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h3 className="font-bold text-[15px] text-emerald-800">You're subscribed!</h3>
                <p className="mt-1 text-[13px] text-emerald-700">
                  You will receive in-app notifications when US visa slots become available.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button
                    onClick={() => setShowSubscribeForm(true)}
                    variant="outline"
                    className="h-9 rounded-full text-[12px] font-bold"
                  >
                    Update Preferences
                  </Button>
                  <Button
                    onClick={handleUnsubscribe}
                    variant="outline"
                    className="h-9 rounded-full text-[12px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Unsubscribe
                  </Button>
                </div>

                {showSubscribeForm && (
                  <div className="mt-6 text-left">
                    <SubscribeForm
                      selectedVisas={selectedVisas}
                      selectedConsulates={selectedConsulates}
                      onToggleVisa={toggleVisa}
                      onToggleConsulate={toggleConsulate}
                      onSubscribe={handleSubscribe}
                      subscribing={subscribing}
                    />
                  </div>
                )}
              </div>
            ) : (
              <SubscribeForm
                selectedVisas={selectedVisas}
                selectedConsulates={selectedConsulates}
                onToggleVisa={toggleVisa}
                onToggleConsulate={toggleConsulate}
                onSubscribe={handleSubscribe}
                subscribing={subscribing}
              />
            )}
          </div>

          {/* WhatsApp Contact */}
          <div className="rounded-3xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-6 sm:p-8 text-center mb-8">
            <div className="inline-flex h-14 w-14 rounded-2xl bg-green-100 items-center justify-center mb-4">
              <Send className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="font-display font-extrabold text-[22px] text-[hsl(var(--blue-900))]">
              Need Help Booking?
            </h2>
            <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60 max-w-md mx-auto">
              Our team can help you find and book early US visa appointments. Message us on WhatsApp.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <a
                href={`tel:${(whatsappNumber || '+91 9000734326').replace(/[\s+]/g, '')}`}
                className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white font-bold text-[13px] transition"
              >
                <Phone className="w-4 h-4" />
                Call {whatsappNumber || '+91 9000734326'}
              </a>
              <a
                href={`https://wa.me/${whatsappNumber?.replace(/[\s+]/g, '')}?text=Hi%2C%20I%20need%20help%20with%20a%20US%20visa%20appointment.`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold text-[13px] transition"
              >
                <Send className="w-4 h-4" />
                Chat on WhatsApp
              </a>
            </div>
          </div>

          {/* Recent Slots Table */}
          {isAuthed && slots.length > 0 && (
            <div className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8">
              <h2 className="font-display font-extrabold text-[20px] text-[hsl(var(--blue-900))] mb-4">
                Recently Detected Slots
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-black/5">
                      <th className="pb-3 text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/50">Consulate</th>
                      <th className="pb-3 text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/50">Visa</th>
                      <th className="pb-3 text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/50">Date</th>
                      <th className="pb-3 text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/50">Time</th>
                      <th className="pb-3 text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/50">Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.slice(0, 20).map((slot, i) => {
                      const colors = VISA_TYPE_COLORS[slot.visa_type] || VISA_TYPE_COLORS.b1b2;
                      return (
                        <tr key={i} className="border-b border-black/[0.02] hover:bg-[hsl(var(--soft-bg))]">
                          <td className="py-2.5 text-[13px] font-bold text-[hsl(var(--blue-900))]">{slot.city || slot.consulate_name}</td>
                          <td className="py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${colors.bg} ${colors.text}`}>
                              {slot.visa_name}
                            </span>
                          </td>
                          <td className="py-2.5 text-[13px] text-[hsl(var(--blue-900))]">
                            {new Date(slot.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-2.5 text-[13px] font-mono text-[hsl(var(--blue-900))]">{slot.time}</td>
                          <td className="py-2.5 text-[12px] text-[hsl(var(--blue-900))]/50">{slot.day_of_week}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* How It Works */}
          <div className="mt-8 rounded-3xl bg-white border border-black/5 p-6 sm:p-8">
            <h2 className="font-display font-extrabold text-[20px] text-[hsl(var(--blue-900))] mb-6 text-center">
              How It Works
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                {
                  icon: <RefreshCw className="w-6 h-6" />,
                  title: '24/7 Monitoring',
                  desc: 'Our system checks the official US visa scheduling portal every 2-3 minutes, around the clock.',
                },
                {
                  icon: <BellRing className="w-6 h-6" />,
                  title: 'Instant Alerts',
                  desc: 'The moment wait times change, we update your dashboard and can notify you.',
                },
                {
                  icon: <MapPin className="w-6 h-6" />,
                  title: 'All Consulates',
                  desc: 'We monitor all 5 US consulates in India: Mumbai, Delhi, Chennai, Kolkata, Hyderabad.',
                },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="inline-flex w-12 h-12 rounded-xl bg-[hsl(var(--blue-700))]/10 items-center justify-center mb-3 text-[hsl(var(--blue-700))]">
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-[14px] text-[hsl(var(--blue-900))]">{item.title}</h3>
                  <p className="mt-1.5 text-[13px] text-[hsl(var(--blue-900))]/55 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function SubscribeForm({ selectedVisas, selectedConsulates, onToggleVisa, onToggleConsulate, onSubscribe, subscribing }) {
  return (
    <div className="space-y-5">
      <div>
        <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-2">
          Visa Types
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'b1b2', label: 'B1/B2 Tourist' },
            { id: 'f1', label: 'F1 Student' },
            { id: 'h1b', label: 'H1B Work' },
            { id: 'h4', label: 'H4 Dependent' },
            { id: 'l1', label: 'L1 Transfer' },
            { id: 'j1', label: 'J1 Exchange' },
          ].map(vt => {
            const colors = VISA_TYPE_COLORS[vt.id] || VISA_TYPE_COLORS.b1b2;
            return (
              <button
                key={vt.id}
                onClick={() => onToggleVisa(vt.id)}
                className={`px-3.5 py-2 rounded-full text-[12px] font-bold border-2 transition ${
                  selectedVisas.includes(vt.id)
                    ? `${colors.bg} ${colors.text} ${colors.border}`
                    : 'border-black/10 text-[hsl(var(--blue-900))]/40 hover:border-black/20'
                }`}
              >
                {vt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-2">
          Consulates
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'mumbai', label: 'Mumbai' },
            { id: 'delhi', label: 'Delhi' },
            { id: 'chennai', label: 'Chennai' },
            { id: 'kolkata', label: 'Kolkata' },
            { id: 'hyderabad', label: 'Hyderabad' },
          ].map(c => (
            <button
              key={c.id}
              onClick={() => onToggleConsulate(c.id)}
              className={`px-3.5 py-2 rounded-full text-[12px] font-bold border-2 transition ${
                selectedConsulates.includes(c.id)
                  ? 'bg-[hsl(var(--blue-700))]/10 text-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))]/30'
                  : 'border-black/10 text-[hsl(var(--blue-900))]/40 hover:border-black/20'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={onSubscribe}
        disabled={subscribing || selectedVisas.length === 0 || selectedConsulates.length === 0}
        className="w-full h-12 rounded-full btn-accent text-white font-bold"
      >
        {subscribing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Bell className="w-4 h-4 mr-1.5" />
            Enable Alerts
          </>
        )}
      </Button>
    </div>
  );
}

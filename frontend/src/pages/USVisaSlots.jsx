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
  Calendar,
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
  Users,
  AlertCircle,
  Building2,
  Search,
  Filter,
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

export default function USVisaSlots() {
  const { token, isAuthed } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState(null);
  const [groups, setGroups] = useState([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [selectedVisas, setSelectedVisas] = useState(['b1b2']);
  const [selectedConsulates, setSelectedConsulates] = useState(CONSULATE_ORDER);
  const [showSubscribeForm, setShowSubscribeForm] = useState(false);
  const [filterVisa, setFilterVisa] = useState('');
  const [filterConsulate, setFilterConsulate] = useState('');

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
      const [summaryRes, groupsRes, statusRes] = await Promise.all([
        axios.get(`${API}/usvisa/slots/summary`),
        axios.get(`${API}/usvisa/telegram-groups`),
        axios.get(`${API}/usvisa/status`),
      ]);

      setSummary(summaryRes.data);
      setGroups(groupsRes.data.groups || []);
      setWhatsappNumber(groupsRes.data.whatsapp_number || '');
      setStatus(statusRes.data);

      if (statusRes.data.last_slot_detected_at) {
        const slotsRes = await axios.get(`${API}/usvisa/slots`, { params: { limit: 50 } });
        setSlots(slotsRes.data.slots || []);
      }
    } catch (err) {
      console.error('Failed to fetch US visa data:', err);
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

  const hasSlots = summary && summary.overall && summary.overall.total_slots > 0;

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

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-bold text-[hsl(var(--accent))] mb-3">
              <RefreshCw className="w-3.5 h-3.5" /> Live Monitoring
            </div>
            <h1 className="font-display font-extrabold text-[32px] sm:text-[40px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
              US Visa Appointment Slots
            </h1>
            <p className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/60 max-w-xl mx-auto">
              We monitor the official US visa scheduling portal every 2-3 minutes for all consulates in India.
            </p>
          </div>

          {/* Status Bar */}
          <div className="rounded-2xl bg-white border border-black/5 p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${hasSlots ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-[13px] font-bold text-[hsl(var(--blue-900))]">
                  {hasSlots ? 'Slots Available' : 'Monitoring Active'}
                </span>
              </div>
              <div className="text-[12px] text-[hsl(var(--blue-900))]/50">
                Checked every {status?.check_interval_seconds ? `${Math.round(status.check_interval_seconds / 60)}m` : '3m'}
                {status?.last_check && ` · Last: ${new Date(status.last_check).toLocaleTimeString()}`}
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

          {hasSlots && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-[14px] text-emerald-800">
                    {summary.overall.total_slots} slots available across {summary.overall.consulates_with_slots} consulates!
                  </h3>
                  <p className="mt-1 text-[12px] text-emerald-700">
                    Join our Telegram groups for instant notifications when new slots open up.
                  </p>
                </div>
              </div>
            </div>
          )}

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

              <p className="mt-6 text-[12px] text-white/50">
                Already registered? <button onClick={() => navigate('/login')} className="font-bold text-white/80 hover:text-white underline">Sign in</button> to view live slot availability.
              </p>
            </div>
          )}

          {/* ── Slot data visible only to registered users ── */}
          {isAuthed && (
            <>

          {/* Quick Filter */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2 text-[12px] text-[hsl(var(--blue-900))]/50">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter:</span>
            </div>
            <select
              value={filterVisa}
              onChange={e => setFilterVisa(e.target.value)}
              className="h-9 rounded-full border border-black/10 px-3 text-[12px] font-bold text-[hsl(var(--blue-900))] bg-white outline-none focus:border-[hsl(var(--blue-700))]"
            >
              <option value="">All Visa Types</option>
              {[{ id: 'b1b2', label: 'B1/B2 Tourist' }, { id: 'f1', label: 'F1 Student' }, { id: 'h1b', label: 'H1B Work' }, { id: 'h4', label: 'H4 Dependent' }, { id: 'l1', label: 'L1 Transfer' }, { id: 'j1', label: 'J1 Exchange' }].map(vt => (
                <option key={vt.id} value={vt.id}>{vt.label}</option>
              ))}
            </select>
            <select
              value={filterConsulate}
              onChange={e => setFilterConsulate(e.target.value)}
              className="h-9 rounded-full border border-black/10 px-3 text-[12px] font-bold text-[hsl(var(--blue-900))] bg-white outline-none focus:border-[hsl(var(--blue-700))]"
            >
              <option value="">All Consulates</option>
              {CONSULATE_ORDER.map(cid => (
                <option key={cid} value={cid}>{cid.charAt(0).toUpperCase() + cid.slice(1)}</option>
              ))}
            </select>
            {(filterVisa || filterConsulate) && (
              <button
                onClick={() => { setFilterVisa(''); setFilterConsulate(''); }}
                className="text-[11px] font-bold text-[hsl(var(--blue-700))] hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Consulate Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {CONSULATE_ORDER.map(cid => {
              if (filterConsulate && filterConsulate !== cid) return null;
              const data = summary?.consulates?.[cid];
              if (!data) return null;
              const available = data.total_slots > 0;
              return (
                <div
                  key={cid}
                  className={`rounded-2xl bg-white border p-5 transition ${
                    available ? 'border-emerald-300 shadow-sm' : 'border-black/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className={`w-4 h-4 ${available ? 'text-emerald-600' : 'text-[hsl(var(--blue-900))]/30'}`} />
                        <h3 className="font-bold text-[15px] text-[hsl(var(--blue-900))]">{data.name}</h3>
                      </div>
                      <p className="text-[12px] text-[hsl(var(--blue-900))]/50 mt-0.5">{data.city}</p>
                    </div>
                    <div className={`text-[13px] font-bold ${available ? 'text-emerald-600' : 'text-[hsl(var(--blue-900))]/30'}`}>
                      {data.total_slots > 0 ? `${data.total_slots} slots` : 'No slots'}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(data.visa_types || {}).map(([vtId, vtData]) => {
                      if (filterVisa && filterVisa !== vtId) return null;
                      const colors = VISA_TYPE_COLORS[vtId] || VISA_TYPE_COLORS.b1b2;
                      return (
                        <span
                          key={vtId}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold border ${
                            vtData.available
                              ? `${colors.bg} ${colors.text} ${colors.border}`
                              : 'bg-gray-50 text-gray-300 border-gray-100'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${vtData.available ? colors.dot : 'bg-gray-300'}`} />
                          {vtData.name}
                        </span>
                      );
                    })}
                  </div>

                  {available && data.earliest_date && (
                    <p className="mt-3 text-[11px] text-emerald-700">
                      Earliest: {new Date(data.earliest_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}

                  <a
                    href={`https://visa.vfsglobal.com/ind/en/usa/book-an-appointment`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 w-full justify-center h-9 rounded-full border-2 border-[hsl(var(--blue-700))]/20 text-[12px] font-bold text-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-50))] hover:border-[hsl(var(--blue-700))]/40 transition"
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

          {/* Telegram Groups */}
          <div className="mb-8">
            <h2 className="font-display font-extrabold text-[22px] tracking-[-0.02em] text-[hsl(var(--blue-900))] mb-4">
              Join Telegram for Instant Alerts
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {groups.map(group => {
                const colors = VISA_TYPE_COLORS[group.visa_type] || VISA_TYPE_COLORS.b1b2;
                return (
                  <a
                    key={group.visa_type}
                    href={group.telegram_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group rounded-2xl border-2 p-5 transition hover:-translate-y-0.5 ${colors.border} ${colors.bg}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl ${colors.text}/10 flex items-center justify-center`}>
                        <Send className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div>
                        <h3 className={`font-bold text-[15px] ${colors.text}`}>{group.visa_name} Visa</h3>
                        <p className="text-[12px] text-[hsl(var(--blue-900))]/50">{group.visa_label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[13px] font-bold text-[hsl(var(--blue-700))] group-hover:underline">
                      <Users className="w-4 h-4" />
                      Join Telegram Group
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

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
                href={`https://wa.me/${whatsappNumber?.replace(/[\s+]/g, '')}?text=Hi%2C%20I%20need%20help%20with%20a%20US%20visa%20appointment.`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold text-[13px] transition"
              >
                <Send className="w-4 h-4" />
                Chat on WhatsApp
              </a>
              {whatsappNumber && (
                <div className="inline-flex items-center h-11 px-6 rounded-full border border-green-200 text-[13px] font-bold text-green-700">
                  {whatsappNumber}
                </div>
              )}
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
                  desc: 'The moment slots open up, we send notifications via Telegram, WhatsApp, and in-app.',
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

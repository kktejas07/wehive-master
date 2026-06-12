import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import {
  Calendar, Clock, MapPin, ChevronRight, Loader2, CheckCircle2,
  Building2, Shield, FileText, ChevronLeft,
} from 'lucide-react';

const EMBASSY_CITIES = [
  { id: 'delhi', name: 'New Delhi' },
  { id: 'mumbai', name: 'Mumbai' },
  { id: 'kolkata', name: 'Kolkata' },
  { id: 'chennai', name: 'Chennai' },
  { id: 'bangalore', name: 'Bangalore' },
  { id: 'hyderabad', name: 'Hyderabad' },
];

export default function VisaScheduling() {
  const { token, isAuthed } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [appId, setAppId] = useState('');
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    if (isAuthed) {
      axios.get(`${API}/users/me/applications`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setApplications(r.data || []))
        .catch(() => {});
    }
  }, [isAuthed]);

  useEffect(() => {
    if (country && date) {
      setLoading(true);
      axios.get(`${API}/visa-scheduling/slots/${country}`, { params: { date } })
        .then(r => setSlots(r.data || []))
        .catch(() => setSlots([]))
        .finally(() => setLoading(false));
    }
  }, [country, date]);

  const handleBook = async () => {
    if (!isAuthed || !appId || !date || !time) return;
    setLoading(true);
    try {
      const slot = slots.find(s => s.date === date && s.time === time);
      await axios.post(`${API}/visa-scheduling/book`, {
        application_id: appId, slot_id: slot?._id || '',
        date, time, embassy: country.toUpperCase(), city,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setConfirmed(true);
      toast({ title: 'Appointment booked!', description: `Visa appointment at ${city} on ${date} at ${time}` });
    } catch (err) {
      toast({ title: 'Booking failed', description: err.response?.data?.detail || 'Please try again' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[hsl(var(--soft-bg))] min-h-screen">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-1.5 text-[13px] text-[hsl(var(--blue-900))]/55 mb-6">
            <Link to="/" className="hover:text-[hsl(var(--blue-700))]">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-bold text-[hsl(var(--blue-900))]">Visa Appointment Scheduling</span>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-bold text-[hsl(var(--accent))] mb-3">
              <Calendar className="w-3.5 h-3.5" /> Schedule Appointment
            </div>
            <h1 className="font-display font-extrabold text-[32px] sm:text-[40px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
              Book your visa appointment
            </h1>
            <p className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/60 max-w-xl mx-auto">
              Select your embassy location and available time slot.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`flex items-center gap-2 ${s > 1 ? 'ml-2' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold ${step >= s ? 'bg-[hsl(var(--accent))] text-white' : 'bg-white border border-black/10 text-[hsl(var(--blue-900))]/40'}`}>{s}</div>
                <div className={`text-[11px] font-bold hidden sm:block ${step >= s ? 'text-[hsl(var(--blue-900))]' : 'text-[hsl(var(--blue-900))]/40'}`}>
                  {['Select', 'Location', 'Time', 'Confirm'][s - 1]}
                </div>
                {s < 4 && <div className={`w-8 h-px ${step > s ? 'bg-[hsl(var(--accent))]' : 'bg-black/10'}`} />}
              </div>
            ))}
          </div>

          {!confirmed ? (
            <div className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8">
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="font-bold text-[18px] text-[hsl(var(--blue-900))]">Select Application</h2>
                  <p className="text-[13px] text-[hsl(var(--blue-900))]/60">Choose the visa application you want to schedule an appointment for.</p>
                  {applications.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-black/10 p-8 text-center">
                      <FileText className="w-10 h-10 text-[hsl(var(--blue-900))]/20 mx-auto" />
                      <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/40">No applications found.</p>
                      <Link to="/student-visa" className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline">
                        Start an application <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {applications.filter(a => a.status === 'submitted' || a.status === 'draft').map(app => (
                        <button
                          key={app._id}
                          onClick={() => { setAppId(app._id); setCountry(app.country_id || ''); setStep(2); }}
                          className="w-full text-left p-4 rounded-xl border border-black/5 hover:border-[hsl(var(--blue-700))]/30 transition"
                        >
                          <div className="font-bold text-[14px] text-[hsl(var(--blue-900))]">{app.applicant_name || app._id?.slice(0, 8)}</div>
                          <div className="text-[12px] text-[hsl(var(--blue-900))]/55">{app.visa_type} · {app.country_name || app.country_id}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <button onClick={() => setStep(1)} className="flex items-center gap-1 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline mb-2">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <h2 className="font-bold text-[18px] text-[hsl(var(--blue-900))]">Select Embassy Location</h2>
                  <p className="text-[13px] text-[hsl(var(--blue-900))]/60">Choose the city where you want to attend your visa interview.</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {EMBASSY_CITIES.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setCity(c.name); setStep(3); }}
                        className="text-left p-4 rounded-xl border-2 border-black/5 hover:border-[hsl(var(--blue-700))]/30 hover:bg-[hsl(var(--blue-50))] transition"
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-[hsl(var(--blue-700))]" />
                          <div>
                            <div className="font-bold text-[14px] text-[hsl(var(--blue-900))]">{c.name}</div>
                            <div className="text-[11px] text-[hsl(var(--blue-900))]/55">{country?.toUpperCase()} Embassy</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <button onClick={() => setStep(2)} className="flex items-center gap-1 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline mb-2">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <h2 className="font-bold text-[18px] text-[hsl(var(--blue-900))]">Select Date & Time</h2>
                  <p className="text-[13px] text-[hsl(var(--blue-900))]/60">Available slots at {city} for {country?.toUpperCase()}.</p>
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full h-11 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px]" min={new Date().toISOString().split('T')[0]} />
                  </div>
                  {date && (
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-2">Available Time Slots</label>
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blue-700))]" />
                      ) : slots.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {slots.filter(s => s.date === date && !s.booked).map(s => (
                            <button
                              key={s._id}
                              onClick={() => { setTime(s.time); setStep(4); }}
                              className={`px-4 py-2.5 rounded-full text-[13px] font-bold border-2 transition ${
                                time === s.time ? 'bg-[hsl(var(--blue-700))] text-white border-[hsl(var(--blue-700))]' : 'border-black/10 hover:border-[hsl(var(--blue-700))]/30'
                              }`}
                            >
                              {s.time}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[13px] text-[hsl(var(--blue-900))]/40">No slots available for this date.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <button onClick={() => setStep(3)} className="flex items-center gap-1 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline mb-2">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <h2 className="font-bold text-[18px] text-[hsl(var(--blue-900))]">Confirm Appointment</h2>
                  <div className="rounded-2xl bg-[hsl(var(--soft-bg))] p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[hsl(var(--blue-900))]/60">Embassy</span>
                      <span className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{country?.toUpperCase()} Embassy</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[hsl(var(--blue-900))]/60">City</span>
                      <span className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{city}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[hsl(var(--blue-900))]/60">Date</span>
                      <span className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[hsl(var(--blue-900))]/60">Time</span>
                      <span className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{time}</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-[12px] text-amber-800">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Please arrive 30 minutes early with all original documents and a copy of your appointment confirmation.
                  </div>
                  <Button onClick={handleBook} disabled={loading} className="w-full h-12 rounded-full btn-accent text-white font-bold">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Booking'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl bg-white border border-black/5 p-8 text-center">
              <div className="inline-flex h-16 w-16 rounded-full bg-emerald-100 items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="font-display font-extrabold text-[24px] text-[hsl(var(--blue-900))]">Appointment Confirmed!</h2>
              <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60">
                Your visa appointment at <strong>{city}</strong> is scheduled for <strong>{date}</strong> at <strong>{time}</strong>.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/account?tab=applications" className="inline-flex items-center gap-1.5 rounded-full btn-primary text-white h-11 px-6 font-bold text-[13px]">
                  View applications <ChevronRight className="w-4 h-4" />
                </Link>
                <Link to={`/visa-interview`} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 h-11 px-6 font-bold text-[13px] text-[hsl(var(--blue-900))] hover:bg-[hsl(var(--soft-bg))]">
                  Prepare for interview
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

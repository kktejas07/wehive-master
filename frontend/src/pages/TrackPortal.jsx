import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ShieldCheck, Clock, CheckCircle, Bell, ArrowRight, Activity, HelpCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function TrackPortal() {
  const [appId, setAppId] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (appId.trim()) {
      // Remove any hash or spaces from ID
      const cleanId = appId.trim().replace('#', '').toLowerCase();
      navigate(`/track/${cleanId}`);
    }
  };

  const steps = [
    {
      title: 'Digital Filing',
      desc: 'Our specialists compile, translate, and audit your files to ensure 100% compliance before lodging with the embassy.',
      icon: ShieldCheck,
    },
    {
      title: 'Real-Time Sync',
      desc: 'Every milestone (vfs booking, document review, embassy reception, decision) is pushed instantly to your dashboard.',
      icon: Activity,
    },
    {
      title: 'Instant Alerts',
      desc: 'Receive automatic notifications via WhatsApp, SMS, and Email the second the consular officer updates your file status.',
      icon: Bell,
    },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))]">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-4xl mx-auto px-5">
          
          <div className="grid md:grid-cols-12 gap-8 items-center">
            {/* Search Panel */}
            <div className="md:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] font-bold text-[hsl(var(--accent))]">
                <Clock className="w-3.5 h-3.5" /> 24/7 File Tracking
              </div>
              <h1 className="font-display font-extrabold text-[36px] sm:text-[48px] tracking-[-0.03em] leading-none text-[hsl(var(--blue-900))]">
                Track Your Application
              </h1>
              <p className="text-[15px] text-[hsl(var(--blue-900))]/65 leading-relaxed max-w-md">
                We believe transparency is non-negotiable. Enter your WeHive application ID below for live status updates.
              </p>

              <form onSubmit={handleSearch} className="relative max-w-md">
                <input
                  required
                  type="text"
                  placeholder="Enter Application ID (e.g., #us-student-101)"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  className="w-full h-14 pl-12 pr-32 rounded-2xl border-2 border-black/5 focus:border-[hsl(var(--accent))] outline-none text-[15px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-900))]/40 bg-white transition shadow-md shadow-blue-900/5 font-mono"
                />
                <Search className="absolute left-4.5 top-4.5 w-5 h-5 text-[hsl(var(--blue-900))]/45" />
                <button
                  type="submit"
                  className="absolute right-2 top-2 h-10 px-6 rounded-xl bg-[hsl(var(--blue-900))] text-white font-bold text-[13px] hover:opacity-90 transition"
                >
                  Track Status
                </button>
              </form>

              <div className="text-[12.5px] text-[hsl(var(--blue-900))]/60">
                Don&apos;t have an Application ID?{' '}
                <Link to="/assessment" className="text-[hsl(var(--blue-700))] font-bold hover:underline">
                  Start an assessment to file with us →
                </Link>
              </div>
            </div>

            {/* Visual Guide Card */}
            <div className="md:col-span-5 bg-white border border-black/5 rounded-3xl p-6 shadow-xl shadow-blue-900/5 relative overflow-hidden">
              <div className="absolute -top-10 -left-10 h-24 w-24 rounded-full bg-[hsl(var(--accent))]/5 blur-xl pointer-events-none" />
              
              <h3 className="font-display font-extrabold text-[18px] text-[hsl(var(--blue-900))] mb-4">
                WeHive Tracking Promise
              </h3>
              
              <div className="space-y-5">
                {steps.map((s, i) => {
                  const StepIcon = s.icon;
                  return (
                    <div key={i} className="flex gap-3">
                      <span className="h-8 w-8 rounded-lg bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-700))] inline-flex items-center justify-center shrink-0">
                        <StepIcon className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="font-bold text-[13.5px] text-[hsl(var(--blue-900))]">{s.title}</div>
                        <p className="text-[12px] text-[hsl(var(--blue-900))]/60 mt-0.5 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

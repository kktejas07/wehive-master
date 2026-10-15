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
      <main className="pt-28 pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto px-5">
          
          <div className="grid md:grid-cols-12 gap-8 items-center">
            {/* Search Panel */}
            <div className="md:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))]">
                <Clock className="w-3.5 h-3.5" /> 24/7 File Tracking
              </div>
              <h1 className="font-display font-bold text-[36px] sm:text-[48px] tracking-[-0.02em] leading-tight text-[hsl(var(--blue-900))]">
                Track Your Application
              </h1>
              <p className="text-[15px] text-muted-foreground leading-relaxed max-w-md">
                We believe transparency is non-negotiable. Enter your WeHive application ID below for live status updates.
              </p>

              <form onSubmit={handleSearch} className="relative max-w-md flex flex-col gap-2 sm:block">
                <label htmlFor="trackportal-app-id" className="sr-only">Application ID</label>
                <div className="relative">
                  <input
                    id="trackportal-app-id"
                    data-testid="track-input"
                    required
                    type="text"
                    placeholder="Application ID, e.g. us-student-101"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 sm:pr-36 rounded-xl border border-[hsl(var(--border))] focus:border-[hsl(var(--blue-700))] focus:ring-2 focus:ring-[hsl(var(--blue-700))]/20 outline-none text-[16px] sm:text-[15px] text-[hsl(var(--blue-900))] placeholder:text-muted-foreground bg-white transition shadow-sm"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <button
                  type="submit"
                  data-testid="track-submit"
                  className="sm:absolute sm:right-2 sm:top-2 h-12 sm:h-10 px-6 rounded-xl btn-accent text-white font-semibold text-[15px] sm:text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent))]"
                >
                  Track Status
                </button>
              </form>

              <div className="text-[13px] text-muted-foreground">
                Don&apos;t have an Application ID?{' '}
                <Link to="/assessment" className="text-[hsl(var(--blue-700))] font-bold hover:underline">
                  Start an assessment to file with us →
                </Link>
              </div>
            </div>

            {/* Visual Guide Card */}
            <div className="md:col-span-5 bg-white border border-[hsl(var(--border))] rounded-2xl p-6 shadow-sm relative overflow-hidden">
              
              <h3 className="font-display font-bold text-[18px] text-[hsl(var(--blue-900))] mb-4">
                WeHive Tracking Promise
              </h3>
              
              <div className="space-y-5">
                {steps.map((s, i) => {
                  const StepIcon = s.icon;
                  return (
                    <div key={i} className="flex gap-3">
                      <span className="h-9 w-9 rounded-lg bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] inline-flex items-center justify-center shrink-0">
                        <StepIcon className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="font-bold text-[14px] text-[hsl(var(--blue-900))]">{s.title}</div>
                        <p className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
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

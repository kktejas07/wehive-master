import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { motion } from 'framer-motion';
import {
  Sun, Cloud, MapPin, Sparkles, Globe2, CalendarDays, Languages, IndianRupee,
  Heart, ChevronRight, Loader2, Bookmark, RefreshCw, Compass
} from 'lucide-react';

function ItineraryStep({ step }) {
  return (
    <div className="relative pl-10 pb-7 last:pb-0">
      <span className="absolute left-0 top-0 h-9 w-9 rounded-xl bg-[hsl(var(--blue-700))] text-white inline-flex items-center justify-center text-[13px] font-bold shadow-sm">
        {step.day}
      </span>
      <span className="absolute left-[17px] top-9 bottom-0 w-px bg-black/10" />
      <div className="text-[16px] font-bold text-[hsl(var(--blue-900))]">{step.theme || `Day ${step.day}`}</div>
      {step.activities && (
        <ul className="mt-2 space-y-2">
          {step.activities.map((activity, idx) => (
            <li key={idx} className="text-[14px] leading-relaxed text-[hsl(var(--blue-900))]/70 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
              {activity}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function HolidayPlanner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, isAuthed } = useAuth();
  const { toast } = useToast();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [duration, setDuration] = useState(5);
  const [preferences, setPreferences] = useState("Budget friendly, cultural");
  const [isCached, setIsCached] = useState(false);

  const fetchPlan = async (refresh = false) => {
    if (!isAuthed) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${API}/travel/planner?country=${id}&days=${duration}&preferences=${encodeURIComponent(preferences)}&refresh=${refresh}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(res.data.itinerary);
      setIsCached(res.data.cached);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to generate AI travel plan.', variant: 'destructive' });
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthed) {
      fetchPlan(false);
    }
  }, [id, isAuthed]);

  const onSave = async () => {
    if (!isAuthed) return;
    setSaving(true);
    try {
      await axios.post(
        `${API}/users/me/saved-plans`,
        { country_id: id, duration_days: duration, preferences },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: 'Plan saved', description: 'Find it under My account \u2192 Saved holiday plans.' });
    } catch {
      toast({ title: 'Could not save plan', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))] flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-5 text-center">
          <Compass className="w-16 h-16 text-[hsl(var(--blue-900))]/20 mb-4" />
          <h2 className="text-2xl font-bold mb-2">AI Travel Planner</h2>
          <p className="text-[hsl(var(--blue-900))]/60 mb-6 max-w-sm">Please log in to generate custom day-by-day itineraries using our AI Travel Agent.</p>
          <Button onClick={() => navigate('/login')} className="rounded-full">Log In to Continue</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))]">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-5 pt-28 pb-20">
        <div className="mb-10">
          <Link to={`/destinations/${id}`} className="text-[13px] font-bold text-[hsl(var(--blue-900))]/50 hover:text-[hsl(var(--blue-900))] inline-flex items-center gap-1 mb-4 transition">
            <ChevronRight className="w-4 h-4 rotate-180" /> Back to {id}
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-[hsl(var(--accent))] flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> AI Agent Planner
              </div>
              <h1 className="font-display font-extrabold text-[38px] sm:text-[48px] tracking-tight leading-none capitalize">
                {id} Itinerary
              </h1>
            </div>
            {isCached && data && (
              <div className="text-[11px] font-bold text-emerald-500 flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-full border border-emerald-100">
                <RefreshCw className="w-3.5 h-3.5" /> Loaded from Cache
              </div>
            )}
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="bg-white rounded-3xl border border-black/5 p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] font-bold text-[hsl(var(--blue-900))]/70 mb-2">Duration (Days)</label>
              <input 
                type="number" 
                min="1" 
                max="14" 
                value={duration} 
                onChange={e => setDuration(parseInt(e.target.value) || 1)}
                className="w-full bg-[hsl(var(--soft-bg))] border border-black/5 rounded-xl px-4 py-3 text-[14px] font-bold focus:outline-none focus:border-[hsl(var(--accent))] transition"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[hsl(var(--blue-900))]/70 mb-2">Travel Preferences</label>
              <input 
                type="text" 
                value={preferences} 
                onChange={e => setPreferences(e.target.value)}
                placeholder="e.g. Budget friendly, museums, nightlife"
                className="w-full bg-[hsl(var(--soft-bg))] border border-black/5 rounded-xl px-4 py-3 text-[14px] font-bold focus:outline-none focus:border-[hsl(var(--accent))] transition"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => fetchPlan(true)} disabled={loading} className="rounded-full flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Generating...' : 'Generate AI Plan'}
            </Button>
          </div>
        </div>

        {/* Itinerary Display */}
        {loading ? (
          <div className="bg-white rounded-3xl border border-black/5 p-10 flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--accent))] mb-4" />
            <div className="text-[16px] font-bold text-[hsl(var(--blue-900))]">AI is crafting your itinerary...</div>
            <div className="text-[13px] text-[hsl(var(--blue-900))]/60 mt-2 text-center max-w-sm">
              Analyzing {duration} days of activities in {id} optimized for "{preferences}".
            </div>
          </div>
        ) : data && data.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-black/5 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-black/5">
              <h3 className="font-bold text-[20px]">Your {duration}-Day Plan</h3>
              <Button onClick={onSave} disabled={saving} variant="outline" className="rounded-full flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />} Save Plan
              </Button>
            </div>
            <div className="max-w-2xl">
              {data.map((step, idx) => (
                <ItineraryStep key={idx} step={step} />
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-10 text-[hsl(var(--blue-900))]/50 font-bold">
            No itinerary generated yet.
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { API } from '../context/AuthContext';
import { Loader2, MapPin, Calendar, Compass, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GlobalEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [digest, setDigest] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    axios.get(`${API}/events?limit=1000`)
      .then(r => {
        if (mounted) {
          setEvents(r.data.items || []);
        }
      })
      .catch(err => console.error(err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
      
    axios.get(`${API}/events/digest`)
      .then(r => {
        if (mounted && r.data?.digest) {
          setDigest(r.data.digest);
        }
      })
      .catch(e => console.warn("No AI digest available yet."));
      
    return () => { mounted = false; };
  }, []);

  return (
    <div className="bg-[#FAFAFA] min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-white border-b border-black/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6">
            <Compass className="w-4 h-4" /> Discover
          </div>
          <h1 className="font-display font-extrabold text-[42px] sm:text-[64px] leading-[1.0] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
            Global Events <span className="text-[hsl(var(--accent))]">Hub</span>
          </h1>
          <p className="mt-6 text-[17px] text-[hsl(var(--blue-900))]/65 max-w-2xl mx-auto">
            Plan your next journey around the world's biggest festivals, conferences, and cultural moments. Check visa requirements and build a holiday itinerary in one click.
          </p>
        </div>
      </section>

      {/* Events Grid & AI Digest */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          
          {/* AI Digest Hero Banner */}
          {digest && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-12 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/50 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Sparkles className="w-48 h-48 text-emerald-600" />
              </div>
              <div className="relative z-10 max-w-4xl">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600 mb-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> AI Monthly Events Briefing
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-4">{digest.title || "Global Events Summary"}</h3>
                <p className="text-gray-700 text-lg leading-relaxed mb-6">{digest.summary}</p>
                {digest.key_points && digest.key_points.length > 0 && (
                  <ul className="space-y-3">
                    {digest.key_points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-3 text-gray-800 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--blue-700))]" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20 text-[hsl(var(--blue-900))]/50">
              No upcoming events found. Please check back later.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {events.map((evt) => (
                <div key={evt.id} className="group bg-white rounded-3xl overflow-hidden border border-black/5 hover:border-black/10 hover:shadow-xl transition-all duration-300 flex flex-col">
                  {/* Image Area */}
                  <div className="relative h-56 bg-black/5 overflow-hidden">
                    <img 
                      src={evt.image_url || "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80"} 
                      alt={evt.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur text-xs font-bold text-[hsl(var(--blue-900))] shadow-sm">
                        {evt.category}
                      </span>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-display font-extrabold text-[22px] leading-tight text-[hsl(var(--blue-900))]">
                      {evt.name}
                    </h3>
                    
                    <div className="mt-4 space-y-2 mb-8">
                      <div className="flex items-center gap-2 text-[14px] text-[hsl(var(--blue-900))]/65">
                        <Calendar className="w-4 h-4 text-[hsl(var(--accent))]" />
                        {evt.date && !isNaN(new Date(evt.date).getTime()) ? new Date(evt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : 'Upcoming'}
                      </div>
                      <div className="flex items-center gap-2 text-[14px] text-[hsl(var(--blue-900))]/65">
                        <MapPin className="w-4 h-4 text-[hsl(var(--accent))]" />
                        <span className="capitalize">{evt.country_id.replace('-', ' ')}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-black/5">
                      <Button
                        onClick={() => navigate(`/holiday/${evt.country_id}`)}
                        className="bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))] hover:bg-black/5 font-bold h-11 rounded-xl"
                      >
                        Plan Trip
                      </Button>
                      <Button
                        onClick={() => navigate(`/visa/${evt.country_id}`)}
                        className="btn-primary text-white font-bold h-11 rounded-xl flex items-center justify-center gap-2"
                      >
                        Check Visa <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

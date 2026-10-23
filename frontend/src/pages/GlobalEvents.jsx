import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { API } from '../context/AuthContext';
import { toast } from '../hooks/use-toast';
import { Loader2, MapPin, Calendar, Compass, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { destination } from '../lib/destinations';

export default function GlobalEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [digest, setDigest] = useState(null);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    axios.get(`${API}/events?limit=1000`)
      .then(r => {
        if (mounted) {
          setEvents(r.data.items || []);
        }
      })
      .catch(() => { if (mounted) setError(true); })
      .finally(() => {
        if (mounted) setLoading(false);
      });
      
    axios.get(`${API}/events/digest`)
      .then(r => {
        if (mounted && r.data?.digest) {
          setDigest(r.data.digest);
        }
      })
      .catch(() => { if (mounted) toast({ title: "Couldn't load the events digest" }); });
      
    return () => { mounted = false; };
  }, []);

  return (
    <div className="bg-[hsl(var(--soft-bg))] min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-28 pb-12 md:pb-16 mesh-bg border-b border-[hsl(var(--border))]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 text-[hsl(var(--blue-700))] text-[12px] font-bold uppercase tracking-[0.14em] mb-4">
            <Compass className="w-3.5 h-3.5" /> Discover
          </div>
          <h1 className="font-display font-bold text-[36px] sm:text-[56px] leading-[1.05] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
            Global Events <span className="text-[hsl(var(--red-500))]">Hub</span>
          </h1>
          <p className="mt-4 text-[16px] sm:text-[18px] text-muted-foreground max-w-2xl mx-auto">
            Plan your next journey around the world's biggest festivals, conferences, and cultural moments. Check visa requirements and build a holiday itinerary in one click.
          </p>
        </div>
      </section>

      {/* Events Grid & AI Digest */}
      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          
          {/* AI Digest Hero Banner */}
          {digest && (
            <motion.div 
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-10 bg-white border border-[hsl(var(--border))] rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden"
            >
              <div className="relative z-10 max-w-4xl">
                <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-700))] mb-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> AI Monthly Events Briefing
                </div>
                <h3 className="font-display text-[22px] sm:text-[24px] font-bold text-[hsl(var(--blue-900))] mb-3 leading-tight">{digest.title || "Global Events Summary"}</h3>
                <p className="text-muted-foreground text-[16px] leading-relaxed mb-6">{digest.summary}</p>
                {digest.key_points && digest.key_points.length > 0 && (
                  <ul className="space-y-3">
                    {digest.key_points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-3 text-[hsl(var(--blue-900))] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--blue-700))] mt-2 shrink-0"></span>
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
          ) : error ? (
            <div className="text-center py-20 text-muted-foreground">
              We couldn't load events right now. Please refresh the page or try again later.
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              No upcoming events found. Please check back later.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((evt) => (
                <div key={evt.id} className="group bg-white rounded-2xl overflow-hidden border border-[hsl(var(--border))] hover:border-[hsl(var(--blue-200))] hover:shadow-md hover:-translate-y-0.5 transition duration-200 flex flex-col">
                  {/* Image Area */}
                  <div className="relative h-56 bg-black/5 overflow-hidden">
                    <img loading="lazy" decoding="async" 
                      src={evt.image_url || "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80"} 
                      alt={evt.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="px-3 py-1 rounded-full bg-white text-[12px] font-semibold text-[hsl(var(--blue-900))] shadow-sm">
                        {evt.category}
                      </span>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-display font-bold text-[22px] leading-tight text-[hsl(var(--blue-900))]">
                      {evt.name}
                    </h3>
                    
                    <div className="mt-4 space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                        <Calendar className="w-4 h-4 text-[hsl(var(--blue-700))]" />
                        {evt.date && !isNaN(new Date(evt.date).getTime()) ? new Date(evt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : 'Upcoming'}
                      </div>
                      <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                        <MapPin className="w-4 h-4 text-[hsl(var(--blue-700))]" />
                        <span className="capitalize">{destination(evt.country_id).name}</span>
                      </div>
                    </div>

                    {/* Actions: only for destinations that have visa / holiday pages */}
                    {destination(evt.country_id).iso2 && (
                    <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-[hsl(var(--border))]">
                      <Button
                        onClick={() => navigate(`/holiday/${destination(evt.country_id).iso2}`)}
                        variant="outline"
                        className="bg-white text-[hsl(var(--blue-900))] hover:bg-white hover:border-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-700))] font-semibold h-11 rounded-xl"
                      >
                        Plan Trip
                      </Button>
                      <Button
                        onClick={() => navigate(`/visa/${destination(evt.country_id).iso2}`)}
                        className="btn-primary text-white font-semibold h-11 rounded-xl flex items-center justify-center gap-2"
                      >
                        Check Visa <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                    )}
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

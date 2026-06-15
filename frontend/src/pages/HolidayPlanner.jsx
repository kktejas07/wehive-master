import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import {
  Sun, Cloud, MapPin, Sparkles, Globe2, CalendarDays, Languages, IndianRupee,
  Heart, ChevronRight, Loader2, Bookmark,
} from 'lucide-react';

function StatTile({ Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white border border-black/5 p-5">
      <Icon className="w-4 h-4 text-[hsl(var(--accent))]" />
      <div className="mt-2 text-[10px] uppercase tracking-[0.16em] font-bold text-[hsl(var(--blue-900))]/55">{label}</div>
      <div className="mt-1 text-[15px] font-bold text-[hsl(var(--blue-900))]">{value}</div>
    </div>
  );
}

function AttractionCard({ a, idx }) {
  return (
    <div className="flex gap-4 rounded-2xl bg-white border border-black/5 p-4 hover:border-[hsl(var(--blue-700))]/20 transition">
      <div className="font-display font-extrabold text-[42px] leading-none text-[hsl(var(--blue-50))]" style={{ WebkitTextStroke: '1px hsl(var(--blue-700))' }}>
        0{idx}
      </div>
      <div className="flex-1">
        <div className="text-[15.5px] font-bold text-[hsl(var(--blue-900))]">{a.name}</div>
        <div className="text-[12.5px] text-[hsl(var(--blue-900))]/55 inline-flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {a.city}
        </div>
      </div>
      <Heart className="w-4 h-4 text-[hsl(var(--accent))]/60" />
    </div>
  );
}

function ItineraryStep({ step }) {
  return (
    <div className="relative pl-10 pb-7 last:pb-0">
      <span className="absolute left-0 top-0 h-9 w-9 rounded-xl bg-[hsl(var(--blue-700))] text-white inline-flex items-center justify-center text-[13px] font-bold">
        {step.day}
      </span>
      <span className="absolute left-[17px] top-9 bottom-0 w-px bg-black/10" />
      <div className="text-[16px] font-bold text-[hsl(var(--blue-900))]">{step.title}</div>
      <div className="mt-1 text-[14px] leading-relaxed text-[hsl(var(--blue-900))]/65">{step.desc}</div>
    </div>
  );
}

export default function HolidayPlanner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, isAuthed } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [duration, setDuration] = useState(7);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const timer = setTimeout(() => {
      axios
        .get(`${API}/countries/${id}/holiday-plan`)
        .then((r) => mounted && setData(r.data))
        .catch(() => mounted && setData(null))
        .finally(() => mounted && setLoading(false));
    }, 3000);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [id]);

  const onSave = async () => {
    if (!isAuthed) {
      navigate('/login');
      return;
    }
    setSaving(true);
    try {
      await axios.post(
        `${API}/users/me/saved-plans`,
        { country_id: id, duration_days: duration },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: 'Plan saved', description: 'Find it under My account \u2192 Saved holiday plans.' });
    } catch {
      toast({ title: 'Could not save plan' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="bg-white">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" />
        </div>
        <Footer />
      </div>
    );
  }

  const c = data.country;
  const p = data.plan;

  return (
    <div className="bg-white">
      <Navbar />

      <section className="pt-28 pb-16 bg-[hsl(var(--soft-bg))] border-b border-black/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-1.5 text-[13px] text-[hsl(var(--blue-900))]/55">
            <Link to="/" className="hover:text-[hsl(var(--blue-700))]">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/" className="hover:text-[hsl(var(--blue-700))]">Holiday planner</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[hsl(var(--blue-900))] font-bold">{c.name}</span>
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
                <Sparkles className="w-3.5 h-3.5" /> Holiday planner
              </div>
              <h1 className="mt-2 font-display font-extrabold text-[42px] sm:text-[60px] leading-[1.0] tracking-[-0.035em] text-[hsl(var(--blue-900))]">
                <span className="text-[40px] mr-3">{c.flag}</span>
                Plan your{' '}
                <span className="text-[hsl(var(--accent))]">{c.name}</span> trip.
              </h1>
              <p className="mt-4 text-[16px] text-[hsl(var(--blue-900))]/65 max-w-xl">
                A ready-to-go itinerary with the top sights, weather, currency,
                and a sample {c.holiday_default_days}-day plan curated by our
                travel experts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-full bg-white border border-black/8 p-1">
                {[5, 7, 10].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-bold transition ${
                      duration === d
                        ? 'bg-[hsl(var(--blue-700))] text-white'
                        : 'text-[hsl(var(--blue-900))]/65 hover:text-[hsl(var(--blue-900))]'
                    }`}
                  >
                    {d} days
                  </button>
                ))}
              </div>
              <Button
                onClick={onSave}
                disabled={saving}
                className="rounded-full btn-accent text-white h-11 px-5 font-bold"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <span className="inline-flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4" /> Save plan
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatTile Icon={CalendarDays} label="Best time" value={p.best_time} />
          <StatTile Icon={IndianRupee} label="Currency" value={p.currency} />
          <StatTile Icon={Languages} label="Language" value={p.language} />
          <StatTile Icon={Cloud} label="Weather" value={p.weather} />
          <StatTile Icon={Globe2} label="Visa" value={c.no_visa ? 'Not required' : c.validity} />
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
              Top 5 attractions
            </h2>
            <div className="mt-5 space-y-3">
              {p.attractions.map((a, i) => (
                <AttractionCard key={a.id} a={a} idx={i + 1} />
              ))}
            </div>
          </div>
          <aside className="lg:col-span-5">
            <div className="rounded-3xl bg-[hsl(var(--blue-900))] text-white p-7 sticky top-28">
              <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-white/70 inline-flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-[hsl(var(--accent))]" /> Sample itinerary
              </div>
              <h3 className="mt-2 font-display font-extrabold text-[24px] tracking-[-0.025em]">
                {duration} days in {c.name}
              </h3>
              <div className="mt-6">
                {p.itinerary.slice(0, duration).map((s) => (
                  <ItineraryStep key={s.day} step={s} />
                ))}
              </div>
              <div className="mt-2 pt-5 border-t border-white/10 text-[13px] text-white/60">
                Itineraries are templates. Our specialists tailor every plan to
                your travellers, budget, and visa timeline.
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="py-16 bg-[hsl(var(--soft-bg))] border-t border-black/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <h3 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
              Ready to apply for {c.name}?
            </h3>
            <p className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/65">
              Start your visa application alongside this trip plan \u2014
              everything stays in one dashboard.
            </p>
          </div>
          <Link
            to={`/visa/${c.id}`}
            className="inline-flex items-center gap-2 rounded-full btn-primary text-white h-12 px-6 font-bold"
          >
            Begin {c.name} visa
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

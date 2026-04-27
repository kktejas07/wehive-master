import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import {
  Check, Clock, ShieldCheck, ChevronRight, Calendar,
  CreditCard, FileText, Sparkles, Star, Loader2, Briefcase,
  GraduationCap, Plane, Building2,
} from 'lucide-react';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { COUNTRIES, FAQS, BRAND } from '../data/mock';
import DeliveryCountdown from '../components/DeliveryCountdown';

const TYPE_ICONS = {
  Tourist: Plane,
  Business: Briefcase,
  Student: GraduationCap,
  Work: Building2,
};

const TYPE_COLORS = {
  Tourist: '#22c55e',
  Business: '#0a2c8a',
  Student: '#f59e0b',
  Work: '#ec4899',
};

function Breadcrumb({ countryName }) {
  return (
    <div className="flex items-center gap-1.5 text-[13px] text-[hsl(var(--blue-900))]/55">
      <Link to="/" className="hover:text-[hsl(var(--blue-700))]">Home</Link>
      <ChevronRight className="w-3.5 h-3.5" />
      <Link to="/" className="hover:text-[hsl(var(--blue-700))]">Visas</Link>
      <ChevronRight className="w-3.5 h-3.5" />
      <span className="text-[hsl(var(--blue-900))] font-bold">{countryName}</span>
    </div>
  );
}

function CategoryTabs({ categories, value, onChange }) {
  const ids = Object.keys(categories || {});
  return (
    <div className="inline-flex flex-wrap gap-2 p-1.5 rounded-2xl bg-white border border-black/8">
      {ids.map((id) => {
        const Icon = TYPE_ICONS[id] || Plane;
        const active = value === id;
        const color = TYPE_COLORS[id] || '#0a2c8a';
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-bold transition ${
              active
                ? 'text-white'
                : 'text-[hsl(var(--blue-900))]/65 hover:text-[hsl(var(--blue-900))]'
            }`}
            style={active ? { background: color } : {}}
          >
            <Icon className="w-3.5 h-3.5" />
            {id}
          </button>
        );
      })}
    </div>
  );
}

function CategoryDetails({ cat, country, onApply, applying }) {
  const fallbackImg = COUNTRIES.find((c) => c.id === country.id)?.image;
  return (
    <div className="grid lg:grid-cols-12 gap-10 items-start">
      <div className="lg:col-span-7">
        <div className="inline-flex items-center gap-2 rounded-full bg-white border border-black/5 px-3 py-1.5 text-[12px] font-bold text-[hsl(var(--blue-900))]/75">
          <span className="text-base leading-none">{country.flag}</span>
          {cat.name} · Valid {cat.validity}
        </div>
        <h1 className="mt-4 font-display font-extrabold text-[42px] sm:text-[64px] leading-[1.0] tracking-[-0.035em] text-[hsl(var(--blue-900))]">
          {country.name}{' '}
          <span className="text-[hsl(var(--accent))]">{cat.name.toLowerCase()}.</span>
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-[hsl(var(--blue-900))]/65 max-w-xl">
          Apply in 12 minutes. Approved in {cat.processing_days} days. Backed by{' '}
          {BRAND.name}'s on-time guarantee — refund if we are even a day late.
        </p>

        {country.delivery?.same_day && (
          <div className="mt-5">
            <DeliveryCountdown deliveryDays={cat.processing_days} />
          </div>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          <Button
            onClick={onApply}
            disabled={applying}
            className="rounded-full btn-primary text-white h-12 px-6 font-bold"
          >
            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : `Apply · ₹${cat.fees_inr.toLocaleString('en-IN')}`}
          </Button>
          <a
            href={`tel:${BRAND.phoneRaw}`}
            className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] hover:bg-[hsl(var(--red-600))] text-white h-12 px-5 font-bold transition-colors"
          >
            Talk to a counsellor
          </a>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
          <MetaCard Icon={Clock} k="Processing" v={`${cat.processing_days}d`} />
          <MetaCard Icon={Calendar} k="Validity" v={cat.validity} />
          <MetaCard Icon={CreditCard} k="Govt. fee" v={`₹${cat.fees_inr.toLocaleString('en-IN')}`} />
        </div>
      </div>
      <div className="lg:col-span-5">
        <div className="relative rounded-3xl overflow-hidden aspect-[4/5] shadow-[0_30px_70px_-30px_rgba(10,44,138,0.5)]">
          <img src={fallbackImg} alt={country.name} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 text-white">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/70 font-bold">Multi-entry</div>
            <div className="text-[18px] font-bold mt-1">
              {cat.multi_entry ? 'Yes — re-enter as needed' : 'Single entry'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaCard({ Icon, k, v }) {
  return (
    <div className="rounded-2xl bg-white border border-black/5 p-4">
      <Icon className="w-4 h-4 text-[hsl(var(--blue-700))]" />
      <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--blue-900))]/55 font-bold">{k}</div>
      <div className="mt-1 text-[14px] font-bold text-[hsl(var(--blue-900))]">{v}</div>
    </div>
  );
}

function DocsList({ docs }) {
  return (
    <ul className="mt-6 space-y-3">
      {docs.map((d, i) => (
        <li
          key={`${d}-${i}`}
          className="flex items-start gap-3 rounded-xl bg-[hsl(var(--soft-bg))] border border-black/5 p-4"
        >
          <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))]">
            <Check className="w-3.5 h-3.5" />
          </span>
          <span className="text-[14.5px] text-[hsl(var(--blue-900))]/85">{d}</span>
        </li>
      ))}
    </ul>
  );
}

function AssistCard() {
  const rows = [
    { id: 'a1', icon: FileText, l: 'Passport scan', s: 'Verified' },
    { id: 'a2', icon: ShieldCheck, l: 'Bank statement', s: 'AES-256' },
    { id: 'a3', icon: Star, l: 'Approval probability', s: '94%' },
  ];
  return (
    <div className="rounded-3xl bg-[hsl(var(--soft-bg))] border border-black/5 p-7 sticky top-28">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] font-bold text-[hsl(var(--accent))]">
        <Sparkles className="w-3.5 h-3.5" /> Document AI
      </div>
      <h3 className="mt-2 font-display font-extrabold text-[22px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
        Snap. Upload. Done.
      </h3>
      <p className="mt-2 text-[14px] leading-relaxed text-[hsl(var(--blue-900))]/65">
        Auto-detects rotation, glare and missing pages. You get a green check or
        a one-line fix — never a vague rejection.
      </p>
      <div className="mt-5 space-y-3">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-white border border-black/5 p-3">
              <span className="h-9 w-9 rounded-lg bg-[hsl(var(--blue-50))] inline-flex items-center justify-center text-[hsl(var(--blue-700))]">
                <Icon className="w-4 h-4" />
              </span>
              <div className="flex-1">
                <div className="text-[13.5px] font-bold text-[hsl(var(--blue-900))]">{r.l}</div>
                <div className="text-[12px] text-[hsl(var(--blue-900))]/55">{r.s}</div>
              </div>
              <Check className="w-4 h-4 text-emerald-600" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FaqSection({ countryName }) {
  return (
    <section className="py-20 bg-[hsl(var(--soft-bg))] border-y border-black/5">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
          Common questions about {countryName}
        </h2>
        <div className="mt-8 divide-y divide-black/8 border-y border-black/8">
          {FAQS.slice(0, 4).map((f) => (
            <details key={f.id} className="py-5 group">
              <summary className="cursor-pointer list-none flex items-start justify-between gap-4 text-[16px] font-bold text-[hsl(var(--blue-900))]">
                {f.q}
                <ChevronRight className="w-4 h-4 text-[hsl(var(--blue-900))]/40 group-open:rotate-90 transition" />
              </summary>
              <p className="mt-2 text-[14.5px] text-[hsl(var(--blue-900))]/65 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function OtherCountries({ list }) {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))] mb-8">
          Other destinations travelers love
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {list.map((c) => (
            <Link key={c.id} to={`/visa/${c.id}`} className="group block">
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
                <img
                  src={c.image}
                  alt={c.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <div className="text-[18px] font-display font-extrabold tracking-[-0.02em]">{c.name}</div>
                  <div className="text-[12px] text-white/70 font-semibold">${c.fees_usd ?? c.fees}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function VisaDetail() {
  const { id } = useParams();
  const { token, isAuthed, openAuth } = useAuth();
  const { toast } = useToast();
  const [country, setCountry] = useState(null);
  const [type, setType] = useState('Tourist');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let mounted = true;
    axios
      .get(`${API}/countries/${id}`)
      .then((r) => {
        if (!mounted) return;
        setCountry(r.data);
        const types = Object.keys(r.data.categories || {});
        if (types.length) setType(types[0]);
      })
      .catch(() => mounted && setCountry(null));
    return () => {
      mounted = false;
    };
  }, [id]);

  if (!country) {
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

  const cat = country.categories?.[type];
  const others = COUNTRIES.filter((c) => c.id !== country.id).slice(0, 4);

  const onApply = async () => {
    if (!isAuthed) {
      openAuth('signup');
      return;
    }
    setApplying(true);
    try {
      await axios.post(
        `${API}/users/me/applications`,
        { country_id: country.id, visa_type: type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: 'Application started', description: `${country.name} ${type} draft saved.` });
    } catch {
      toast({ title: 'Could not start application' });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="bg-white">
      <Navbar />

      <section className="relative pt-28 bg-[hsl(var(--soft-bg))] border-b border-black/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pb-16">
          <Breadcrumb countryName={country.name} />
          <div className="mt-8 flex justify-start">
            <CategoryTabs categories={country.categories} value={type} onChange={setType} />
          </div>
          <div className="mt-8">
            {cat && <CategoryDetails cat={cat} country={country} onApply={onApply} applying={applying} />}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
              <FileText className="w-3.5 h-3.5" /> Required for {type}
            </div>
            <h2 className="mt-2 font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
              Documents you will need
            </h2>
            {cat && <DocsList docs={cat.documents} />}
            <div className="mt-8">
              <Button
                onClick={onApply}
                disabled={applying}
                className="rounded-full btn-accent text-white h-12 px-6 font-bold"
              >
                Begin {type.toLowerCase()} application
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
          <aside className="lg:col-span-5">
            <AssistCard />
          </aside>
        </div>
      </section>

      <FaqSection countryName={country.name} />
      <OtherCountries list={others} />
      <Footer />
    </div>
  );
}

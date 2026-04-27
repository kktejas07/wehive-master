import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import {
  Check,
  Clock,
  ShieldCheck,
  ChevronRight,
  Calendar,
  CreditCard,
  FileText,
  Sparkles,
  Star,
} from 'lucide-react';
import { COUNTRIES, FAQS } from '../data/mock';

export default function VisaDetail() {
  const { id } = useParams();
  const country = COUNTRIES.find((c) => c.id === id) || COUNTRIES[0];
  const others = COUNTRIES.filter((c) => c.id !== country.id).slice(0, 4);

  return (
    <div className="bg-[hsl(var(--cream))]">
      <Navbar />

      {/* Hero with imagery */}
      <section className="relative pt-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[13px] text-[hsl(var(--navy-900))]/55">
            <Link to="/" className="hover:text-[hsl(var(--navy-900))]">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/" className="hover:text-[hsl(var(--navy-900))]">Visas</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[hsl(var(--navy-900))] font-medium">{country.name}</span>
          </div>

          <div className="mt-8 grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-white border border-black/5 px-3 py-1.5 text-[12px] font-medium text-[hsl(var(--navy-900))]/70">
                <span className="text-base leading-none">{country.flag}</span>
                {country.type} · Valid {country.valid}
              </div>
              <h1 className="mt-4 text-[42px] sm:text-[64px] leading-[1.02] font-semibold tracking-tight text-[hsl(var(--navy-900))]">
                {country.name}{' '}
                <span className="font-serif-display italic font-normal text-[hsl(var(--navy-700))]">visa.</span>
              </h1>
              <p className="mt-5 text-[17px] leading-relaxed text-[hsl(var(--navy-900))]/65 max-w-xl">
                Apply in 12 minutes. Approved in {country.processing}. Backed by
                Wehive&rsquo;s on‑time guarantee — we refund you if we are
                even a day late.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button className="rounded-full btn-navy text-white h-12 px-6">
                  Start · {country.fees}
                </Button>
                <Button variant="ghost" className="rounded-full h-12 px-5 text-[hsl(var(--navy-900))]">
                  Download checklist
                </Button>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
                {[
                  { icon: Clock, k: 'Processing', v: country.processing },
                  { icon: Calendar, k: 'Valid', v: country.valid },
                  { icon: CreditCard, k: 'Govt. fee', v: country.fees },
                ].map((m) => (
                  <div key={m.k} className="rounded-2xl bg-white border border-black/5 p-4">
                    <m.icon className="w-4 h-4 text-[hsl(var(--navy-700))]" />
                    <div className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[hsl(var(--navy-900))]/55 font-semibold">
                      {m.k}
                    </div>
                    <div className="mt-1 text-[14px] font-semibold text-[hsl(var(--navy-900))]">
                      {m.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden aspect-[4/5] shadow-[0_30px_70px_-30px_rgba(15,42,95,0.45)]">
                <img src={country.image} alt={country.name} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <div className="text-[12px] uppercase tracking-[0.14em] text-white/70 font-semibold">
                    Guaranteed visa on
                  </div>
                  <div className="text-[20px] font-semibold mt-1">{country.eta}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements + steps */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <h2 className="text-[28px] font-semibold tracking-tight text-[hsl(var(--navy-900))]">
              Documents you will need
            </h2>
            <ul className="mt-6 space-y-3">
              {[
                'Passport with at least 6 months validity',
                'Recent passport‑size photo (white background)',
                'Bank statements from the last 3 months',
                'Confirmed flight & hotel reservation',
                'Travel insurance with minimum coverage',
                'Cover letter explaining purpose of visit',
              ].map((d) => (
                <li key={d} className="flex items-start gap-3 rounded-xl bg-white border border-black/5 p-4">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--navy-50))] text-[hsl(var(--navy-700))]">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[14.5px] text-[hsl(var(--navy-900))]/85">{d}</span>
                </li>
              ))}
            </ul>
          </div>
          <aside className="lg:col-span-5">
            <div className="rounded-3xl bg-white border border-black/5 p-7 sticky top-28">
              <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--accent))]">
                <Sparkles className="w-3.5 h-3.5" /> AI assist
              </div>
              <h3 className="mt-2 text-[22px] font-semibold tracking-tight text-[hsl(var(--navy-900))]">
                Snap. Upload. Done.
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[hsl(var(--navy-900))]/65">
                Our AI auto‑detects rotation, glare, and missing pages. You
                get a green check or a one‑line fix — never a vague rejection.
              </p>
              <div className="mt-5 space-y-3">
                {[
                  { icon: FileText, l: 'Passport scan', s: 'Verified' },
                  { icon: ShieldCheck, l: 'Bank statement', s: 'AES‑256' },
                  { icon: Star, l: 'Approval probability', s: '94%' },
                ].map((r) => (
                  <div key={r.l} className="flex items-center gap-3 rounded-xl bg-[hsl(var(--cream))] p-3">
                    <span className="h-9 w-9 rounded-lg bg-white border border-black/5 inline-flex items-center justify-center text-[hsl(var(--navy-700))]">
                      <r.icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1">
                      <div className="text-[13.5px] font-semibold text-[hsl(var(--navy-900))]">{r.l}</div>
                      <div className="text-[12px] text-[hsl(var(--navy-900))]/55">{r.s}</div>
                    </div>
                    <Check className="w-4 h-4 text-emerald-600" />
                  </div>
                ))}
              </div>
              <Button className="mt-6 w-full rounded-full btn-navy text-white h-12">Begin application</Button>
            </div>
          </aside>
        </div>
      </section>

      {/* FAQ subset */}
      <section className="py-20 bg-white border-y border-black/5">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <h2 className="text-[28px] font-semibold tracking-tight text-[hsl(var(--navy-900))]">
            Common questions about {country.name}
          </h2>
          <div className="mt-8 divide-y divide-black/8 border-y border-black/8">
            {FAQS.slice(0, 4).map((f, i) => (
              <details key={i} className="py-5 group">
                <summary className="cursor-pointer list-none flex items-start justify-between gap-4 text-[16px] font-semibold text-[hsl(var(--navy-900))]">
                  {f.q}
                  <ChevronRight className="w-4 h-4 text-[hsl(var(--navy-900))]/40 group-open:rotate-90 transition" />
                </summary>
                <p className="mt-2 text-[14.5px] text-[hsl(var(--navy-900))]/65 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Other countries */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <h2 className="text-[28px] font-semibold tracking-tight text-[hsl(var(--navy-900))] mb-8">
            Other destinations travelers love
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {others.map((c) => (
              <Link key={c.id} to={`/visa/${c.id}`} className="group block">
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
                  <img src={c.image} alt={c.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <div className="text-[18px] font-serif-display">{c.name}</div>
                    <div className="text-[12px] text-white/70">{c.type} · {c.fees}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

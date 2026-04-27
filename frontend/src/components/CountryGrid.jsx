import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Grid2X2, Map as MapIcon, Sparkle } from 'lucide-react';
import { COUNTRIES } from '../data/mock';

function CountryCard({ c }) {
  return (
    <Link to={`/visa/${c.id}`} className="group block card-lift">
      <article className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[hsl(var(--blue-900))]">
        <img
          src={c.image}
          alt={c.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Flag */}
        <div className="absolute bottom-[42%] left-1/2 -translate-x-1/2 h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-white/95 ring-2 ring-white/40 backdrop-blur flex items-center justify-center text-[22px] sm:text-[26px] leading-none shadow-lg">
          <span>{c.flag}</span>
        </div>

        {/* Name */}
        <div className="absolute left-0 right-0 bottom-0 p-3 sm:p-4 text-white">
          <div className="text-center text-[15px] sm:text-[20px] lg:text-[22px] font-display font-extrabold tracking-tight uppercase truncate">
            {c.name}
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-1 text-[9px] sm:text-[10px] uppercase tracking-[0.1em] text-white/65 font-bold border-t border-white/15 pt-2.5">
            <div>
              <div>Type</div>
              <div className="text-white text-[10.5px] sm:text-[12px] font-bold mt-0.5 truncate">{c.type}</div>
            </div>
            <div className="text-center">
              <div>Valid</div>
              <div className="text-white text-[10.5px] sm:text-[12px] font-bold mt-0.5 truncate">{c.valid}</div>
            </div>
            <div className="text-right">
              <div>Fees</div>
              <div className="text-white text-[10.5px] sm:text-[12px] font-bold mt-0.5 truncate">{c.fees}</div>
            </div>
          </div>
        </div>
      </article>
      <div className="mt-3 px-1">
        <div className="text-[12px] text-[hsl(var(--blue-900))]/55">Guaranteed visa on</div>
        <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{c.eta}</div>
      </div>
    </Link>
  );
}

function Grid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {COUNTRIES.map((c) => (
        <CountryCard key={c.id} c={c} />
      ))}
    </div>
  );
}

function MapPlaceholder() {
  return (
    <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-black/5 bg-[hsl(var(--blue-50))]">
      <img
        src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1600&q=80"
        alt="World map"
        className="absolute inset-0 h-full w-full object-cover opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-[hsl(var(--blue-900))]/30 to-transparent" />
      <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-center gap-2">
        {COUNTRIES.slice(0, 8).map((c) => (
          <Link
            key={c.id}
            to={`/visa/${c.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-[12.5px] font-bold text-[hsl(var(--blue-900))] hover:bg-white shadow-sm"
          >
            <span>{c.flag}</span>
            <span>{c.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function CountryGrid() {
  const [view, setView] = useState('grid');
  return (
    <section id="countries" className="relative py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
              <Sparkle className="w-3.5 h-3.5" />
              Popular destinations
            </div>
            <h2 className="mt-3 text-[34px] sm:text-[48px] leading-[1.02] font-display font-extrabold tracking-[-0.03em] text-[hsl(var(--blue-900))]">
              A world of visas,{' '}
              <span className="text-[hsl(var(--accent))]">in one place.</span>
            </h2>
            <p className="mt-3 text-[15.5px] text-[hsl(var(--blue-900))]/65 max-w-xl">
              Real ETA. Real fees. No hidden charges. Tap a country to see
              everything you need before you apply.
            </p>
          </div>

          <div className="inline-flex items-center rounded-full bg-white border border-black/10 p-1">
            <button
              onClick={() => setView('grid')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition ${
                view === 'grid'
                  ? 'bg-[hsl(var(--blue-700))] text-white'
                  : 'text-[hsl(var(--blue-900))]/65 hover:text-[hsl(var(--blue-900))]'
              }`}
            >
              <Grid2X2 className="w-3.5 h-3.5" /> Grid
            </button>
            <button
              onClick={() => setView('map')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition ${
                view === 'map'
                  ? 'bg-[hsl(var(--blue-700))] text-white'
                  : 'text-[hsl(var(--blue-900))]/65 hover:text-[hsl(var(--blue-900))]'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Map
            </button>
          </div>
        </div>

        {view === 'grid' ? <Grid /> : <MapPlaceholder />}
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Search, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { API } from '../context/AuthContext';

function useDebounced(value, delay = 220) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function HeroSearchLive({ query, setQuery }) {
  const navigate = useNavigate();
  const debounced = useDebounced(query, 220);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const boxRef = useRef(null);

  const q = debounced.trim();

  useEffect(() => {
    let ignore = false;
    if (!q) { setResults([]); return; }
    setLoading(true);
    axios
      .get(`${API}/countries`, { params: { q, limit: 8 } })
      .then((r) => { if (!ignore) { setResults(r.data || []); setActive(0); } })
      .catch(() => { if (!ignore) setResults([]); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [q]);

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const go = (c) => {
    if (!c) return;
    setOpen(false);
    navigate(c.no_visa ? `/holiday/${c.id}` : `/visa/${c.id}`);
  };

  const onSubmit = () => {
    if (results.length > 0) go(results[active]);
  };

  const onKey = (e) => {
    if (!open || results.length === 0) {
      if (e.key === 'Enter') onSubmit();
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const showPopover = open && q.length > 0;

  return (
    <div ref={boxRef} className="relative" data-testid="hero-search-wrap">
      <div className="relative rounded-full bg-white border border-black/5 shadow-[0_24px_60px_-30px_rgba(10,44,138,0.45)] p-1.5 flex items-center gap-1.5">
        <div className="flex-1 flex items-center gap-3 pl-5">
          <Search className="w-4 h-4 text-[hsl(var(--blue-900))]/45" />
          <input
            ref={inputRef}
            data-testid="hero-search-input"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKey}
            placeholder="Search a country — try USA, UK, Canada…"
            className="w-full bg-transparent border-0 outline-none focus:outline-none placeholder:text-[hsl(var(--blue-900))]/40 text-[15px] py-3 text-[hsl(var(--blue-900))]"
            autoComplete="off"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--blue-900))]/30" />}
        </div>
        <Button
          onClick={onSubmit}
          data-testid="hero-search-submit"
          className="rounded-full btn-accent text-white h-12 px-5 shadow-sm font-bold"
        >
          Find my visa
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {showPopover && (
        <div
          data-testid="hero-search-popover"
          className="absolute left-0 right-0 mt-2 rounded-2xl bg-white border border-black/8 shadow-[0_30px_70px_-30px_rgba(10,44,138,0.45)] overflow-hidden z-40"
        >
          {results.length === 0 && !loading && (
            <div className="px-5 py-6 text-center text-[13.5px] text-[hsl(var(--blue-900))]/55">
              No matches for "{q}". Try a different spelling.
            </div>
          )}
          <ul className="max-h-[320px] overflow-y-auto">
            {results.map((c, i) => (
              <li
                key={c.id}
                data-testid={`hero-search-result-${c.id}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); go(c); }}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer ${
                  i === active ? 'bg-[hsl(var(--soft-bg))]' : ''
                }`}
              >
                <span className="text-xl leading-none">{c.flag || '🌐'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-[hsl(var(--blue-900))] truncate">
                    {c.name}
                  </div>
                  <div className="text-[11.5px] text-[hsl(var(--blue-900))]/55">
                    {c.no_visa
                      ? 'Visa-free for Indians'
                      : (c.visa_types || []).slice(0, 3).join(' · ') || 'Visa required'}
                  </div>
                </div>
                <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/40">
                  {c.iso2 || c.id?.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
          <div className="px-4 py-2 text-[11px] text-[hsl(var(--blue-900))]/45 border-t border-black/5 flex items-center justify-between">
            <span>↑↓ to navigate · Enter to open</span>
            <span>Powered by 250+ destinations</span>
          </div>
        </div>
      )}
    </div>
  );
}

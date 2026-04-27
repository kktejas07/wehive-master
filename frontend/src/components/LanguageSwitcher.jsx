import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

export default function LanguageSwitcher() {
  const { lang, setLang, languages } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const cur = languages.find((l) => l.code === lang) || languages[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-bold text-[hsl(var(--blue-900))]/70 hover:text-[hsl(var(--blue-700))] rounded-full hover:bg-[hsl(var(--blue-50))] transition-colors"
        aria-label="Change language"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="uppercase">{cur.code}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-2xl backdrop-blur-xl bg-white/85 border border-white/40 shadow-[0_20px_50px_-25px_rgba(10,44,138,0.4)] p-1 z-50">
          {languages.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[14px] transition ${
                  active
                    ? 'bg-[hsl(var(--blue-700))] text-white font-bold'
                    : 'text-[hsl(var(--blue-900))] hover:bg-[hsl(var(--blue-50))]'
                }`}
              >
                <span>{l.native}</span>
                <span className={`text-[11px] uppercase tracking-wide ${active ? 'text-white/70' : 'text-[hsl(var(--blue-900))]/45'}`}>
                  {l.code}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

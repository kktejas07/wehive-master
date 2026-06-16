import { useState, useEffect } from 'react';
import { Globe, ChevronDown, Check, Loader2 } from 'lucide-react';
import axios from 'axios';
import { API } from '../context/AuthContext';

const LANGS = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'de', label: 'German', native: 'Deutsch' },
  { code: 'it', label: 'Italian', native: 'Italiano' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'zh', label: 'Chinese', native: '中文' },
  { code: 'ja', label: 'Japanese', native: '日本語' },
  { code: 'ko', label: 'Korean', native: '한국어' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
  { code: 'ru', label: 'Russian', native: 'Русский' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe' },
];

export default function LanguageSwitcher({ universityId, fields, onTranslated }) {
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState(localStorage.getItem('uni_locale') || '');
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!locale || !universityId) {
      onTranslated?.(null);
      return;
    }
    setLoading(true);
    axios.get(`${API}/i18n/universities/${universityId}`, { params: { locale } })
      .then(r => {
        const t = r.data?.fields || {};
        setTranslations(t);
        onTranslated?.(t);
      })
      .catch(() => { setTranslations({}); onTranslated?.(null); })
      .finally(() => setLoading(false));
  }, [locale, universityId]);

  const current = LANGS.find(l => l.code === locale);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-[12px] font-bold transition">
        <Globe className="w-3.5 h-3.5" />
        {current ? current.native : 'English'}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl bg-white border border-black/10 shadow-2xl max-h-64 overflow-y-auto" onMouseLeave={() => setOpen(false)}>
          {LANGS.map(l => (
            <button key={l.code} onClick={() => { setLocale(l.code); localStorage.setItem('uni_locale', l.code); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-bold text-left transition hover:bg-[hsl(var(--blue-50))] ${
                locale === l.code ? 'text-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))]' : 'text-[hsl(var(--blue-900))]'
              }`}>
              <span className="w-5 text-center text-[14px]">{locale === l.code ? <Check className="w-4 h-4 mx-auto" /> : ''}</span>
              <span>{l.native}</span>
              <span className="ml-auto text-[10px] text-slate-400">{l.code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}

      {loading && <Loader2 className="w-3 h-3 animate-spin text-white/60 ml-1 inline" />}
    </div>
  );
}

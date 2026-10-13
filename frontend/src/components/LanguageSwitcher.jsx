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

export default function LanguageSwitcher({ universityId, fields, onTranslated, tone = 'dark' }) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- parent callback; re-translate only when locale/university change
  }, [locale, universityId]);

  const current = LANGS.find(l => l.code === locale);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        aria-expanded={open} aria-haspopup="listbox" aria-label={`Language: ${current ? current.native : 'English'}`}
        className={tone === 'nav'
          ? 'inline-flex items-center gap-1.5 h-10 rounded-full border border-[hsl(var(--border))] bg-white hover:bg-[hsl(var(--blue-50))] hover:border-[hsl(var(--blue-200))] text-[hsl(var(--blue-900))] px-3 text-[13px] font-semibold transition-colors duration-200'
          : 'inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-[12px] font-bold transition'}>
        <Globe className="w-3.5 h-3.5" aria-hidden="true" />
        {current ? current.native : 'English'}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl bg-white border border-[hsl(var(--border))] shadow-lg max-h-64 overflow-y-auto" onMouseLeave={() => setOpen(false)}>
          {LANGS.map(l => (
            <button key={l.code} onClick={() => { setLocale(l.code); localStorage.setItem('uni_locale', l.code); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium text-left transition-colors hover:bg-[hsl(var(--blue-50))] ${
                locale === l.code ? 'text-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))]' : 'text-[hsl(var(--blue-900))]'
              }`}>
              <span className="w-5 text-center text-[14px]">{locale === l.code ? <Check className="w-4 h-4 mx-auto" /> : ''}</span>
              <span>{l.native}</span>
              <span className="ml-auto text-[12px] text-muted-foreground">{l.code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}

      {loading && <Loader2 className={`w-3 h-3 animate-spin ml-1 inline ${tone === 'nav' ? 'text-[hsl(var(--blue-700))]' : 'text-white/60'}`} />}
    </div>
  );
}

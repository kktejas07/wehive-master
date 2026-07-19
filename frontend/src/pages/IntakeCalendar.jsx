import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Globe, Clock, ChevronDown, ChevronUp, Info, Loader2, RefreshCw, Sparkles, GraduationCap, X } from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API } from '../context/AuthContext';

const FALLBACK_INTAKES = [
  {
    country: 'Canada',
    flag: '🇨🇦',
    color: '#ef4444',
    tracks: {
      "Engineering & Masters": [
        { name: 'Winter / January', months: 'Jan–Apr', apply_start: 'Sep', apply_end: 'Nov', popular: false },
        { name: 'Fall / September', months: 'Sep–Dec', apply_start: 'Jan', apply_end: 'Jun', popular: true },
      ],
      MBA: [
        { name: 'Round 1 (Fall)', months: 'Sep', apply_start: 'Sep (prev yr)', apply_end: 'Oct (prev yr)', popular: true },
      ],
      MBBS: [
        { name: 'Medicine (Fall)', months: 'Sep', apply_start: 'Jul (prev yr)', apply_end: 'Oct (prev yr)', popular: true },
      ]
    },
    notes: 'Fall is the primary intake. Most universities open applications 6–9 months in advance.',
  },
  {
    country: 'United Kingdom',
    flag: '🇬🇧',
    color: '#3b82f6',
    tracks: {
      "Engineering & Masters": [
        { name: 'September / October', months: 'Sep–Dec', apply_start: 'Oct (prev yr)', apply_end: 'Jun', popular: true },
      ],
      MBA: [
        { name: 'Round 1', months: 'Sep', apply_start: 'Sep (prev yr)', apply_end: 'Nov (prev yr)', popular: true },
      ],
      MBBS: [
        { name: 'UCAT Deadline', months: 'Sep', apply_start: 'Sep (prev yr)', apply_end: 'Oct 15 (prev yr)', popular: true },
      ]
    },
    notes: 'Apply via UCAS for undergraduate. Postgraduate applications go directly to universities.',
  },
  {
    country: 'USA',
    flag: '🇺🇸',
    color: '#0ea5e9',
    tracks: {
      "Engineering & Masters": [
        { name: 'Fall Intake', months: 'Aug-Dec', apply_start: 'Nov', apply_end: 'Jan', popular: true },
        { name: 'Spring Intake', months: 'Jan-May', apply_start: 'Jun', apply_end: 'Aug', popular: false },
      ],
      MBA: [
        { name: 'Round 1', months: 'Sep', apply_start: 'Sep', apply_end: 'Oct', popular: true },
        { name: 'Round 2', months: 'Jan', apply_start: 'Jan', apply_end: 'Feb', popular: true },
      ],
      MBBS: [
        { name: 'Pre-Med / MD', months: 'Aug', apply_start: 'May', apply_end: 'Oct', popular: true },
      ]
    },
    notes: 'Most major universities prioritize the Fall intake for scholarships.',
  },
  {
    country: 'Australia',
    flag: '🇦🇺',
    color: '#eab308',
    tracks: {
      "Engineering & Masters": [
        { name: 'Semester 1', months: 'Feb-Jun', apply_start: 'Sep', apply_end: 'Dec', popular: true },
        { name: 'Semester 2', months: 'Jul-Nov', apply_start: 'Mar', apply_end: 'May', popular: false },
      ],
      MBA: [
        { name: 'Term 1', months: 'Feb', apply_start: 'Oct', apply_end: 'Nov', popular: true },
      ],
      MBBS: [
        { name: 'Medicine Intake', months: 'Jan', apply_start: 'Mar', apply_end: 'Jun', popular: true },
      ]
    },
    notes: 'Semester 1 in February is the primary intake for Australia.',
  },
  {
    country: 'New Zealand',
    flag: '🇳🇿',
    color: '#14b8a6',
    tracks: {
      "Engineering & Masters": [
        { name: 'Semester 1', months: 'Feb-Jun', apply_start: 'Oct', apply_end: 'Dec', popular: true },
      ],
      MBA: [
        { name: 'Quarter 1', months: 'Feb', apply_start: 'Nov', apply_end: 'Jan', popular: true },
      ],
      MBBS: [
        { name: 'Pre-Med Intake', months: 'Feb', apply_start: 'Aug', apply_end: 'Nov', popular: true },
      ]
    },
    notes: 'Intakes largely mirror Australia due to the southern hemisphere calendar.',
  }
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function MonthBar({ applyStart, applyEnd, months, color }) {
  const startIdx = MONTHS.findIndex(m => applyStart?.startsWith(m));
  const endIdx = MONTHS.findIndex(m => applyEnd?.startsWith(m));

  return (
    <div className="mt-2">
      <div className="text-[10px] text-[hsl(var(--blue-900))]/50 font-bold uppercase tracking-[0.12em] mb-1">Application window</div>
      <div className="grid grid-cols-12 gap-0.5">
        {MONTHS.map((m, i) => {
          const inWindow = startIdx !== -1 && endIdx !== -1
            ? (startIdx <= endIdx ? i >= startIdx && i <= endIdx : i >= startIdx || i <= endIdx)
            : false;
          return (
            <div key={m} title={m}
              className={`h-4 rounded-sm text-[7px] flex items-center justify-center font-bold transition-colors ${inWindow ? 'text-white' : 'bg-black/5 text-[hsl(var(--blue-900))]/50'}`}
              style={inWindow ? { background: color } : {}}>
              {m[0]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CountryCard({ data, activeTrack, setInsightsUni }) {
  const [open, setOpen] = useState(false);
  const [unis, setUnis] = useState([]);
  const [loadingUnis, setLoadingUnis] = useState(false);
  const panelId = `intake-panel-${data.country.replace(/\s+/g, '-').toLowerCase()}`;
  
  const intakes = data.tracks && data.tracks[activeTrack] ? data.tracks[activeTrack] : [];

  useEffect(() => {
    if (open && unis.length === 0) {
      setLoadingUnis(true);
      axios.get(`${API}/intakes/recommendations?country=${data.country}&track=${activeTrack}`)
        .then(res => setUnis(res.data.universities || []))
        .catch(err => console.error("Failed to load recommendations", err))
        .finally(() => setLoadingUnis(false));
    }
  }, [open, activeTrack, data.country, unis.length]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className="rounded-2xl bg-white border border-black/5 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-black/[0.02] transition text-left">
        <span className="text-3xl shrink-0">{data.flag || <Globe className="w-7 h-7 text-[hsl(var(--blue-900))]/40" />}</span>
        <div className="flex-1">
          <div className="font-bold text-[16px] text-[hsl(var(--blue-900))]">{data.country}</div>
          <div className="text-[12px] text-[hsl(var(--blue-900))]/55 mt-0.5">
            {intakes.length} {activeTrack} intake{intakes.length !== 1 ? 's' : ''} 
            {intakes.length > 0 && ` · ${intakes.filter(i => i.popular).map(i => i.name).join(', ') || 'see details'}`}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold rounded-full px-2.5 py-0.5" style={{ background: `${data.color || '#3b82f6'}15`, color: data.color || '#3b82f6' }}>
            {intakes.filter(i => i.popular).length > 0 ? 'Active intakes' : (intakes.length > 0 ? 'Annual' : 'No Data')}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-[hsl(var(--blue-900))]/40" /> : <ChevronDown className="w-4 h-4 text-[hsl(var(--blue-900))]/40" />}
        </div>
      </button>

      {open && (
        <div id={panelId} className="border-t border-black/5 px-5 py-4 space-y-4">
          {intakes.length === 0 ? (
            <div className="text-sm text-slate-500 py-2">No {activeTrack} data available for this country.</div>
          ) : intakes.map((intake, i) => (
            <div key={i} className="rounded-xl bg-[hsl(var(--soft-bg))] p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[14px] text-[hsl(var(--blue-900))]">{intake.name}</span>
                {intake.popular && (
                  <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700">Most popular</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-[12.5px]">
                <div><span className="text-[hsl(var(--blue-900))]/50 font-bold">Classes:</span> <span className="text-[hsl(var(--blue-900))]/80">{intake.months}</span></div>
                <div><span className="text-[hsl(var(--blue-900))]/50 font-bold">Apply from:</span> <span className="text-[hsl(var(--blue-900))]/80">{intake.apply_start}</span></div>
                <div><span className="text-[hsl(var(--blue-900))]/50 font-bold">Deadline:</span> <span className="text-[hsl(var(--blue-900))]/80">{intake.apply_end}</span></div>
              </div>
              <MonthBar applyStart={intake.apply_start} applyEnd={intake.apply_end} months={intake.months} color={data.color || '#3b82f6'} />
            </div>
          ))}

          {/* AI University Recommendations */}
          <div className="pt-4 border-t border-black/5 mt-4">
            <h4 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--blue-900))]/50 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Top {activeTrack} Universities in {data.country}
            </h4>
            {loadingUnis ? (
              <div className="flex items-center gap-2 text-[13px] text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Finding recommendations...</div>
            ) : unis.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {unis.map((u, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setInsightsUni({ name: u.name || u, country: data.country, track: activeTrack })}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white border border-black/5 shadow-sm hover:shadow-md hover:border-black/10 transition text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--soft-bg))] flex items-center justify-center shrink-0 overflow-hidden">
                      {u.logo ? <img src={u.logo} alt={u.name} className="w-full h-full object-cover" /> : <GraduationCap className="w-5 h-5 text-[hsl(var(--blue-900))]/30" />}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-[hsl(var(--blue-900))] truncate">{u.name || u}</div>
                      <div className="text-[11px] text-[hsl(var(--blue-900))]/50 flex items-center gap-1 mt-0.5">
                        <Sparkles className="w-3 h-3 text-emerald-500" /> Click for AI Insights
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-slate-400">No specific recommendations found. Ask Hive for more options!</div>
            )}
          </div>
          
          {data.notes && (
            <div className="flex items-start gap-2.5 rounded-xl bg-[hsl(var(--soft-bg))] px-4 py-3 mt-4">
              <Info className="w-4 h-4 text-[hsl(var(--blue-900))]/40 mt-0.5 shrink-0" />
              <p className="text-[13px] text-[hsl(var(--blue-900))]/70 leading-relaxed">{data.notes}</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function InsightsModal({ uni, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/intakes/insights?university=${uni.name}&country=${uni.country}&track=${uni.track}`)
      .then(res => setData(res.data))
      .catch(err => console.error("Failed to load insights", err))
      .finally(() => setLoading(false));
  }, [uni]);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          
          <div className="flex items-center justify-between p-5 border-b border-black/5 bg-[hsl(var(--soft-bg))]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-bold text-[16px] text-[hsl(var(--blue-900))]">{uni.name}</h3>
                <p className="text-[12px] text-[hsl(var(--blue-900))]/60">{uni.track} Admissions in {uni.country}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 text-slate-500 transition"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-6 overflow-y-auto">
            {loading ? (
              <div className="space-y-6 animate-pulse">
                <div>
                  <div className="h-3 w-24 bg-black/10 rounded-full mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-black/5 rounded w-full"></div>
                    <div className="h-4 bg-black/5 rounded w-5/6"></div>
                    <div className="h-4 bg-black/5 rounded w-4/6"></div>
                  </div>
                </div>
                <div>
                  <div className="h-3 w-16 bg-black/10 rounded-full mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-10 bg-black/5 rounded-xl w-full"></div>
                    <div className="h-10 bg-black/5 rounded-xl w-full"></div>
                  </div>
                </div>
              </div>
            ) : data ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--blue-900))]/50 mb-3">AI Insights</h4>
                  <ul className="space-y-2">
                    {data.insights?.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-[14px] text-[hsl(var(--blue-900))]/80 leading-relaxed">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--blue-900))]/50 mb-3">Frequently Asked Questions</h4>
                  <div className="space-y-3">
                    {data.faqs?.map((faq, idx) => (
                      <div key={idx} className="bg-[hsl(var(--soft-bg))] p-4 rounded-xl border border-black/5">
                        <div className="font-bold text-[13.5px] text-[hsl(var(--blue-900))] mb-1">Q: {faq.q}</div>
                        <div className="text-[13px] text-[hsl(var(--blue-900))]/70 leading-relaxed">A: {faq.a}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm">Failed to generate insights. Please try again.</div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function IntakeCalendar() {
  const now = new Date();
  const currentMonth = MONTHS[now.getMonth()];
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(now.getMonth() + 6);
  const endMonth = MONTHS[sixMonthsLater.getMonth()];
  
  const [activeTrack, setActiveTrack] = useState('Engineering & Masters');
  const [data, setData] = useState(FALLBACK_INTAKES);
  const [loading, setLoading] = useState(true);
  const [insightsUni, setInsightsUni] = useState(null);

  useEffect(() => {
    axios.get(`${API}/intakes/calendar`)
      .then(r => {
        if (r.data?.intakes?.length > 0) {
          setData(r.data.intakes);
        }
      })
      .catch(err => console.error("Failed to load real-time intakes, using fallback.", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white text-[hsl(var(--blue-900))]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-5 pt-28 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-[hsl(var(--accent))] flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Live Intake Guide
            </div>
            {loading ? (
              <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing...
              </div>
            ) : (
              <div className="text-[11px] font-bold text-emerald-500 flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded-full">
                <RefreshCw className="w-3 h-3" /> Live Synced
              </div>
            )}
          </div>
          
          <h1 className="font-display font-extrabold text-[38px] sm:text-[52px] tracking-[-0.03em] text-[hsl(var(--blue-900))] leading-[1.05]">
            Global Intake<br />Calendar
          </h1>
          <p className="mt-4 text-[16px] text-[hsl(var(--blue-900))]/60 max-w-xl">
            Real-time tracking of application windows, with AI-powered university insights tailored for your track.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--soft-bg))] border border-black/5 px-4 py-2 text-[12.5px] text-[hsl(var(--blue-900))]/70">
            <Clock className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
            Forecast window: <strong className="text-[hsl(var(--blue-900))]">{currentMonth} {now.getFullYear()} – {endMonth} {sixMonthsLater.getFullYear()}</strong>
          </div>
        </motion.div>

        {/* Track Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {['Engineering & Masters', 'MBA', 'MBBS'].map(track => (
            <button
              key={track}
              onClick={() => setActiveTrack(track)}
              className={`px-5 py-2.5 rounded-full text-[13.5px] font-bold whitespace-nowrap transition-all ${
                activeTrack === track 
                  ? 'bg-[hsl(var(--blue-900))] text-white shadow-md' 
                  : 'bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))]/60 hover:bg-black/5 hover:text-[hsl(var(--blue-900))]'
              }`}
            >
              {track} Intakes
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {data.map((d, i) => (
            <CountryCard 
              key={d.country || i} 
              data={d} 
              activeTrack={activeTrack} 
              setInsightsUni={setInsightsUni} 
            />
          ))}
        </div>
      </div>
      <Footer />
      
      {insightsUni && (
        <InsightsModal uni={insightsUni} onClose={() => setInsightsUni(null)} />
      )}
    </div>
  );
}

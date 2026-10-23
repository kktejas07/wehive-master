import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Award, MessageSquare, CalendarPlus, Loader2, CheckCircle2, ShieldCheck, Mic } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { API, useAuth } from '../context/AuthContext';
import { DESTINATIONS, destination } from '../lib/destinations';

// Signed-in users share success stories, visa interview experiences and events.
// Everything is reviewed by the WeHive team before it appears.
const TABS = [
  { id: 'stories', label: 'Success stories', Icon: Award },
  { id: 'interviews', label: 'Interview experiences', Icon: MessageSquare },
  { id: 'event', label: 'Submit an event', Icon: CalendarPlus },
];
const OUTCOMES = {
  'visa-approved': 'Visa approved', admit: 'Got an admit', 'i20-cas-coe': 'Got my I-20 / CAS / CoE',
  scholarship: 'Won a scholarship', 'pr-approved': 'PR approved',
};
const INTERVIEW_OUTCOMES = { approved: 'Approved', rejected: 'Rejected', 'administrative-processing': 'Administrative processing' };
const EVENT_CATEGORIES = ['Education Fair', 'Info Session', 'Visa & Immigration', 'Scholarship', 'Meetup'];
const today = () => new Date().toISOString().slice(0, 10);

const input = 'w-full h-11 px-3 rounded-xl border border-[hsl(var(--border))] bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--blue-700))]';
const label = 'block text-[13px] font-semibold text-[hsl(var(--blue-900))] mb-1.5';

function errorText(e) {
  const d = e.response?.data?.detail;
  if (Array.isArray(d)) return d.map(x => x.msg?.replace(/^Value error, /, '')).join('. ');
  if (e.response?.status === 429) return 'You have posted a lot recently. Please try again in an hour.';
  return d || 'Something went wrong. Please try again.';
}

function useVisaTypes() {
  const [types, setTypes] = useState([]);
  useEffect(() => { axios.get(`${API}/community/visa-types`).then(r => setTypes(r.data)).catch(() => setTypes([])); }, []);
  return types;
}

function SubmitForm({ path, initial, children, onDone, toBody }) {
  const { token, isAuthed, openAuth } = useAuth();
  const [form, setForm] = useState(initial);
  const [state, setState] = useState({ busy: false, error: '', done: false });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!isAuthed) { openAuth?.(); return; }
    setState({ busy: true, error: '', done: false });
    try {
      await axios.post(`${API}/community/${path}`, toBody ? toBody(form) : form, { headers: { Authorization: `Bearer ${token}` } });
      setState({ busy: false, error: '', done: true });
      setForm(initial);
      onDone?.();
    } catch (err) {
      setState({ busy: false, error: errorText(err), done: false });
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white border border-[hsl(var(--border))] p-6 space-y-4">
      {children(form, set)}
      <p className="text-[12px] text-muted-foreground flex items-start gap-1.5">
        <ShieldCheck className="w-4 h-4 shrink-0 text-[hsl(var(--blue-700))]" aria-hidden="true" />
        Reviewed by our team before it goes live. Don't include passport, Aadhaar, DS-160 or SEVIS numbers, phone numbers, emails or links.
      </p>
      {state.error && <p role="alert" className="text-[13px] text-red-600">{state.error}</p>}
      {state.done && (
        <p role="status" className="text-[13px] text-emerald-700 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Thanks! It will appear once it's reviewed.
        </p>
      )}
      <Button type="submit" variant="accent" disabled={state.busy} className="w-full h-11 rounded-xl text-white font-semibold">
        {state.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isAuthed ? 'Submit for review' : 'Sign in to share'}
      </Button>
    </form>
  );
}

function VisaSelect({ types, value, onChange }) {
  return (
    <select className={input} value={value} onChange={onChange} required>
      <option value="">Select visa type</option>
      {types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
    </select>
  );
}

function Feed({ path, visaType, render, empty }) {
  const [data, setData] = useState({ items: [], loading: true });
  useEffect(() => {
    setData(d => ({ ...d, loading: true }));
    axios.get(`${API}/community/${path}`, { params: { visa_type: visaType || undefined, limit: 30 } })
      .then(r => setData({ items: r.data.items || [], loading: false }))
      .catch(() => setData({ items: [], loading: false }));
  }, [path, visaType]);
  if (data.loading) return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" /></div>;
  if (!data.items.length) return <p className="py-10 text-center text-muted-foreground text-[14px]">{empty}</p>;
  return <div className="space-y-4">{data.items.map(render)}</div>;
}

function StoriesTab({ types }) {
  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-8">
      <Feed
        path="stories"
        empty="No stories yet. Be the first to share yours!"
        render={s => (
          <article key={s.id} className="rounded-2xl bg-white border border-[hsl(var(--border))] p-5">
            <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--blue-700))]">
              {OUTCOMES[s.outcome]} · {s.category}{s.intake ? ` · ${s.intake}` : ''}
            </div>
            {(s.university || s.program) && <h3 className="mt-1 font-bold text-[hsl(var(--blue-900))]">{[s.university, s.program].filter(Boolean).join(' — ')}</h3>}
            <p className="mt-2 text-[14px] text-muted-foreground whitespace-pre-line">{s.story}</p>
            <div className="mt-3 text-[12px] text-muted-foreground">— {s.source_name}</div>
          </article>
        )}
      />
      <SubmitForm path="stories" initial={{ visa_type: '', outcome: 'visa-approved', university: '', program: '', intake: '', story: '', anonymous: false }}>
        {(f, set) => (
          <>
            <h2 className="font-display font-bold text-[20px] text-[hsl(var(--blue-900))]">Share your success</h2>
            <div><label className={label}>Visa type</label><VisaSelect types={types} value={f.visa_type} onChange={set('visa_type')} /></div>
            <div>
              <label className={label}>What happened?</label>
              <select className={input} value={f.outcome} onChange={set('outcome')}>
                {Object.entries(OUTCOMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>University</label><input className={input} value={f.university} onChange={set('university')} maxLength={120} /></div>
              <div><label className={label}>Intake</label><input className={input} value={f.intake} onChange={set('intake')} placeholder="Fall 2026" maxLength={30} /></div>
            </div>
            <div><label className={label}>Program</label><input className={input} value={f.program} onChange={set('program')} maxLength={120} /></div>
            <div>
              <label className={label}>Your story</label>
              <textarea className={`${input} h-32 py-2`} value={f.story} onChange={set('story')} minLength={40} maxLength={2000} required
                placeholder="What helped, what you'd do differently, tips for others…" />
            </div>
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={f.anonymous} onChange={set('anonymous')} /> Post anonymously</label>
          </>
        )}
      </SubmitForm>
    </div>
  );
}

function QuestionBank({ visaType, types }) {
  const [bank, setBank] = useState(null);
  useEffect(() => {
    if (!visaType) { setBank(null); return; }
    axios.get(`${API}/community/interview-questions`, { params: { visa_type: visaType } })
      .then(r => setBank(r.data)).catch(() => setBank(null));
  }, [visaType]);
  if (!visaType) return null;
  const label = types.find(t => t.id === visaType)?.label || visaType;
  return (
    <section className="rounded-2xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-200))] p-5 mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-bold text-[hsl(var(--blue-900))]">Most asked in {label} interviews</h2>
        <Link to={`/visa-interview?visa=${visaType}`} className="text-[13px] font-semibold text-[hsl(var(--blue-700))] inline-flex items-center gap-1">
          <Mic className="w-4 h-4" aria-hidden="true" /> Practice these
        </Link>
      </div>
      {!bank || bank.interviews === 0 ? (
        <p className="mt-2 text-[14px] text-muted-foreground">No shared interviews for this visa yet.</p>
      ) : (
        <>
          <p className="mt-1 text-[13px] text-muted-foreground">
            From {bank.interviews} shared interview{bank.interviews === 1 ? '' : 's'}
            {bank.outcomes?.approved ? ` · ${bank.outcomes.approved} approved` : ''}
            {bank.outcomes?.rejected ? ` · ${bank.outcomes.rejected} rejected` : ''}
          </p>
          <ol className="mt-3 space-y-2 list-decimal list-inside">
            {bank.questions.slice(0, 10).map(q => (
              <li key={q.question} className="text-[14px] text-[hsl(var(--blue-900))]">
                {q.question} <span className="text-[12px] text-muted-foreground">— asked in {q.asked_in} of {bank.interviews}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function InterviewsTab({ types }) {
  const [visaType, setVisaType] = useState('us-f1');
  const [refresh, setRefresh] = useState(0);
  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-8">
      <div>
        <label className={label} htmlFor="iv-filter">Visa type</label>
        <select id="iv-filter" className={`${input} mb-5 max-w-xs`} value={visaType} onChange={e => setVisaType(e.target.value)}>
          {types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <QuestionBank visaType={visaType} types={types} key={`${visaType}-${refresh}`} />
        <Feed
          path="interviews"
          visaType={visaType}
          empty="No interview experiences for this visa yet."
          render={iv => (
            <article key={iv.id} className="rounded-2xl bg-white border border-[hsl(var(--border))] p-5">
              <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--blue-700))]">
                {iv.consulate} · {new Date(iv.interview_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })} · {INTERVIEW_OUTCOMES[iv.outcome]}
                {iv.duration_minutes ? ` · ${iv.duration_minutes} min` : ''}
              </div>
              <ul className="mt-2 list-disc list-inside text-[14px] text-[hsl(var(--blue-900))] space-y-1">
                {iv.questions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
              {iv.tips && <p className="mt-3 text-[14px] text-muted-foreground"><strong>Tip:</strong> {iv.tips}</p>}
              <div className="mt-3 text-[12px] text-muted-foreground">— {iv.source_name}</div>
            </article>
          )}
        />
      </div>
      <SubmitForm
        path="interviews"
        onDone={() => setRefresh(r => r + 1)}
        initial={{ visa_type: '', consulate: '', interview_date: '', outcome: 'approved', duration_minutes: '', questions: '', tips: '', anonymous: true }}
        toBody={f => ({
          ...f,
          duration_minutes: f.duration_minutes ? Number(f.duration_minutes) : null,
          questions: f.questions.split('\n').map(q => q.trim()).filter(Boolean),
        })}
      >
        {(f, set) => (
          <>
            <h2 className="font-display font-bold text-[20px] text-[hsl(var(--blue-900))]">Share your interview</h2>
            <div><label className={label}>Visa type</label><VisaSelect types={types} value={f.visa_type} onChange={set('visa_type')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Consulate / city</label><input className={input} value={f.consulate} onChange={set('consulate')} placeholder="Hyderabad" required maxLength={80} /></div>
              <div><label className={label}>Interview date</label><input type="date" className={input} value={f.interview_date} onChange={set('interview_date')} max={today()} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Outcome</label>
                <select className={input} value={f.outcome} onChange={set('outcome')}>
                  {Object.entries(INTERVIEW_OUTCOMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label className={label}>Minutes</label><input type="number" min={1} max={120} className={input} value={f.duration_minutes} onChange={set('duration_minutes')} /></div>
            </div>
            <div>
              <label className={label}>Questions you were asked (one per line)</label>
              <textarea className={`${input} h-32 py-2`} value={f.questions} onChange={set('questions')} required
                placeholder={'Why this university?\nWho is sponsoring your studies?'} />
            </div>
            <div><label className={label}>Tips for others</label><textarea className={`${input} h-20 py-2`} value={f.tips} onChange={set('tips')} maxLength={1000} /></div>
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={f.anonymous} onChange={set('anonymous')} /> Post anonymously</label>
          </>
        )}
      </SubmitForm>
    </div>
  );
}

function EventTab() {
  const countries = Object.entries(DESTINATIONS).filter(([id]) => id !== 'global');
  return (
    <div className="max-w-xl mx-auto">
      <p className="text-[14px] text-muted-foreground mb-5 text-center">
        Running an education fair, university info session or visa webinar? Submit it and, once approved, it appears on <Link to="/events" className="text-[hsl(var(--blue-700))] font-semibold">Global Events</Link>.
      </p>
      <SubmitForm path="events" initial={{ name: '', date: '', online: false, country_id: 'india', city: '', category: 'Education Fair', organiser: '', source_url: '', description: '' }}>
        {(f, set) => (
          <>
            <div><label className={label}>Event name</label><input className={input} value={f.name} onChange={set('name')} required minLength={5} maxLength={150} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Date</label><input type="date" className={input} value={f.date} onChange={set('date')} min={today()} required /></div>
              <div>
                <label className={label}>Type</label>
                <select className={input} value={f.category} onChange={set('category')}>
                  {EVENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={f.online} onChange={set('online')} /> Online event</label>
            {!f.online && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Country</label>
                  <select className={input} value={f.country_id} onChange={set('country_id')}>
                    {countries.map(([id]) => <option key={id} value={id}>{destination(id).name}</option>)}
                  </select>
                </div>
                <div><label className={label}>City</label><input className={input} value={f.city} onChange={set('city')} maxLength={80} /></div>
              </div>
            )}
            <div><label className={label}>Organiser</label><input className={input} value={f.organiser} onChange={set('organiser')} required minLength={2} maxLength={120} /></div>
            <div><label className={label}>Event page / registration link</label><input type="url" className={input} value={f.source_url} onChange={set('source_url')} placeholder="https://" required /></div>
            <div><label className={label}>Description</label><textarea className={`${input} h-24 py-2`} value={f.description} onChange={set('description')} maxLength={1000} /></div>
          </>
        )}
      </SubmitForm>
    </div>
  );
}

export default function Community() {
  const [tab, setTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return TABS.some(x => x.id === t) ? t : 'stories';
  });
  const types = useVisaTypes();

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--soft-bg))]">
      <Navbar />
      <main className="flex-grow pt-28 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h1 className="font-display text-[36px] md:text-[48px] font-bold text-[hsl(var(--blue-900))] tracking-[-0.02em] leading-tight">WeHive Community</h1>
            <p className="mt-3 text-[16px] text-muted-foreground max-w-2xl mx-auto">
              Real stories, real interview questions and upcoming events, shared by students and alumni.
            </p>
          </div>
          <div className="flex justify-center gap-2 flex-wrap mb-8" role="tablist">
            {TABS.map(({ id, label: l, Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`px-4 min-h-[44px] rounded-full text-[14px] font-semibold border inline-flex items-center gap-2 transition-colors ${
                  tab === id ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-[hsl(var(--border))] hover:text-[hsl(var(--blue-900))]'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" /> {l}
              </button>
            ))}
          </div>
          {tab === 'stories' && <StoriesTab types={types} />}
          {tab === 'interviews' && <InterviewsTab types={types} />}
          {tab === 'event' && <EventTab />}
        </div>
      </main>
      <Footer />
    </div>
  );
}

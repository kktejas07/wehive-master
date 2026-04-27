import { useEffect, useRef, useState } from 'react';
import { Zap, FileText, FolderOpen, Sparkles, ChevronDown, Calendar as CalIcon, Compass, Ticket } from 'lucide-react';
import { Calendar } from './ui/calendar';

export const DEFAULT_FILTERS = {
  visa_type: 'All Visa Types',
  delivery: 'Any Time',
  documents: 'Any Documents',
  travel_date: null,
  view: 'explore',
};

const VISA_TYPES = [
  { id: 'all', label: 'All Visa Types' },
  { id: 'tourist', label: 'Tourist' },
  { id: 'business', label: 'Business' },
  { id: 'student', label: 'Student' },
  { id: 'work', label: 'Work' },
  { id: 'transit', label: 'Transit' },
  { id: 'medical', label: 'Medical' },
];

const DELIVERY = [
  { id: 'any', label: 'Any Time', sub: 'Standard delivery' },
  { id: 'same_day', label: 'Same Day', sub: 'Available for select countries' },
  { id: 'rush', label: '48\u201172 hours', sub: 'Premium rush' },
  { id: 'standard', label: '5\u201115 days', sub: 'Standard' },
];

const DOCS = [
  { id: 'any', label: 'Any Documents' },
  { id: 'minimal', label: 'Minimal (passport only)' },
  { id: 'standard', label: 'Standard set' },
];

function useOutsideClose(ref, onClose) {
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onClose]);
}

function Pop({ Icon, label, value, color, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-[hsl(var(--blue-50))] transition text-left"
      >
        <span
          className="h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0"
          style={{ background: color }}
        >
          <Icon className="w-4 h-4 text-white" />
        </span>
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55">
            {label}
          </span>
          <span className="text-[13.5px] font-bold text-[hsl(var(--blue-900))] inline-flex items-center gap-1">
            {value}
            <ChevronDown className="w-3 h-3 text-[hsl(var(--blue-900))]/40" />
          </span>
        </span>
      </button>
      {open && (
        <div className="absolute z-30 mt-2 left-0 sm:left-auto sm:right-0 w-[calc(100vw-2.5rem)] sm:w-[300px] rounded-2xl bg-white border border-black/5 shadow-[0_20px_50px_-25px_rgba(10,44,138,0.45)] p-2">
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

function OptionList({ options, value, onSelect, close }) {
  return (
    <ul className="max-h-[280px] overflow-auto py-1">
      {options.map((o) => (
        <li key={o.id}>
          <button
            type="button"
            onClick={() => {
              onSelect(o);
              close();
            }}
            className={`w-full text-left px-3 py-2.5 rounded-xl hover:bg-[hsl(var(--blue-50))] transition flex flex-col ${
              value === o.label ? 'bg-[hsl(var(--blue-50))]' : ''
            }`}
          >
            <span className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{o.label}</span>
            {o.sub && (
              <span className="text-[12px] text-[hsl(var(--blue-900))]/55">{o.sub}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

function TabsBar({ value, onChange }) {
  const tabs = [
    { id: 'explore', label: 'Explore', Icon: Compass },
    { id: 'events', label: 'Events', Icon: Ticket },
  ];
  return (
    <div className="flex justify-center gap-2">
      {tabs.map((t) => {
        const active = value === t.id;
        const Icon = t.Icon;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`relative inline-flex flex-col items-center gap-1 px-5 py-2 transition ${
              active ? 'text-[hsl(var(--blue-900))]' : 'text-[hsl(var(--blue-900))]/45 hover:text-[hsl(var(--blue-900))]/70'
            }`}
          >
            <span
              className={`h-10 w-10 rounded-xl inline-flex items-center justify-center transition ${
                active ? 'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))]' : ''
              }`}
            >
              <Icon className="w-5 h-5" />
            </span>
            <span className="text-[11px] uppercase tracking-[0.14em] font-bold">{t.label}</span>
            {active && <span className="absolute -bottom-1 h-[3px] w-8 bg-[hsl(var(--accent))] rounded-full" />}
          </button>
        );
      })}
    </div>
  );
}

export default function FilterBar({ value, onChange }) {
  const v = value || DEFAULT_FILTERS;
  const set = (patch) => onChange({ ...v, ...patch });
  return (
    <div className="flex flex-col items-center gap-5">
      <TabsBar value={v.view} onChange={(view) => set({ view })} />
      <div className="w-full max-w-4xl rounded-full bg-white border border-black/5 shadow-[0_20px_50px_-30px_rgba(10,44,138,0.4)] px-2 py-1.5 flex flex-wrap items-center justify-between gap-1">
        <Pop Icon={Zap} label="Visa delivery" value={v.delivery} color="#22c55e">
          {(close) => (
            <OptionList
              options={DELIVERY}
              value={v.delivery}
              onSelect={(o) => set({ delivery: o.label, deliveryId: o.id })}
              close={close}
            />
          )}
        </Pop>
        <span className="hidden sm:block w-px h-7 bg-black/8" />
        <Pop Icon={FileText} label="Type" value={v.visa_type} color="#0a2c8a">
          {(close) => (
            <OptionList
              options={VISA_TYPES}
              value={v.visa_type}
              onSelect={(o) => set({ visa_type: o.label, visaTypeId: o.id })}
              close={close}
            />
          )}
        </Pop>
        <span className="hidden sm:block w-px h-7 bg-black/8" />
        <Pop Icon={FolderOpen} label="Documents" value={v.documents} color="#f59e0b">
          {(close) => (
            <OptionList
              options={DOCS}
              value={v.documents}
              onSelect={(o) => set({ documents: o.label, documentsId: o.id })}
              close={close}
            />
          )}
        </Pop>
        <span className="hidden sm:block w-px h-7 bg-black/8" />
        <Pop
          Icon={Sparkles}
          label="Holidays"
          value={v.travel_date ? new Date(v.travel_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Select Dates'}
          color="#ec4899"
        >
          {(close) => (
            <div className="p-1">
              <Calendar
                mode="single"
                selected={v.travel_date ? new Date(v.travel_date) : undefined}
                onSelect={(d) => {
                  if (d) set({ travel_date: d.toISOString() });
                  close();
                }}
                initialFocus
              />
              {v.travel_date && (
                <div className="flex items-center justify-between px-2 py-2 border-t border-black/5">
                  <div className="text-[12px] text-[hsl(var(--blue-900))]/65 inline-flex items-center gap-1">
                    <CalIcon className="w-3.5 h-3.5" />
                    {new Date(v.travel_date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <button
                    onClick={() => set({ travel_date: null })}
                    className="text-[12px] font-bold text-[hsl(var(--accent))] hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </Pop>
      </div>
    </div>
  );
}

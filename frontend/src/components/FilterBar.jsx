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

function Pop({ Icon, label, value, align = 'left', last = false, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, () => setOpen(false));
  const mobileAlign = align === 'right' ? 'right-0' : 'left-0';
  const deskAlign = last ? 'sm:left-auto sm:right-0' : 'sm:left-0 sm:right-auto';
  return (
    <div className="relative min-w-0 sm:flex-1 overflow-visible" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex w-full min-w-0 min-h-[52px] items-center gap-3 px-3 py-2 rounded-xl hover:bg-[hsl(var(--soft-bg))] transition-colors duration-200 text-left"
      >
        <span className="h-9 w-9 rounded-lg hidden sm:inline-flex items-center justify-center shrink-0 bg-[hsl(var(--blue-50))]">
          <Icon className="w-4 h-4 text-[hsl(var(--blue-700))]" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-col items-start leading-tight">
          <span className="text-[12px] uppercase tracking-[0.1em] sm:tracking-[0.14em] font-semibold text-muted-foreground truncate max-w-full">
            {label}
          </span>
          <span className="mt-0.5 text-[14px] font-semibold text-[hsl(var(--blue-900))] inline-flex max-w-full min-w-0 items-center gap-1">
            <span className="truncate">{value}</span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </span>
        </span>
      </button>
      {open && (
        <div className={`absolute z-30 mt-2 ${mobileAlign} ${deskAlign} w-[calc(100vw-2.5rem)] max-w-[320px] sm:w-[300px] rounded-2xl bg-white border border-[hsl(var(--border))] shadow-lg p-2`}>
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
            className={`w-full text-left px-3 py-2.5 rounded-xl hover:bg-[hsl(var(--soft-bg))] transition-colors flex flex-col ${
              value === o.label ? 'bg-[hsl(var(--blue-50))]' : ''
            }`}
          >
            <span className={`text-[14px] font-semibold ${value === o.label ? 'text-[hsl(var(--blue-700))]' : 'text-[hsl(var(--blue-900))]'}`}>{o.label}</span>
            {o.sub && (
              <span className="text-[12px] text-muted-foreground">{o.sub}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

function TabsBar({ value, onChange }) {
  const tabs = [
    { id: 'explore',  label: 'Explore',  Icon: Compass },
    { id: 'holidays', label: 'Holidays', Icon: Sparkles },
    { id: 'events',   label: 'Events',   Icon: Ticket },
  ];
  return (
    <div className="flex justify-center gap-1 sm:gap-2" role="group" aria-label="Browse mode">
      {tabs.map((t) => {
        const active = value === t.id;
        const Icon = t.Icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-pressed={active}
            className={`relative inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-semibold transition-colors duration-200 ${
              active
                ? 'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))]'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            <span>{t.label}</span>
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
    <div className="flex flex-col items-center gap-4">
      <TabsBar value={v.view} onChange={(view) => set({ view })} />
      <div className="w-full max-w-4xl rounded-2xl bg-white border border-[hsl(var(--border))] shadow-sm p-1.5 grid grid-cols-2 gap-1 sm:flex sm:items-center sm:gap-1 overflow-visible relative z-50">
        <Pop Icon={Zap} label="Visa delivery" value={v.delivery}>
          {(close) => (
            <OptionList
              options={DELIVERY}
              value={v.delivery}
              onSelect={(o) => set({ delivery: o.label, deliveryId: o.id })}
              close={close}
            />
          )}
        </Pop>
        <span className="hidden sm:block w-px h-8 shrink-0 bg-[hsl(var(--border))]" aria-hidden="true" />
        <Pop Icon={FileText} label="Type" value={v.visa_type} align="right">
          {(close) => (
            <OptionList
              options={VISA_TYPES}
              value={v.visa_type}
              onSelect={(o) => set({ visa_type: o.label, visaTypeId: o.id })}
              close={close}
            />
          )}
        </Pop>
        <span className="hidden sm:block w-px h-8 shrink-0 bg-[hsl(var(--border))]" aria-hidden="true" />
        <Pop Icon={FolderOpen} label="Documents" value={v.documents}>
          {(close) => (
            <OptionList
              options={DOCS}
              value={v.documents}
              onSelect={(o) => set({ documents: o.label, documentsId: o.id })}
              close={close}
            />
          )}
        </Pop>
        <span className="hidden sm:block w-px h-8 shrink-0 bg-[hsl(var(--border))]" aria-hidden="true" />
        <Pop
          Icon={Sparkles}
          label="Holidays"
          value={v.travel_date ? new Date(v.travel_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Select Dates'}
          align="right"
          last
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
                <div className="flex items-center justify-between px-2 py-2 border-t border-[hsl(var(--border))]">
                  <div className="text-[12px] text-muted-foreground inline-flex items-center gap-1">
                    <CalIcon className="w-3.5 h-3.5" />
                    {new Date(v.travel_date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <button
                    type="button"
                    onClick={() => set({ travel_date: null })}
                    className="min-h-[32px] px-2 text-[13px] font-semibold text-[hsl(var(--blue-700))] hover:underline"
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

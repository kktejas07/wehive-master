import { Plane, Briefcase, GraduationCap, Building2 } from 'lucide-react';

export const TYPE_ICONS = {
  Tourist: Plane,
  Business: Briefcase,
  Student: GraduationCap,
  Work: Building2,
};

export const TYPE_COLORS = {
  Tourist: '#22c55e',
  Business: '#0a2c8a',
  Student: '#f59e0b',
  Work: '#ec4899',
  Transit: '#0ea5e9',
  Medical: '#dc2626',
};

export default function CategoryTabs({ categories, value, onChange }) {
  const ids = Object.keys(categories || {});
  return (
    <div className="inline-flex flex-wrap gap-2 p-1.5 rounded-2xl bg-white border border-black/8">
      {ids.map((id) => {
        const Icon = TYPE_ICONS[id] || Plane;
        const active = value === id;
        const color = TYPE_COLORS[id] || '#0a2c8a';
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            data-testid={`visa-type-${id.toLowerCase()}`}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-bold transition ${
              active
                ? 'text-white'
                : 'text-[hsl(var(--blue-900))]/65 hover:text-[hsl(var(--blue-900))]'
            }`}
            style={active ? { background: color } : {}}
          >
            <Icon className="w-3.5 h-3.5" />
            {id}
          </button>
        );
      })}
    </div>
  );
}

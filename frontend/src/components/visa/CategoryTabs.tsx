import { Plane, Briefcase, GraduationCap, Building2, LucideIcon } from 'lucide-react';

export const TYPE_ICONS: Record<string, LucideIcon> = {
  Tourist: Plane,
  Business: Briefcase,
  Student: GraduationCap,
  Work: Building2,
};

// One consistent selection colour for every visa type (primary blue).
// Kept as a map so existing imports keep working.
const PRIMARY = 'hsl(var(--blue-700))';
export const TYPE_COLORS: Record<string, string> = {
  Tourist: PRIMARY,
  Business: PRIMARY,
  Student: PRIMARY,
  Work: PRIMARY,
  Transit: PRIMARY,
  Medical: PRIMARY,
};

interface CategoryTabsProps {
  categories?: Record<string, unknown>;
  value: string;
  onChange: (id: string) => void;
}

export default function CategoryTabs({ categories, value, onChange }: CategoryTabsProps) {
  const ids = Object.keys(categories || {});
  return (
    <div role="tablist" aria-label="Visa type" className="grid grid-cols-2 sm:inline-flex sm:flex-wrap gap-1.5 p-1.5 w-full sm:w-auto rounded-2xl bg-white border border-[hsl(var(--border))] shadow-sm">
      {ids.map((id) => {
        const Icon = TYPE_ICONS[id] || Plane;
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            data-testid={`visa-type-${id.toLowerCase()}`}
            className={`inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl px-4 min-h-[44px] text-[14px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--blue-700))] focus-visible:ring-offset-2 ${
              active
                ? 'bg-[hsl(var(--blue-700))] text-white'
                : 'text-muted-foreground hover:text-[hsl(var(--blue-900))] hover:bg-[hsl(var(--blue-50))]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {id}
          </button>
        );
      })}
    </div>
  );
}

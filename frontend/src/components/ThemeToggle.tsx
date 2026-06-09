import { useTheme } from 'next-themes';
import { Sun, Monitor } from 'lucide-react';
import { cn } from '../lib/utils';

export function ThemeToggle({ className }) {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: 'light', Icon: Sun, label: 'Light' },
    { value: 'system', Icon: Monitor, label: 'System' },
  ];

  return (
    <div className={cn("flex items-center gap-1 p-1 rounded-full bg-[hsl(var(--soft-bg))]", className)}>
      {themes.map(({ value, Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "p-2 rounded-full transition-colors",
            theme === value
              ? "bg-white shadow-sm text-[hsl(var(--blue-700))]"
              : "text-[hsl(var(--blue-900))]/60 hover:text-[hsl(var(--blue-900))]"
          )}
          aria-label={`${label} theme`}
          title={`${label} theme`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
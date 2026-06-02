import { Check } from 'lucide-react';

interface DocsListProps {
  docs: string[];
}

export default function DocsList({ docs }: DocsListProps) {
  return (
    <ul className="mt-6 space-y-3">
      {docs.map((d, i) => (
        <li
          key={`${d}-${i}`}
          className="flex items-start gap-3 rounded-xl bg-[hsl(var(--soft-bg))] border border-black/5 p-4"
        >
          <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))]">
            <Check className="w-3.5 h-3.5" />
          </span>
          <span className="text-[14.5px] text-[hsl(var(--blue-900))]/85">{d}</span>
        </li>
      ))}
    </ul>
  );
}

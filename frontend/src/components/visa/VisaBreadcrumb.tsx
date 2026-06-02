import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface VisaBreadcrumbProps {
  countryName: string;
}

export default function VisaBreadcrumb({ countryName }: VisaBreadcrumbProps) {
  return (
    <div className="flex items-center gap-1.5 text-[13px] text-[hsl(var(--blue-900))]/55">
      <Link to="/" className="hover:text-[hsl(var(--blue-700))]">Home</Link>
      <ChevronRight className="w-3.5 h-3.5" />
      <Link to="/" className="hover:text-[hsl(var(--blue-700))]">Visas</Link>
      <ChevronRight className="w-3.5 h-3.5" />
      <span className="text-[hsl(var(--blue-900))] font-bold">{countryName}</span>
    </div>
  );
}

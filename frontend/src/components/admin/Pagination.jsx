import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({ skip, limit, total, onPageChange }) {
  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.ceil(total / limit) || 1;

  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  const goTo = (page) => onPageChange((page - 1) * limit);

  return (
    <div className="flex items-center justify-between pt-4 border-t border-[var(--glass-border)]">
      <span className="text-[11px] text-[var(--text-secondary)]">
        {skip + 1}–{Math.min(skip + limit, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => goTo(1)}
          aria-label="First page"
          disabled={currentPage === 1}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-hover)] disabled:opacity-30 disabled:cursor-default transition"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => goTo(currentPage - 1)}
          aria-label="Previous page"
          disabled={currentPage === 1}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-hover)] disabled:opacity-30 disabled:cursor-default transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {start > 1 && (
          <span className="px-1 text-[11px] text-slate-600">…</span>
        )}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => goTo(p)}
            className={`w-7 h-7 rounded-lg text-[11px] font-bold transition ${
              p === currentPage
                ? 'bg-[hsl(var(--blue-700))] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-hover)]'
            }`}
          >
            {p}
          </button>
        ))}
        {end < totalPages && (
          <span className="px-1 text-[11px] text-slate-600">…</span>
        )}
        <button
          onClick={() => goTo(currentPage + 1)}
          aria-label="Next page"
          disabled={currentPage === totalPages}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-hover)] disabled:opacity-30 disabled:cursor-default transition"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => goTo(totalPages)}
          aria-label="Last page"
          disabled={currentPage === totalPages}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-hover)] disabled:opacity-30 disabled:cursor-default transition"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

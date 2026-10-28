import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ children, className = '' }) {
  return <nav role="navigation" aria-label="pagination" className={`flex justify-center ${className}`}>{children}</nav>;
}

export function PaginationContent({ children, className = '' }) {
  return <ul className={`flex items-center gap-1 ${className}`}>{children}</ul>;
}

export function PaginationItem({ children, className = '' }) {
  return <li className={className}>{children}</li>;
}

export function PaginationLink({ children, isActive, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border text-[13px] font-medium transition-colors
        ${isActive
          ? 'border-[#011CB5] bg-[#011CB5] text-white'
          : 'border-[#E8EDF8] bg-white text-gray-600 hover:bg-[#F0F4FF] hover:text-[#1B2B5E]'}
        ${className}`}
    >
      {children}
    </button>
  );
}

export function PaginationPrevious({ onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      aria-label="Previous page"
      className={`flex h-9 w-9 items-center justify-center rounded-lg border border-[#E8EDF8] bg-white text-gray-600 hover:bg-[#F0F4FF] transition-colors ${className}`}
    >
      <ChevronLeft className="w-4 h-4" />
    </button>
  );
}

export function PaginationNext({ onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      aria-label="Next page"
      className={`flex h-9 w-9 items-center justify-center rounded-lg border border-[#E8EDF8] bg-white text-gray-600 hover:bg-[#F0F4FF] transition-colors ${className}`}
    >
      <ChevronRight className="w-4 h-4" />
    </button>
  );
}

import { cn, inr, setCurrency, getCurrency, statusColor, STATUS_COLORS } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('handles undefined/null', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b');
  });

  it('returns empty string for no args', () => {
    expect(cn()).toBe('');
  });
});

describe('currency', () => {
  afterEach(() => setCurrency('INR'));

  it('defaults to INR', () => {
    expect(getCurrency()).toBe('INR');
  });

  it('setCurrency updates value', () => {
    setCurrency('USD');
    expect(getCurrency()).toBe('USD');
  });

  it('setCurrency ignores null', () => {
    setCurrency(null);
    expect(getCurrency()).toBe('INR');
  });
});

describe('inr', () => {
  afterEach(() => setCurrency('INR'));

  it('formats INR', () => {
    const result = inr(1500);
    expect(result).toContain('₹');
    expect(result).toContain('1,500');
  });

  it('formats 0', () => {
    expect(inr(0)).toContain('0');
  });

  it('handles null/undefined', () => {
    expect(inr(null)).toContain('0');
    expect(inr(undefined)).toContain('0');
  });

  it('formats USD after switching currency', () => {
    setCurrency('USD');
    const result = inr(100);
    expect(result).toContain('$');
    expect(result).toContain('100');
  });

  it('uses fallback for unknown currency', () => {
    setCurrency('XYZ');
    const result = inr(500);
    expect(result).toContain('XYZ');
    expect(result).toContain('500');
  });
});

describe('statusColor', () => {
  it('returns correct color for known statuses', () => {
    expect(statusColor('draft')).toBe(STATUS_COLORS.draft);
    expect(statusColor('submitted')).toBe(STATUS_COLORS.submitted);
    expect(statusColor('in_review')).toBe(STATUS_COLORS.in_review);
    expect(statusColor('approved')).toBe(STATUS_COLORS.approved);
    expect(statusColor('rejected')).toBe(STATUS_COLORS.rejected);
  });

  it('returns draft color for unknown status', () => {
    expect(statusColor('unknown')).toBe(STATUS_COLORS.draft);
    expect(statusColor('')).toBe(STATUS_COLORS.draft);
  });
});

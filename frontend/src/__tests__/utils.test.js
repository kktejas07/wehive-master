/**
 * Unit tests for frontend/src/lib/utils.js
 * Covers: cn, setCurrency/getCurrency, inr, statusColor, countryFlag
 */

import { cn, setCurrency, getCurrency, inr, STATUS_COLORS, statusColor, countryFlag } from '../lib/utils';

// ---------------------------------------------------------------------------
// cn (className merger)
// ---------------------------------------------------------------------------
describe('cn()', () => {
  it('merges multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });

  it('handles conditional classes via objects', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('handles undefined and null gracefully', () => {
    expect(cn(undefined, null, 'valid')).toBe('valid');
  });

  it('returns empty string for no args', () => {
    expect(cn()).toBe('');
  });
});

// ---------------------------------------------------------------------------
// setCurrency / getCurrency
// ---------------------------------------------------------------------------
describe('setCurrency() / getCurrency()', () => {
  afterEach(() => {
    // reset to default
    setCurrency('INR');
  });

  it('defaults to INR', () => {
    setCurrency('INR');
    expect(getCurrency()).toBe('INR');
  });

  it('updates currency to USD', () => {
    setCurrency('USD');
    expect(getCurrency()).toBe('USD');
  });

  it('falls back to INR when called with null', () => {
    setCurrency(null);
    expect(getCurrency()).toBe('INR');
  });

  it('falls back to INR when called with empty string', () => {
    setCurrency('');
    expect(getCurrency()).toBe('INR');
  });
});

// ---------------------------------------------------------------------------
// inr (currency formatting)
// ---------------------------------------------------------------------------
describe('inr()', () => {
  beforeEach(() => {
    setCurrency('INR');
  });

  afterEach(() => {
    setCurrency('INR');
  });

  it('formats a number as INR', () => {
    const result = inr(10000);
    expect(result).toContain('10,000');
  });

  it('formats 0 without throwing', () => {
    expect(() => inr(0)).not.toThrow();
  });

  it('formats null without throwing', () => {
    expect(() => inr(null)).not.toThrow();
    expect(inr(null)).toContain('0');
  });

  it('formats undefined without throwing', () => {
    expect(() => inr(undefined)).not.toThrow();
  });

  it('formats large numbers (1 lakh)', () => {
    const result = inr(100000);
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('switches currency symbol when setCurrency is called with USD', () => {
    setCurrency('USD');
    const result = inr(500);
    // Should contain $ or USD
    expect(result.includes('$') || result.includes('USD')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// statusColor
// ---------------------------------------------------------------------------
describe('statusColor()', () => {
  it('returns correct class for draft', () => {
    expect(statusColor('draft')).toBe(STATUS_COLORS.draft);
    expect(statusColor('draft')).toContain('slate');
  });

  it('returns correct class for submitted', () => {
    expect(statusColor('submitted')).toBe(STATUS_COLORS.submitted);
    expect(statusColor('submitted')).toContain('blue');
  });

  it('returns correct class for in_review', () => {
    expect(statusColor('in_review')).toBe(STATUS_COLORS.in_review);
    expect(statusColor('in_review')).toContain('amber');
  });

  it('returns correct class for approved', () => {
    expect(statusColor('approved')).toBe(STATUS_COLORS.approved);
    expect(statusColor('approved')).toContain('emerald');
  });

  it('returns correct class for rejected', () => {
    expect(statusColor('rejected')).toBe(STATUS_COLORS.rejected);
    expect(statusColor('rejected')).toContain('red');
  });

  it('returns fallback class for unknown status', () => {
    const result = statusColor('unknown_status');
    expect(result).toContain('slate');
  });

  it('returns fallback for empty string', () => {
    const result = statusColor('');
    expect(result).toContain('slate');
  });

  it('returns fallback for null/undefined', () => {
    expect(statusColor(null)).toContain('slate');
    expect(statusColor(undefined)).toContain('slate');
  });
});

// ---------------------------------------------------------------------------
// countryFlag
// ---------------------------------------------------------------------------
describe('countryFlag()', () => {
  it('returns a flag emoji for "US"', () => {
    const flag = countryFlag('US');
    expect(flag).toBeTruthy();
    expect(flag.length).toBeGreaterThan(0);
    // Flag emoji is made of regional indicator symbols (surrogate pairs)
    expect([...flag].length).toBe(2);
  });

  it('returns same result for lowercase and uppercase', () => {
    expect(countryFlag('us')).toBe(countryFlag('US'));
  });

  it('returns empty string for null', () => {
    expect(countryFlag(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(countryFlag(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(countryFlag('')).toBe('');
  });

  it('returns empty string for codes longer than 2 chars', () => {
    expect(countryFlag('USA')).toBe('');
  });

  it('returns empty string for single character', () => {
    expect(countryFlag('U')).toBe('');
  });

  it('returns flag for IN (India)', () => {
    const flag = countryFlag('IN');
    expect([...flag].length).toBe(2);
  });

  it('returns flag for AE (UAE)', () => {
    const flag = countryFlag('AE');
    expect([...flag].length).toBe(2);
  });
});

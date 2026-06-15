import { landmarkFor } from './landmarks';

describe('landmarkFor', () => {
  it('returns local image path for known country by id', () => {
    const result = landmarkFor({ id: 'us' });
    expect(result).toContain('/images/destinations/');
    expect(result).toContain('united-states');
  });

  it('returns local image path for known country by iso2', () => {
    const result = landmarkFor({ iso2: 'fr' });
    expect(result).toContain('/images/destinations/france');
  });

  it('prefers id over iso2', () => {
    const result = landmarkFor({ id: 'de', iso2: 'fr' });
    expect(result).toContain('germany');
  });

  it('returns a string URL for any country in LOCALS', () => {
    const result = landmarkFor({ id: 'jp' });
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('returns null for unknown country', () => {
    expect(landmarkFor({ id: 'xy' })).toBeNull();
  });

  it('returns null for null input', () => {
    expect(landmarkFor(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(landmarkFor(undefined)).toBeNull();
  });

  it('returns null for empty object', () => {
    const result = landmarkFor({});
    expect(result).toBeNull();
  });

  it('is case insensitive', () => {
    const upper = landmarkFor({ id: 'US' });
    const lower = landmarkFor({ id: 'us' });
    expect(upper).toBe(lower);
  });

  it('returns correct image for schengen country', () => {
    const result = landmarkFor({ id: 'it' });
    expect(result).toContain('italy');
  });
});

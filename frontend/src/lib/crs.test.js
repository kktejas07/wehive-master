import { agePoints, crsScore, crsVerdict, languagePoints, transferabilityPoints } from './crs';

describe('CRS (single applicant)', () => {
  it('follows the IRCC age grid', () => {
    expect(agePoints(19)).toBe(105);
    expect(agePoints(27)).toBe(110);
    expect(agePoints(34)).toBe(83);
    expect(agePoints(44)).toBe(6);
    expect(agePoints(45)).toBe(0);
    expect(agePoints(17)).toBe(0);
  });

  it('counts language per ability x 4', () => {
    expect(languagePoints('clb9')).toBe(124);
    expect(languagePoints('clb8')).toBe(92);
    expect(languagePoints('clb7')).toBe(68);
    expect(languagePoints('clb6')).toBe(36);
  });

  it('caps skill transferability at 100', () => {
    expect(transferabilityPoints('masters', 'clb9', '3plus')).toBe(100);
    expect(transferabilityPoints('bachelors', 'clb8', '1year')).toBe(26);
    expect(transferabilityPoints('diploma', 'clb6', '3plus')).toBe(0);
  });

  it('adds the factors with no invented bonus points', () => {
    const r = crsScore({ age: 27, edu: 'masters', clb: 'clb9', exp: '3plus' });
    expect(r.total).toBe(110 + 135 + 124 + 100);
    expect(crsScore({ age: 41, edu: 'diploma', clb: 'clb6', exp: 'none' }).total).toBe(39 + 98 + 36);
  });

  it('reads the score honestly', () => {
    expect(crsVerdict(480)).toMatch(/strong/);
    expect(crsVerdict(420)).toMatch(/moderate/);
    expect(crsVerdict(300)).toMatch(/Below/);
  });
});

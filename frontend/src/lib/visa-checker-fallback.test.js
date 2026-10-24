import { fromWehiveRules, unknownResult } from './visa-checker-fallback';

const ctx = { nationality: 'IN', destination: 'FR' };

describe('visa checker fallback', () => {
  it('uses WeHive rules, with no invented fee or stay', () => {
    const r = fromWehiveRules({
      processing: {
        requirement: 'visa', requirement_label: 'Visa required (apply before travel)', note: null,
        time: { label: '15 days (can be extended to 45)', basis: 'law' },
        requirement_source: { name: 'Visa requirements for Indian citizens', url: 'https://w.example', checked: '24 Oct 2026' },
      },
      applicant_rules: [{ text: 'Travel medical insurance of at least €30,000.', basis: 'law', source_name: 'EU Visa Code', source_url: 'https://eu.example' }],
    }, ctx);
    expect(r.outcome).toBe('VISA_REQUIRED');
    expect(r.provider).toBe('WeHive visa rules');
    expect(r.procedures[0].description).toBe('Usually 15 days (can be extended to 45).');
    expect(r.procedures[0].sources.map((s) => s.url)).toEqual(['https://w.example', 'https://eu.example']);
    expect(r.procedures[1].title).toMatch(/€30,000/);
    expect(JSON.stringify(r)).not.toMatch(/"price"|lengthOfStay/);
  });

  it('visa-free needs no procedure', () => {
    expect(fromWehiveRules({ processing: { requirement: 'visa_free' } }, ctx).procedures).toEqual([]);
  });

  it('other passports are not guessed', () => {
    expect(unknownResult({ nationality: 'US', destination: 'FR' }).outcome).toBe('UNKNOWN');
  });
});

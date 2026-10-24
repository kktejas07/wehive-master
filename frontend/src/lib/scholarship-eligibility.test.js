import { scholarshipFit } from './scholarship-eligibility';

const DEFAULT_PROFILE = { gpa: 3.0, ielts: 6.5, gre: false, gmat: false, extracurriculars: false, work_experience_years: 0, research_experience: false, budget: 30000 };
const uni = { scholarships: true, ielts_min: 6.5, tuition_usd: 20000, gre_required: false };

describe('scholarshipFit', () => {
  it('the default profile matches an ordinary scholarship university', () => {
    const r = scholarshipFit(uni, DEFAULT_PROFILE);
    expect(r.eligible).toBe(true);
    expect(r.reasons).toEqual(expect.arrayContaining(['Good GPA', 'Meets IELTS 6.5', 'Within budget']));
  });

  it('missing the English requirement is never a match', () => {
    expect(scholarshipFit({ ...uni, ielts_min: 7.5 }, { ...DEFAULT_PROFILE, gpa: 4 }).eligible).toBe(false);
  });

  it('a stronger profile scores higher, and GPA is counted once', () => {
    const base = scholarshipFit(uni, DEFAULT_PROFILE).score;
    const strong = scholarshipFit(uni, { ...DEFAULT_PROFILE, gpa: 4, research_experience: true }).score;
    expect(strong).toBeGreaterThan(base);
    expect(strong).toBeLessThanOrEqual(100);
  });

  it('universities without scholarships are skipped', () => {
    expect(scholarshipFit({ ...uni, scholarships: false }, DEFAULT_PROFILE)).toBeNull();
  });
});

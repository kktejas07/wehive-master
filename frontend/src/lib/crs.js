// Express Entry Comprehensive Ranking System (CRS), single applicant (no spouse), from the
// answers the assessment asks: age, education, English level and skilled work outside Canada.
// Points follow IRCC's CRS criteria grid. Factors the form does not ask (Canadian work or study,
// French, a sibling in Canada, a provincial nomination) add more, so the result is a minimum.
export const CRS_MAX = 1200;
export const IRCC_ROUNDS_URL =
  'https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-rounds.html';

const AGE = { 17: 0, 18: 99, 19: 105, 30: 105, 31: 99, 32: 94, 33: 88, 34: 83, 35: 77, 36: 72, 37: 66, 38: 61, 39: 55, 40: 50, 41: 39, 42: 28, 43: 17, 44: 6 };

export function agePoints(age) {
  const a = Math.floor(Number(age));
  if (!Number.isFinite(a) || a < 18 || a >= 45) return 0;
  if (a >= 20 && a <= 29) return 110;
  return AGE[a] ?? 0;
}

export const EDUCATION_POINTS = { phd: 150, masters: 135, bachelors: 120, diploma: 98 };

// First official language, per ability (speaking, listening, reading, writing) x 4.
const LANGUAGE_PER_ABILITY = { clb9: 31, clb8: 23, clb7: 17, clb6: 9 };
export const languagePoints = (clb) => 4 * (LANGUAGE_PER_ABILITY[clb] ?? 0);

const langTier = (clb) => (clb === 'clb9' ? 'high' : clb === 'clb7' || clb === 'clb8' ? 'mid' : 'low');

/** Skill transferability: education + language, and foreign work + language; capped at 100. */
export function transferabilityPoints(edu, clb, exp) {
  const tier = langTier(clb);
  const twoOrMore = edu === 'masters' || edu === 'phd';
  const eduPts = tier === 'high' ? (twoOrMore ? 50 : 25) : tier === 'mid' ? (twoOrMore ? 25 : 13) : 0;
  const longExp = exp === '3plus';
  const someExp = exp === '1year' || exp === '2years';
  const expPts = !longExp && !someExp ? 0 : tier === 'high' ? (longExp ? 50 : 25) : tier === 'mid' ? (longExp ? 25 : 13) : 0;
  return Math.min(100, eduPts + expPts);
}

export function crsScore({ age, edu, clb, exp }) {
  const parts = {
    age: agePoints(age),
    education: EDUCATION_POINTS[edu] ?? 0,
    language: languagePoints(clb),
    transferability: transferabilityPoints(edu, clb, exp),
  };
  return { total: parts.age + parts.education + parts.language + parts.transferability, parts };
}

/** Plain-language reading of the score; never promises eligibility. */
export function crsVerdict(total) {
  if (total >= 470) return 'A strong score. Compare it with the cut-off in the latest Express Entry draws.';
  if (total >= 400) return 'A moderate score. It may fit category-based or provincial draws.';
  return 'Below recent general draws. A higher English score is usually the quickest way up, and a WeHive consultant can map your options.';
}

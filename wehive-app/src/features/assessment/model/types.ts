export type Pathway = 'pr' | 'student' | 'us_immigration' | 'australia_pr';

export interface AssessmentCountry {
  id: string;
  name: string;
  flag: string;
}

export const COUNTRIES: AssessmentCountry[] = [
  { id: 'ca', name: 'Canada', flag: '\u{1F1E8}\u{1F1E6}' },
  { id: 'gb', name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}' },
  { id: 'us', name: 'United States', flag: '\u{1F1FA}\u{1F1F8}' },
  { id: 'au', name: 'Australia', flag: '\u{1F1E6}\u{1F1FA}' },
  { id: 'de', name: 'Germany', flag: '\u{1F1E9}\u{1F1EA}' },
];

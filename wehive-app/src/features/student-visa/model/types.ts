export interface StudentCountry {
  id: string;
  name: string;
  code: string;
}

export interface IntakeTime {
  season: string;
  months: string;
  applyBy: string;
  description: string;
  countries: string;
}

export interface RequiredDocument {
  title: string;
  description: string;
}

export interface CourseCategory {
  id: string;
  label: string;
  description: string;
}

export const STUDENT_COUNTRIES: StudentCountry[] = [
  { id: 'us', name: 'United States', code: 'US' },
  { id: 'uk', name: 'United Kingdom', code: 'GB' },
  { id: 'ca', name: 'Canada', code: 'CA' },
  { id: 'au', name: 'Australia', code: 'AU' },
  { id: 'de', name: 'Germany', code: 'DE' },
  { id: 'fr', name: 'France', code: 'FR' },
  { id: 'it', name: 'Italy', code: 'IT' },
  { id: 'es', name: 'Spain', code: 'ES' },
  { id: 'jp', name: 'Japan', code: 'JP' },
  { id: 'sg', name: 'Singapore', code: 'SG' },
  { id: 'ch', name: 'Switzerland', code: 'CH' },
  { id: 'pl', name: 'Poland', code: 'PL' },
];

export const INTAKE_TIMES: IntakeTime[] = [
  { season: 'Fall Intake', months: 'Aug - Sep', applyBy: 'Apr - May', description: 'The biggest intake worldwide. Slot pressure peaks in June-July.', countries: 'US, UK, Germany, Italy, Spain & more' },
  { season: 'Spring Intake', months: 'Jan - Feb', applyBy: 'Sep - Oct', description: 'Smaller cohorts, faster decisions. Great backup if Fall slipped.', countries: 'US, UK, Germany, Italy, Poland & more' },
  { season: 'Summer Intake', months: 'May - Jun', applyBy: 'Feb - Mar', description: 'Niche programs only -- short courses, specific masters.', countries: 'Limited (mostly UK, Spain, Croatia)' },
];

export const REQUIRED_DOCUMENTS: RequiredDocument[] = [
  { title: 'Passport', description: 'Valid for the entire duration of your course, minimum 6 months validity' },
  { title: 'Admission Proof', description: 'I-20 (USA), CAS (UK), or university admission letter (Europe)' },
  { title: 'Financial Proof', description: 'Bank statements, fixed deposits, education loan or sponsor docs' },
  { title: 'Visa Photo', description: 'Recent passport-size photo meeting embassy specifications' },
];

export const COURSE_CATEGORIES: CourseCategory[] = [
  { id: 'stem', label: 'STEM', description: 'Science, Technology, Engineering, Mathematics' },
  { id: 'engineering', label: 'Engineering', description: 'Mechanical, Electrical, Civil, Computer' },
  { id: 'business', label: 'Business', description: 'MBA, Finance, Marketing, Management' },
  { id: 'medicine', label: 'Medicine', description: 'MBBS, Pharmacy, Nursing, Public Health' },
  { id: 'law', label: 'Law', description: 'LLB, LLM, International Law' },
  { id: 'arts', label: 'Arts & Design', description: 'Fine Arts, UX/UI, Film, Architecture' },
];

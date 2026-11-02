export interface SopSection {
  heading: string;
  hint: string;
  target_words: number;
}

export interface SopTemplate {
  id: string;
  title: string;
  country_name: string;
  program_type: string;
  tone: string;
  word_count: number;
  sections: SopSection[];
  tips: string[];
  sample_opening?: string;
  category?: string;
}

export interface SopFilters {
  countries: string[];
  program_types: string[];
  categories: string[];
}

export interface PersonaliseInput {
  template_id: string;
  applicant_name?: string;
  background?: string;
  achievements?: string;
  goals?: string;
  program?: string;
  university_name?: string;
  extra_context?: string;
}

export interface PersonaliseResult {
  template_id: string;
  template_title: string;
  content: string;
  word_count: number;
  sections: SopSection[];
  tips: string[];
}

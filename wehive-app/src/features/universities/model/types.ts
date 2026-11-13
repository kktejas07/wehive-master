export interface University {
  id: string;
  name: string;
  short_name?: string;
  country: string;
  country_name?: string;
  flag?: string;
  city?: string;
  rank?: number;
  qs_rank?: number;
  tuition_usd?: number;
  students?: number;
  logo_url?: string;
  courses?: string[];
  ielts_min?: number;
  toefl_min?: number;
  gre_required?: boolean;
  gmat_required?: boolean;
  acceptance_rate?: number;
  avg_salary_usd?: number;
  scholarships?: boolean;
  intakes?: string[];
  website?: string;
}

export interface UniversityCountry {
  id: string;
  name: string;
  flag?: string;
}

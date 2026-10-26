export interface University {
  id: string;
  name: string;
  short_name?: string;
  country: string;
  country_name?: string;
  flag?: string;
  rank?: number;
  qs_rank?: number;
  times_rank?: number;
  tuition?: number;
  currency?: string;
  students?: number;
  ielts_min?: number;
  toefl_min?: number;
  gre_required?: boolean;
  has_scholarship?: boolean;
  scholarship_details?: string;
  image_url?: string;
  website?: string;
  description?: string;
  programs?: Program[];
  created_at?: string;
  updated_at?: string;
}

export interface Program {
  id: string;
  university_id: string;
  name: string;
  degree?: string;
  duration?: string;
  tuition?: number;
  ielts_min?: number;
  intake_months?: string[];
  scholarship_available?: boolean;
}

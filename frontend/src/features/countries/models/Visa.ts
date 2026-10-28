export type VisaCategory = 'tourist' | 'student' | 'work' | 'business' | 'dependent' | 'transit';

export interface VisaRequirement {
  document: string;
  mandatory: boolean;
  notes?: string;
}

export interface VisaRule {
  id: string;
  country_id: string;
  country_name?: string;
  visa_type: VisaCategory;
  fee: number;
  currency: string;
  validity_days?: number;
  processing_days: number;
  rush_days?: number;
  max_stay_days?: number;
  multiple_entry: boolean;
  requirements: VisaRequirement[];
  notes?: string;
  updated_at?: string;
}

export interface VisaCheckerResult {
  eligible: boolean;
  score?: number;
  visa_type?: VisaCategory;
  recommended_countries?: string[];
  notes?: string;
}

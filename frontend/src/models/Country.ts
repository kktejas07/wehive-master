export interface VisaType {
  type: string;
  fee?: number;
  currency?: string;
  validity_days?: number;
  processing_days?: number;
  rush_days?: number;
  max_stay_days?: number;
  multiple_entry?: boolean;
  documents_required?: string[];
}

export interface Country {
  id: string;
  name: string;
  iso2: string;
  flag?: string;
  region?: string;
  visa_types?: VisaType[];
  appointment_required?: boolean;
  embassy_url?: string;
  decision_time_days?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

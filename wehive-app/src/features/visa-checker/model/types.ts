export interface VisaRequirement {
  country: string;
  iso2?: string;
  flag?: string;
  requirement: string;
  requirement_label: string;
  schengen: boolean;
  note: string | null;
  processing_days?: number;
  fees_inr?: number;
  fees_usd?: number;
  documents?: string[];
}

export interface SherpaTrip {
  destination: { country: string; city?: string };
  nationality: string;
  restrictions?: SherpaRestriction[];
  visa?: SherpaVisa;
}

export interface SherpaRestriction {
  type: string;
  summary: string;
  details?: string;
}

export interface SherpaVisa {
  required: boolean;
  type?: string;
  on_arrival?: boolean;
  e_visa?: boolean;
  notes?: string;
}

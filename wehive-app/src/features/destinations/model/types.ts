/** Model: a destination as /api/countries returns it (after the backend's visa rules). */
export type Requirement =
  | 'visa_free' | 'on_arrival' | 'evisa' | 'evisa_or_on_arrival' | 'visa' | 'restricted' | 'not_applicable';

export interface DecisionTime {
  min_days: number;
  max_days: number;
  label: string;
  short: string;
  basis: 'official' | 'law' | 'estimate';
  metric?: 'processing_time' | 'appointment_wait';
  source_name?: string;
  source_url?: string;
  updated?: string;
}

export interface Processing {
  requirement: Requirement;
  requirement_label: string;
  schengen: boolean;
  parent: string | null;
  note: string | null;
  time: DecisionTime | null;
  requirement_source?: { name: string; url: string; checked: string };
}

export interface VisaCategory {
  name: string;
  fees_inr?: number;
  fees_usd?: number;
  processing_days?: number;
  validity?: string;
  documents?: string[];
}

export interface ApplicantRule {
  text: string;
  basis: 'law' | 'official' | 'source' | 'guidance';
  source_name?: string;
  source_url?: string;
}

export interface Country {
  id: string;
  iso2?: string;
  name: string;
  flag?: string;
  visa_types?: string[];
  categories?: Record<string, VisaCategory>;
  processing?: Processing;
  applicant_rules?: ApplicantRule[];
  application_fee?: number;
  embassy_fee?: number;
  fee_disclaimer?: string;
}

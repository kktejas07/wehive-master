export type ApplicationStatus =
  | 'draft' | 'submitted' | 'docs_pending' | 'payment_pending'
  | 'in_review' | 'embassy' | 'approved' | 'visa_issued' | 'rejected';

export interface ApplicationSummary {
  id: string;
  visa_type: string;
  destination: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  alert?: string;
}

export interface ApplicationDocument {
  id: string;
  name: string;
  type: string;
  url?: string;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  uploaded_at?: string;
}

export interface ApplicationMessage {
  id: string;
  sender: 'user' | 'admin';
  text: string;
  created_at: string;
}

export interface ApplicationDetail extends ApplicationSummary {
  form_data: Record<string, unknown>;
  documents: ApplicationDocument[];
  messages: ApplicationMessage[];
  timeline: { stage: string; date: string; note?: string }[];
  visa_appointment?: { date?: string; location?: string };
}

export interface ApplicationsPage {
  items: ApplicationSummary[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'in_review'
  | 'docs_requested'
  | 'awaiting_docs'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'offered'
  | 'accepted'
  | 'enrolled';

export interface DocumentFile {
  id: string;
  name: string;
  url?: string;
  status: 'pending' | 'uploaded' | 'reviewing' | 'verified' | 'approved' | 'rejected' | 'needs_reupload';
  reason?: string;
  uploaded_at?: string;
  admin_note?: string;
}

export interface UniversitySelection {
  university_id: string;
  program_id?: string;
  university?: { name: string; country: string; country_name?: string; flag?: string; rank?: number };
  program?: { name: string; degree?: string; duration?: string };
  status: ApplicationStatus;
  applied_at?: string;
  offered_at?: string;
  accepted_at?: string;
  deadline?: string;
  notes?: string;
}

export interface Application {
  id: string;
  user_id: string;
  agent_id?: string;
  type: 'university' | 'visa' | 'tourist';
  applicant_name?: string;
  country?: string;
  country_code?: string;
  visa_type?: string;
  purpose?: string;
  status: ApplicationStatus;
  university_name?: string;
  university_selections?: UniversitySelection[];
  documents?: DocumentFile[];
  payment?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    paid_at?: string;
  };
  note?: string;
  visa_valid_from?: string;
  visa_valid_until?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

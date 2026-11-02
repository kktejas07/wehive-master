/** Public tracking (by ID). */
export type TrackingStatus = 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';

export interface TimelineEntry {
  status: TrackingStatus;
  note?: string;
  at?: string;
}

export interface TrackedApplication {
  _id: string;
  status: TrackingStatus;
  country_id: string;
  country_name?: string;
  visa_type: string;
  applicant_name?: string;
  estimated_date?: string;
  timeline: TimelineEntry[];
}

export const STATUS_META: Record<TrackingStatus, { label: string; desc: string }> = {
  draft: { label: 'Draft', desc: 'Application started but not yet submitted' },
  submitted: { label: 'Submitted', desc: 'Your application has been submitted' },
  in_review: { label: 'In Review', desc: 'Under review by the embassy' },
  approved: { label: 'Approved', desc: 'Your visa has been approved' },
  rejected: { label: 'Rejected', desc: 'Your visa was not approved' },
};

export const STATUS_ORDER: TrackingStatus[] = ['draft', 'submitted', 'in_review', 'approved', 'rejected'];

/** Authenticated user application tracking (GET /applications/my). */
export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'visa_processing'
  | 'enrolled';

export interface Application {
  id: string;
  university_name: string;
  program: string;
  country: string;
  status: ApplicationStatus;
  submitted_at: string;
  updated_at: string;
}

export const APP_STATUS_ORDER: ApplicationStatus[] = [
  'submitted',
  'under_review',
  'accepted',
  'visa_processing',
  'enrolled',
];

export const APP_STATUS_META: Record<ApplicationStatus, { label: string; tone: 'info' | 'warning' | 'success' | 'danger' | 'neutral' }> = {
  submitted: { label: 'Submitted', tone: 'info' },
  under_review: { label: 'Under review', tone: 'warning' },
  accepted: { label: 'Accepted', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  visa_processing: { label: 'Visa processing', tone: 'warning' },
  enrolled: { label: 'Enrolled', tone: 'success' },
};

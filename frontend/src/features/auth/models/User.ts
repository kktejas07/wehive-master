export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  city?: string;
  age?: number;
  education_level?: string;
  target_country?: string;
  purpose?: string;
  is_premium: boolean;
  is_staff: boolean;
  staff_role?: 'consultant' | 'document_checker' | 'visa_officer' | 'support';
  email_verified: boolean;
  phone_verified: boolean;
  avatar_url?: string;
  referral_code?: string;
  premium_until?: string;
  last_active?: string;
  created_at: string;
  updated_at: string;
}

export interface StaffWorkload {
  id: string;
  name?: string;
  email: string;
  open_cases: number;
  avg_days: number;
}

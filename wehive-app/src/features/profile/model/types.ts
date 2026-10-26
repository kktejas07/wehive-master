export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  is_premium?: boolean;
  premium_free_left?: number;
  pending_email?: string;
  journey_stage?: string;
  total_applications?: number;
}

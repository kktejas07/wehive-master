/**
 * Types & Interfaces for Unified Analytics System
 */

export type Primitive = string | number | boolean | null | undefined;

export type ElementId = string & { readonly __brand: unique symbol };

export type EventCategory =
  | 'navigation'
  | 'carousel'
  | 'interaction'
  | 'form'
  | 'search'
  | 'ai'
  | 'media'
  | 'error'
  | 'api'
  | 'conversion';

export interface PropertyEnvelope {
  element_id?: string;
  element_type?: string;
  element_label?: string;
  screen?: string;
  screen_path?: string;
  previous_screen?: string;
  surface?: string;
  area?: string;
  session_id?: string;
  platform?: string;
  app_version?: string;
  viewport_w?: number;
  viewport_h?: number;
  breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  orientation?: 'portrait' | 'landscape';
  theme?: string;
  locale?: string;
  user_role?: string;
  is_authenticated?: boolean;
  org_id?: string;
  [key: string]: any;
}

export interface AnalyticsEventPayload {
  name: string;
  properties: PropertyEnvelope;
  timestamp: string;
  category?: EventCategory;
}

export interface UserTraits {
  role?: string;
  org_id?: string;
  campus?: string;
  cohort_year?: string;
  plan_tier?: string;
  is_mentor?: boolean;
  is_alumni?: boolean;
  signup_source?: string;
  locale?: string;
  theme_pref?: string;
  [key: string]: Primitive;
}

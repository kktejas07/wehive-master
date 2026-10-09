/**
 * Canonical Event Constants
 * Total ~25 distinct names to stay well under GA4's 500 event cap.
 */

export const EVENTS = {
  // Generic Events (Property-driven, carried with element_id)
  ELEMENT_CLICK: 'element_click',
  ELEMENT_IMPRESSION: 'element_impression',
  ELEMENT_LONG_PRESS: 'element_long_press',
  SCREEN_VIEW: 'screen_view',
  SCREEN_EXIT: 'screen_exit',
  LIST_INTERACTION: 'list_interaction',
  FORM_START: 'form_start',
  FORM_FIELD_COMPLETE: 'form_field_complete',
  FORM_SUBMIT: 'form_submit',
  FORM_ERROR: 'form_error',
  FLOW_STEP: 'flow_step',
  SEARCH_PERFORMED: 'search_performed',
  MEDIA_INTERACTION: 'media_interaction',
  APP_ERROR: 'app_error',
  API_CALL: 'api_call',
  FEATURE_USED: 'feature_used',

  // Conversion / Key Events (Dedicated names for GA4 key event marking & audiences)
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  ECHO_REGISTRATION_COMPLETE: 'echo_registration_complete',
  JOB_APPLICATION_SUBMIT: 'job_application_submit',
  MENTOR_BOOKING_CONFIRMED: 'mentor_booking_confirmed',
  COUPON_APPLIED: 'coupon_applied',
  AGENTK_SESSION_START: 'agentk_session_start',
  CERTIFICATE_VERIFIED: 'certificate_verified',
  PURCHASE: 'purchase',
  COUNTRY_SELECT: 'country_select',
} as const;

export type AnalyticsEvent = (typeof EVENTS)[keyof typeof EVENTS];

/**
 * Configuration & Thresholds for Analytics, Logging, and Feature Flags
 */

export const CONFIG = {
  APP_NAME: 'We Hive',
  APP_VERSION: '1.4.2',
  SURFACE_NAMESPACE: 'wh', // Product prefix for We Hive

  // Provider Toggles
  ENABLE_FIREBASE: true,
  ENABLE_POSTHOG: true,
  ENABLE_CONSOLE_DEBUG: true,

  // PostHog Configuration
  POSTHOG_KEY: process.env.REACT_APP_POSTHOG_KEY || 'phc_xAvL2Iq4tFmANRE7kzbKwaSqp1HJjN7x48s3vr0CMjs',
  POSTHOG_HOST: process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com',

  // Sampling Rates
  SAMPLING_RATES: {
    api_call: 0.1,         // 10% in production
    list_interaction: 0.1, // 10% in production
    session_replay: 0.2,   // 20% baseline session recording
    logs_info: 0.05,       // 5% info level logs in production
  },

  // Firebase 20 Priority Envelope Keys (strict 25 param cap for GA4)
  FIREBASE_PRIORITY_KEYS: [
    'element_id',
    'element_type',
    'element_label',
    'screen',
    'screen_path',
    'previous_screen',
    'surface',
    'area',
    'session_id',
    'platform',
    'app_version',
    'viewport_w',
    'viewport_h',
    'breakpoint',
    'user_role',
    'is_authenticated',
    'org_id',
    'flow_id',
    'flow_step_name',
    'error_code',
  ],

  // PII Redaction Settings
  MAX_PARAM_STRING_LEN: 100,
  MAX_EVENT_NAME_LEN: 40,

  // Ring Buffer Capacity for Breadcrumbs & Queue
  MAX_BREADCRUMBS: 30,
  QUEUE_FLUSH_INTERVAL_MS: 5000,
  QUEUE_FLUSH_BATCH_SIZE: 10,
};

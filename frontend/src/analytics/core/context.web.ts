/**
 * Web Device & Envelope Context Provider (*.web.ts)
 */

import { PropertyEnvelope } from '../types';
import { CONFIG } from '../config';

let currentSessionId: string | null = null;
let currentScreen = 'home';
let previousScreen = '';
let currentScreenPath = '/';

/**
 * Generates or retrieves a session ID shared across analytics providers
 */
export function getSessionId(): string {
  if (!currentSessionId) {
    currentSessionId = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
  }
  return currentSessionId;
}

/**
 * Updates current screen state stack
 */
export function setScreenContext(screenName: string, path = window.location.pathname) {
  previousScreen = currentScreen;
  currentScreen = screenName;
  currentScreenPath = path;
}

export function getScreenContext() {
  return {
    screen: currentScreen,
    previousScreen,
    screenPath: currentScreenPath,
  };
}

/**
 * Helper to compute responsive breakpoint
 */
export function getBreakpoint(width: number): 'xs' | 'sm' | 'md' | 'lg' | 'xl' {
  if (width < 640) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  return 'xl';
}

/**
 * Builds standard envelope for web target
 */
export function getStandardEnvelope(): PropertyEnvelope {
  const w = window.innerWidth;
  const h = window.innerHeight;

  return {
    session_id: getSessionId(),
    screen: currentScreen,
    screen_path: currentScreenPath || window.location.pathname,
    previous_screen: previousScreen,
    platform: 'web',
    app_version: CONFIG.APP_VERSION,
    viewport_w: w,
    viewport_h: h,
    breakpoint: getBreakpoint(w),
    orientation: w >= h ? 'landscape' : 'portrait',
    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    locale: navigator.language || 'en-US',
    is_authenticated: false,
    user_role: 'guest',
  };
}

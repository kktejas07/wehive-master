/** Backend base URL. Set EXPO_PUBLIC_API_URL per environment (e.g. https://wehive.co.in). */
export const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL ?? 'https://wehive.co.in').replace(/\/+$/, '');
export const API_URL = `${API_ORIGIN}/api`;
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://wehive.co.in').replace(/\/+$/, '');

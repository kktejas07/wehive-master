// Single source of truth for the backend origin. REACT_APP_BACKEND_URL may be
// given with or without a trailing /api; we normalise it to the bare origin.
export const BACKEND_URL = (
  process.env.REACT_APP_BACKEND_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')
).replace(/\/api\/?$/i, '');

export const API = `${BACKEND_URL}/api`;

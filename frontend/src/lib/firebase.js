import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from 'firebase/auth';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

let app = null;
let auth = null;
let _firebaseConfig = null;
let _configLoaded = false;
let _configLoading = null;

async function loadFirebaseConfig() {
  if (_configLoaded) return _firebaseConfig;
  if (_configLoading) return _configLoading;

  _configLoading = (async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/public/firebase-config`);
      const data = await res.json();
      if (data.configured && data.config.apiKey) {
        _firebaseConfig = data.config;
      }
    } catch (e) {
      console.warn('Failed to fetch Firebase config from backend, using defaults', e);
    }
    _configLoaded = true;
    _configLoading = null;
    return _firebaseConfig;
  })();

  return _configLoading;
}

export async function initFirebase() {
  if (app) return { app, auth };

  let config = _firebaseConfig;

  if (!config) {
    config = await loadFirebaseConfig();
  }

  if (!config || !config.apiKey) {
    config = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '',
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.REACT_APP_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || '',
    };
    if (!config.apiKey) {
      console.warn('Firebase not configured. Set Firebase config in Admin → Settings → Firebase Authentication.');
    }
  }

  if (getApps().length === 0) {
    app = initializeApp(config);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);
  return { app, auth };
}

export function getFirebaseAuth() {
  return auth;
}

let _verifier = null;

export function getRecaptchaVerifier(containerId = 'recaptcha-container') {
  if (_verifier) return _verifier;
  if (!auth) throw new Error('Firebase not initialized. Call initFirebase() first.');

  try {
    _verifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {},
    });
    return _verifier;
  } catch (e) {
    console.warn('reCAPTCHA verifier error:', e);
    throw e;
  }
}

export async function sendPhoneOtp(phoneNumber) {
  const verifier = getRecaptchaVerifier();
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
  return confirmationResult;
}

export async function verifyPhoneOtp(confirmationResult, code) {
  const result = await confirmationResult.confirm(code);
  const idToken = await result.user.getIdToken();
  return { user: result.user, idToken };
}

export async function getFirebaseIdToken() {
  if (!auth?.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken(true);
  } catch {
    return null;
  }
}

export { auth };

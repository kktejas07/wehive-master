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
      apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyC9P9sqDVWYDvhxZHcxjzRWUN2O1vZsLRg',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'wehive-28c95.firebaseapp.com',
      projectId: process.env.FIREBASE_PROJECT_ID || 'wehive-28c95',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'wehive-28c95.firebasestorage.app',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '347485814501',
      appId: process.env.FIREBASE_APP_ID || '1:347485814501:web:6260b89640d6f8b9b6de0c',
    };
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

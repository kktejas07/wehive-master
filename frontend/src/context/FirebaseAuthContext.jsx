import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, sendPhoneOtp, verifyPhoneOtp, getRecaptchaVerifier } from '../lib/firebase';
import { firebaseAuth, getFirebaseIdToken } from '../lib/firebase-auth';
import { useAuth } from './AuthContext';
import axios from 'axios';
import { API } from '../lib/apiBase';

const FIREBASE_TOKEN_KEY = 'wehive_firebase_token';

const FirebaseAuthCtx = createContext(null);

export function useFirebaseAuth() {
  const ctx = useContext(FirebaseAuthCtx);
  if (!ctx) throw new Error('useFirebaseAuth must be used within FirebaseAuthProvider');
  return ctx;
}

export function FirebaseAuthProvider({ children }) {
  const { setAuthToken, logout: logoutBackendSession } = useAuth();
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verificationSent, setVerificationSent] = useState(false);
  const [phoneConfirmation, setPhoneConfirmation] = useState(null);

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthChange((user) => {
      setFirebaseUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Throws on failure so callers can surface the error instead of reporting a
  // successful sign-in with no backend session.
  const syncWithBackend = useCallback(async () => {
    const idToken = await getFirebaseIdToken();
    if (!idToken) throw new Error('Could not get a Firebase ID token');

    const res = await axios.post(
      `${API}/auth/firebase-sync`,
      { id_token: idToken }
    );
    const { access_token, user: backendUser } = res.data;
    // Hand the token to AuthContext directly so isAuthed flips immediately —
    // writing only to localStorage left AuthContext's live state stale until
    // the next full page reload (see F1 in playwright/REPORT.md).
    setAuthToken(access_token);
    return { access_token, user: backendUser };
  }, [setAuthToken]);

  const loginWithGoogle = useCallback(async () => {
    const user = await firebaseAuth.google();
    await syncWithBackend();
    return user;
  }, [syncWithBackend]);

  // Email verification now goes through our Postal backend (branded template),
  // not Firebase's default email. Binds the link to this Firebase UID server-side.
  const requestBackendVerification = useCallback(async () => {
    const idToken = await getFirebaseIdToken();
    if (!idToken) throw new Error('Sign in again to resend the verification email');
    await axios.post(`${API}/auth/request-email-verification`, { id_token: idToken });
    setVerificationSent(true);
  }, []);

  // No backend session until the email is verified (firebase-sync rejects unverified accounts).
  const signupWithEmail = useCallback(async (email, password, name) => {
    const user = await firebaseAuth.emailSignup(email, password, name);
    await requestBackendVerification();
    return user;
  }, [requestBackendVerification]);

  const loginWithEmail = useCallback(async (email, password) => {
    const user = await firebaseAuth.emailLogin(email, password);
    try {
      await syncWithBackend();
      // Backend is the source of truth now (Firebase's flag stays false for our links).
      return { emailVerified: true };
    } catch (e) {
      if (e.response?.status === 403 && e.response?.data?.detail?.includes('verif')) {
        await requestBackendVerification();
        return user;
      }
      throw e;
    }
  }, [syncWithBackend, requestBackendVerification]);

  const resendVerification = useCallback(async () => {
    await requestBackendVerification();
  }, [requestBackendVerification]);

  const sendPasswordReset = useCallback(async (email) => {
    await firebaseAuth.sendPasswordReset(email);
  }, []);

  const logout = useCallback(async () => {
    await firebaseAuth.logout();
    logoutBackendSession();
  }, [logoutBackendSession]);

  const phoneOtp = useCallback(async (phoneNumber) => {
    const verifier = getRecaptchaVerifier();
    const confirmation = await sendPhoneOtp(phoneNumber);
    setPhoneConfirmation(confirmation);
    return { sent: true, masked: phoneNumber.slice(0, 3) + '****' + phoneNumber.slice(-2) };
  }, []);

  const verifyPhoneOtpCode = useCallback(async (code, { name, referralCode } = {}) => {
    if (!phoneConfirmation) throw new Error('No OTP sent');
    const { user, idToken } = await verifyPhoneOtp(phoneConfirmation, code);
    setPhoneConfirmation(null);
    // Phone-only Firebase users have no email, which /auth/firebase-sync rejects;
    // /auth/firebase-phone-sync keys the account on the verified phone number.
    const res = user?.email
      ? await axios.post(`${API}/auth/firebase-sync`, { id_token: idToken })
      : await axios.post(`${API}/auth/firebase-phone-sync`, {
        id_token: idToken,
        name: name || user?.displayName || undefined,
        referral_code: referralCode || undefined,
      });
    const { access_token, user: backendUser } = res.data;
    setAuthToken(access_token);
    return { access_token, user: backendUser };
  }, [phoneConfirmation, setAuthToken]);

  const value = {
    firebaseUser,
    loading,
    isVerified: firebaseUser?.emailVerified ?? false,
    verificationSent,
    loginWithGoogle,
    signupWithEmail,
    loginWithEmail,
    resendVerification,
    sendPasswordReset,
    logout,
    syncWithBackend,
    phoneOtp,
    verifyPhoneOtpCode,
  };

  return (
    <FirebaseAuthCtx.Provider value={value}>
      {children}
    </FirebaseAuthCtx.Provider>
  );
}
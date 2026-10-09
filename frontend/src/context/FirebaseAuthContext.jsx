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

  const syncWithBackend = useCallback(async (user) => {
    try {
      const idToken = await getFirebaseIdToken();
      if (!idToken) return null;

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
    } catch (_e) {
      return null;
    }
  }, [setAuthToken]);

  const loginWithGoogle = useCallback(async () => {
    const user = await firebaseAuth.google();
    await syncWithBackend(user);
    return user;
  }, [syncWithBackend]);

  const signupWithEmail = useCallback(async (email, password, name) => {
    const user = await firebaseAuth.emailSignup(email, password, name);
    setVerificationSent(true);
    await syncWithBackend(user);
    return user;
  }, [syncWithBackend]);

  const loginWithEmail = useCallback(async (email, password) => {
    const user = await firebaseAuth.emailLogin(email, password);
    if (!user.emailVerified) {
      await firebaseAuth.sendVerification(user);
      setVerificationSent(true);
    }
    await syncWithBackend(user);
    return user;
  }, [syncWithBackend]);

  const resendVerification = useCallback(async () => {
    if (firebaseUser) {
      await firebaseAuth.sendVerification(firebaseUser);
      setVerificationSent(true);
    }
  }, [firebaseUser]);

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
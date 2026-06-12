import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();

export const firebaseAuth = {
  google: async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  },

  emailSignup: async (email, password, name) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await sendEmailVerification(result.user);
    return result.user;
  },

  emailLogin: async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  },

  sendVerification: async (user) => {
    await sendEmailVerification(user);
  },

  logout: async () => {
    await signOut(auth);
  },

  onAuthChange: (callback) => {
    return onAuthStateChanged(auth, callback);
  },
};

export const getFirebaseIdToken = async () => {
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return null;
};
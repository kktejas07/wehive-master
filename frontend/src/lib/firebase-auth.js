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
import { initFirebase, getFirebaseAuth, getFirebaseIdToken } from './firebase';

let _auth = null;

async function ensureAuth() {
  if (!_auth) {
    const { auth } = await initFirebase();
    _auth = auth;
  }
  return _auth;
}

const googleProvider = new GoogleAuthProvider();

export const firebaseAuth = {
  google: async () => {
    const auth = await ensureAuth();
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  },

  emailSignup: async (email, password, name) => {
    const auth = await ensureAuth();
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await sendEmailVerification(result.user);
    return result.user;
  },

  emailLogin: async (email, password) => {
    const auth = await ensureAuth();
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  },

  sendVerification: async (user) => {
    await sendEmailVerification(user);
  },

  logout: async () => {
    const auth = await ensureAuth();
    await signOut(auth);
  },

  onAuthChange: (callback) => {
    ensureAuth().then((auth) => {
      onAuthStateChanged(auth, callback);
    });
  },
};

export { getFirebaseIdToken };

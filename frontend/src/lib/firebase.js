import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyC9P9sqDVWYDvhxZHcxjzRWUN2O1vZsLRg',
  authDomain: 'wehive-28c95.firebaseapp.com',
  projectId: 'wehive-28c95',
  storageBucket: 'wehive-28c95.firebasestorage.app',
  messagingSenderId: '347485814501',
  appId: '1:347485814501:web:6260b89640d6f8b9b6de0c',
  measurementId: 'G-1SB0PE2Z5B',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
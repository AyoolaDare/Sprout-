'use client';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  User,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {app} from './firebase';

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function signUpWithEmailPassword(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
}

export function signInWithEmailPassword(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
}

export function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export async function signOut() {
  // Clear client-side auth state
  await firebaseSignOut(auth);
  // Request server to clear the session cookie
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch (error) {
    console.error('Failed to clear session cookie on server:', error);
  }
}

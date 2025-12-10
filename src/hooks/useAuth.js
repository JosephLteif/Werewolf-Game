import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const signInWithGoogle = async () => {
    try {
      await setPersistence(auth, browserLocalPersistence); // Set persistence for Google sign-in
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Auth failed:', err);
      setError('Google Auth Error: ' + err.message);
    }
  };

  const signInAsGuest = async () => {
    try {
      await setPersistence(auth, browserLocalPersistence); // Set persistence for anonymous sign-in
      await signInAnonymously(auth);
    } catch (err) {
      console.error('Anonymous Auth failed:', err);
      if (err.code === 'auth/admin-restricted-operation') {
        setError(
          "Enable 'Anonymous' sign-in in Firebase Console > Authentication > Sign-in method."
        );
      } else {
        setError('Auth Error: ' + err.message);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, error, loading, signInWithGoogle, signInAsGuest };
}

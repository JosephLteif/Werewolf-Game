import { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth failed:", err);
        if (err.code === 'auth/admin-restricted-operation') {
          setError("Enable 'Anonymous' sign-in in Firebase Console > Authentication > Sign-in method.");
        } else {
          setError("Auth Error: " + err.message);
        }
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const resetIdentity = async () => {
    await signOut(auth);
    window.location.reload();
  };

  return { user, error, resetIdentity };
}

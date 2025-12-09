import { Moon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function AuthScreen({ errorMsg, version, setAuthMethodChosen }) {
  const { signInWithGoogle, signInAsGuest } = useAuth();

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
    setAuthMethodChosen(true);
  };

  const handleGuestSignIn = async () => {
    await signInAsGuest();
    setAuthMethodChosen(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 space-y-6">
      <div className="text-center space-y-2">
        <img src="/favicon.png" alt="Nightfall Logo" className="mx-auto w-24 h-auto" />{' '}
        <h1 className="text-5xl font-black tracking-tighter text-indigo-500 flex items-center justify-center gap-3">
          NIGHTFALL
        </h1>
        <p className="text-slate-400">Welcome</p>
      </div>

      <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-slate-700 space-y-4">
        {errorMsg && (
          <div className="bg-red-900/50 text-red-200 p-3 rounded text-sm text-center">
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12.24 12.24v2.54h6.05c-.24 1.25-1.4 3.73-6.05 3.73-3.66 0-6.64-3.04-6.64-6.76s2.98-6.76 6.64-6.76c3.27 0 5.43 2.1 5.86 4.01l2.42-.51c-1.46-2.9-4.2-5.06-8.28-5.06-4.94 0-8.98 4.09-8.98 9.17s4.04 9.17 8.98 9.17c5.29 0 8.78-3.93 8.78-8.89 0-.61-.06-1.19-.17-1.74H12.24z" />
          </svg>
          Sign in with Google
        </button>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-700"></div>
          <span className="flex-shrink mx-4 text-slate-600 text-xs">OR</span>
          <div className="flex-grow border-t border-slate-700"></div>
        </div>

        <button
          onClick={handleGuestSignIn}
          className="w-full bg-gray-600 hover:bg-gray-500 py-3 rounded-lg font-bold"
        >
          Continue as Guest
        </button>
      </div>

      <div className="text-center text-xs text-slate-500 absolute bottom-4">
        <p>Version: {version}</p>
        <p>Copyright (c) 2025 Joseph Lteif. All Rights Reserved.</p>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';

export default function LogoutButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsOpen(false);
      // Optionally, redirect to auth screen or show a message
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) {
    return null; // Don't render if no user is logged in
  }

  const displayName = user.displayName || (user.isAnonymous ? 'Guest' : user.email || 'User');
  const avatarLetter = displayName ? displayName[0].toUpperCase() : '?';

  return (
    <div className="relative">
      <button
        className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-lg"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="User Avatar" className="w-full h-full rounded-full" />
        ) : (
          avatarLetter
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-slate-700 rounded-md shadow-lg py-1 z-50">
          <div className="block px-4 py-2 text-sm text-slate-200 border-b border-slate-600">
            Signed in as <span className="font-bold">{displayName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left flex items-center px-4 py-2 text-sm text-red-300 hover:bg-slate-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

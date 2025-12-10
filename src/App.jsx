import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

import { useAuth } from './hooks/useAuth';
import { useGlobalStats } from './hooks/useGlobalStats';
import { setupGlobalPresence } from './services/presence';
import { version } from '../package.json';

import HomeScreen from './pages/HomeScreen';
import AuthScreen from './pages/AuthScreen';
import RoomSelectionScreen from './pages/RoomSelectionScreen';
import GamePage from './pages/GamePage';
import { createRoom as createRoomRT, joinRoom as joinRoomRT } from './services/rooms';


function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
}

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { onlineUsers, activeRooms } = useGlobalStats();

  useEffect(() => {
    if (user) {
      setupGlobalPresence(user);
      if (user.isAnonymous && !playerName) {
        setPlayerName(`Guest-${user.uid.substring(0, 5)}`);
      } else if (user.displayName && !playerName) {
        setPlayerName(user.displayName);
      }
    }
  }, [user, playerName]);

  const createRoom = async () => {
    if (!user) return setErrorMsg('Waiting for connection...');
    if (!playerName) return setErrorMsg('Enter your name first!');

    try {
      const color = `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
      const code = await createRoomRT({ id: user.uid, name: playerName, avatarColor: color });
      navigate(`/room/${code}`);
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to create room. ' + (e.message || e));
    }
  };

  const joinRoom = async () => {
    if (!user) return setErrorMsg('Waiting for connection...');
    if (!playerName) return setErrorMsg('Enter your name first!');
    if (!roomCode) return setErrorMsg('Enter a room code!');

    const code = roomCode.toUpperCase();
    try {
      await joinRoomRT(code, {
        id: user.uid,
        name: playerName,
        avatarColor: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
      });
      navigate(`/room/${code}`);
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to join. ' + (e.message || e));
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="relative">
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="w-full h-full">
            <Routes location={location}>
              <Route path="/" element={<HomeScreen onPlayNow={() => navigate('/room-selection')} version={version} />} />
              <Route path="/auth" element={user ? <Navigate to="/room-selection" /> : <AuthScreen errorMsg={errorMsg} version={version} setAuthMethodChosen={() => {}} />} />
              <Route
                path="/room-selection"
                element={
                  <PrivateRoute>
                    <RoomSelectionScreen
                      playerName={playerName}
                      setPlayerName={setPlayerName}
                      roomCode={roomCode}
                      setRoomCode={setRoomCode}
                      joinRoom={joinRoom}
                      createRoom={createRoom}
                      user={user}
                      onlineUsers={onlineUsers}
                      activeRooms={activeRooms}
                      version={version}
                    />
                  </PrivateRoute>
                }
              />
              <Route
                path="/room/:roomCode"
                element={
                  <PrivateRoute>
                    <GamePage />
                  </PrivateRoute>
                }
              />
            </Routes>
          </div>
      </div>
      <div className="fixed bottom-4 left-4 z-50 p-2">
        <a
          href="https://www.buymeacoffee.com/JosephLteif"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition-colors duration-200"
        >
          Support me 🐺
        </a>
      </div>
    </div>
  );
}
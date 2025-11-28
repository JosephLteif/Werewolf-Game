import { useState, useEffect } from 'react';
import { subscribeToRoom } from '../services/rooms';

export function useGameState(user, roomCode, joined) {
  const [gameState, setGameState] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !roomCode || !joined) return;

    const unsubscribe = subscribeToRoom(roomCode, (data) => {
      if (data) {
        setGameState(data);
        if (data.hostId === user.uid) {
          setIsHost(true);
        }
      } else {
        setError("Room closed or does not exist.");
        setGameState(null);
      }
    });

    return () => unsubscribe();
  }, [user, roomCode, joined]);

  return { gameState, isHost, error };
}

import { useState, useEffect } from 'react';
import { subscribeToRoom, updateRoom } from '../services/rooms';
import GameState from '../models/GameState'; // Import GameState class

export function useGameState(user, roomCode, joined) {
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !roomCode || !joined) return;

    const unsubscribe = subscribeToRoom(roomCode, (data) => {
      if (data) {
        // Instantiate GameState class with data and the updateGameCallback
        setGameState(new GameState(data, (updates) => updateRoom(roomCode, updates)));
      } else {
        setError("Room closed or does not exist.");
        setGameState(null);
      }
    });

    return () => unsubscribe();
  }, [user, roomCode, joined]);

  // isHost will now be derived from gameState if it exists
  const isHost = gameState ? gameState.isHost(user.uid) : false;

  return { gameState, isHost, error };
}

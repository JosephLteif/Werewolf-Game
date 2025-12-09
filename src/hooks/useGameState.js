import { useState, useEffect } from 'react';
import { subscribeToRoom, updateRoom, claimHostIfAvailable } from '../services/rooms';
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
        setError('Room closed or does not exist.');
        setGameState(null);
      }
    });

    return () => unsubscribe();
  }, [user, roomCode, joined]);

  // Monitor host presence and perform migration if needed
  useEffect(() => {
    if (!gameState || !user?.uid || !roomCode) return; // Ensure user.uid is available

    const hostId = gameState.hostId;
    const players = gameState.players; // uses the getter which is an array
    const hostExistsInPlayersList = players.some((p) => p.id === hostId);

    // If the host is no longer in the players list OR is explicitly offline, try to claim host
    if (
      !hostExistsInPlayersList ||
      (hostExistsInPlayersList && players.find((p) => p.id === hostId).isOnline === false)
    ) {
      // Use user.uid directly
      claimHostIfAvailable(roomCode, user.uid);
    }
  }, [gameState, user?.uid, roomCode]); // Depend on user.uid

  // isHost will now be derived from gameState if it exists and user.uid is available
  const isHost = gameState && user?.uid ? gameState.isHost(user.uid) : false;

  return { gameState, isHost, error };
}

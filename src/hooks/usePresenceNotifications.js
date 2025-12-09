import { useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';

export function usePresenceNotifications(gameState) {
  const { info, warning, error, success } = useToast();

  // Store previous values to detect changes
  const prevPlayersRef = useRef({});
  const prevHostIdRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip notifications on initial load/mount
    if (isFirstRender.current) {
      if (gameState) {
        prevPlayersRef.current = gameState.players.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        prevHostIdRef.current = gameState.hostId;
        isFirstRender.current = false;
      }
      return;
    }

    if (!gameState) return;

    // 1. Host Migration Detection
    if (prevHostIdRef.current && prevHostIdRef.current !== gameState.hostId) {
      const newHost = gameState.findPlayer(gameState.hostId);
      if (newHost) {
        info(`Host changed to ${newHost.name}`);
      }
    }
    prevHostIdRef.current = gameState.hostId;

    // 2. Player Joins/Leaves/Reconnects
    const currentPlayersMap = gameState.players.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
    const prevPlayersMap = prevPlayersRef.current;

    // Iterate over previous players to detect leaves and disconnections
    Object.keys(prevPlayersMap).forEach((prevId) => {
      const prevPlayer = prevPlayersMap[prevId];
      const currentPlayer = currentPlayersMap[prevId];

      if (!currentPlayer) {
        // Player is no longer in the current game state, they have left.
        error(`${prevPlayer.name} left the game`);
      } else if (prevPlayer.isOnline !== currentPlayer.isOnline) {
        // Player is still in the game state, but their online status changed.
        if (currentPlayer.isOnline) {
          success(`${currentPlayer.name} reconnected`);
        } else {
          warning(`${currentPlayer.name} disconnected`);
        }
      }
    });

    // Iterate over current players to detect new joins
    gameState.players.forEach((player) => {
      const prevPlayer = prevPlayersMap[player.id];
      if (!prevPlayer) {
        // Player is in current game state but not in previous, they have joined.
        info(`${player.name} joined the lobby`);
      }
    });

    prevPlayersRef.current = currentPlayersMap;
  }, [gameState, info, warning, error, success]);
}

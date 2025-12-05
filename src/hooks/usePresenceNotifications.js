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

    // Check for new players (Joins)
    gameState.players.forEach((player) => {
      const prevPlayer = prevPlayersMap[player.id];

      if (!prevPlayer) {
        // New player joined
        info(`${player.name} joined the lobby`);
      } else {
        // Existing player, check status changes
        if (prevPlayer.isOnline !== player.isOnline) {
          if (player.isOnline) {
            success(`${player.name} reconnected`);
          } else {
            warning(`${player.name} disconnected`);
          }
        }
      }
    });

    // Check for removed players (Leaves/Kicks)
    Object.keys(prevPlayersMap).forEach((prevId) => {
      if (!currentPlayersMap[prevId]) {
        const leftPlayer = prevPlayersMap[prevId];
        error(`${leftPlayer.name} left the game`);
      }
    });

    prevPlayersRef.current = currentPlayersMap;
  }, [gameState, info, warning, error, success]);
}

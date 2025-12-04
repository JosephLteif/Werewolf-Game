import { useMemo } from 'react';
import { PHASES } from '../constants';
import { ROLE_IDS } from '../constants/roleIds';

export const useGameEngine = (gameState, players, user) => {
  const myPlayer = useMemo(() => {
    return players.find((p) => p.id === user?.uid);
  }, [players, user]);

  const amAlive = useMemo(() => {
    return myPlayer?.isAlive;
  }, [myPlayer]);

  const isMyTurn = useMemo(() => {
    if (!myPlayer || !gameState) return false;

    return (
      (gameState.phase === PHASES.NIGHT_CUPID && myPlayer.role === ROLE_IDS.CUPID) ||
      (gameState.phase === PHASES.NIGHT_WEREWOLF && myPlayer.role === ROLE_IDS.WEREWOLF) ||
      (gameState.phase === PHASES.NIGHT_MINION && myPlayer.role === ROLE_IDS.MINION) ||
      (gameState.phase === PHASES.NIGHT_SORCERER && myPlayer.role === ROLE_IDS.SORCERER) ||
      (gameState.phase === PHASES.NIGHT_DOCTOR && myPlayer.role === ROLE_IDS.DOCTOR) ||
      (gameState.phase === PHASES.NIGHT_SEER && myPlayer.role === ROLE_IDS.SEER) ||
      (gameState.phase === PHASES.NIGHT_MASON && myPlayer.role === ROLE_IDS.MASON) ||
      (gameState.phase === PHASES.NIGHT_VIGILANTE && myPlayer.role === ROLE_IDS.VIGILANTE) ||
      (gameState.phase === PHASES.NIGHT_DOPPELGANGER && myPlayer.role === ROLE_IDS.DOPPELGANGER)
    );
  }, [gameState, myPlayer]);

  const actions = {}; // Placeholder for future actions

  return { myPlayer, amAlive, isMyTurn, actions };
};

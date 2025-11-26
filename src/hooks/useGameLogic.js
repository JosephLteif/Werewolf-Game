import { assignRolesAndStartGame, markPlayerReady } from '../services/roles';
import { startNight, advanceNight, resolveNight, handleHunterShot } from '../services/nightActions';
import { castPlayerVote, lockPlayerVote, resolveDayVoting } from '../services/voting';

export function useGameLogic(
  gameState,
  updateGame,
  players,
  user,
  isHost,
  now
) {
  const startGame = async () => {
    await assignRolesAndStartGame(gameState, updateGame, players, isHost);
  };

  const markReady = async () => {
    await markPlayerReady(players, user, gameState, updateGame);
  };

  const startNightPhase = async () => {
    await startNight(gameState, updateGame, players, now);
  };

  const advanceNightPhase = async (actionType, actionValue) => {
    await advanceNight(gameState, updateGame, players, now, actionType, actionValue);
  };

  const resolveNightPhase = async (finalActions) => {
    await resolveNight(gameState, updateGame, players, finalActions);
  };

  const handleHunterShotAction = async (targetId) => {
    await handleHunterShot(gameState, updateGame, players, targetId);
  };

  const castVote = async (targetId) => {
    await castPlayerVote(gameState, updateGame, user, targetId);
  };

  const lockVote = async () => {
    await lockPlayerVote(gameState, updateGame, players, user);
  };

  const resolveVoting = async () => {
    await resolveDayVoting(gameState, updateGame, players);
  };

  return {
    startGame,
    markReady,
    startNightPhase,
    advanceNightPhase,
    resolveNightPhase,
    handleHunterShotAction,
    castVote,
    lockVote,
    resolveVoting,
  };
}

import { assignRolesAndStartGame, markPlayerReady } from './roles';
import { GameValidator } from '../utils/GameValidator';
import { startNight, advanceNight, resolveNight, handleHunterShot } from './nightActions';
import { castPlayerVote, lockPlayerVote, resolveDayVoting } from './voting';

export function coreGameActions(gameState, players, user, isHost, now) {
  const startGame = async () => {
    const { isValid, errors } = GameValidator.validate(players, gameState.settings);
    if (!isValid) {
      throw new Error(errors.join('\n'));
    }
    await assignRolesAndStartGame(gameState, players, isHost);
  };

  const markReady = async () => {
    await markPlayerReady(players, user, gameState);
  };

  const startNightPhase = async () => {
    await startNight(gameState, players, now);
  };

  const advanceNightPhase = async (actionType, actionValue, extraPayload) => {
    await advanceNight(gameState, players, now, actionType, actionValue, extraPayload);
  };

  const resolveNightPhase = async (finalActions) => {
    await resolveNight(gameState, players, finalActions);
  };

  const handleHunterShotAction = async (targetId) => {
    await handleHunterShot(gameState, players, targetId);
  };

  const castVote = async (targetId) => {
    await castPlayerVote(gameState, user, targetId);
  };

  const lockVote = async () => {
    await lockPlayerVote(gameState, players, user);
  };

  const resolveVoting = async () => {
    await resolveDayVoting(gameState, players);
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

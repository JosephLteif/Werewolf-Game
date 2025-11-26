import { ROLES } from '../constants';
import { PHASES } from '../constants';

export const getAlivePlayers = (players) => {
  return players.filter((p) => p.isAlive);
};

export const findPlayerById = (players, userId) => {
  return players.find((p) => p.id === userId);
};

export const getPlayersByRole = (players, roleId) => {
  return players.filter((p) => p.role === roleId && p.isAlive);
};

export const checkWin = (currentPlayers, gameState, updateGame) => {
  const activePlayers = getAlivePlayers(currentPlayers);

  const activeWolves = activePlayers.filter(
    (p) => p.role === ROLES.WEREWOLF.id
  ).length;
  const good = activePlayers.filter(
    (p) =>
      p.role !== ROLES.WEREWOLF.id &&
      p.role !== ROLES.JESTER.id &&
      p.role !== ROLES.TANNER.id
  ).length; // Jester and Tanner don't count towards good win conditions

  // Lovers Win: Only lovers alive
  if (gameState.lovers && gameState.lovers.length === 2) {
    const loversAlive =
      activePlayers.filter(
        (p) => gameState.lovers.includes(p.id)
      ).length === 2;
    const othersAlive = activePlayers.filter(
      (p) => !gameState.lovers.includes(p.id)
    ).length;
    if (loversAlive && othersAlive === 0) {
      updateGame({
        players: currentPlayers,
        winner: 'LOVERS',
        winners: [...(gameState.winners || []), 'LOVERS'],
        phase: PHASES.GAME_OVER,
      });
      return true;
    }
  }

  // Werewolves win if they are equal to or more than good players
  if (activeWolves >= good) {
    updateGame({
      players: currentPlayers,
      winner: 'WEREWOLVES',
      winners: [...(gameState.winners || []), 'WEREWOLVES'],
      phase: PHASES.GAME_OVER,
    });
    return true;
  }

  // Villagers win if all werewolves are eliminated
  if (activeWolves === 0) {
    updateGame({
      players: currentPlayers,
      winner: 'VILLAGERS',
      winners: [...(gameState.winners || []), 'VILLAGERS'],
      phase: PHASES.GAME_OVER,
    });
    return true;
  }

  return false;
};

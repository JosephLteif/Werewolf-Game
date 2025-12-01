import { PHASES } from '../constants';
import { assignRoles } from '../utils/gameLogic';

export const assignRolesAndStartGame = async (gameState, players, isHost) => {
  if (!isHost) return;
  const settings = gameState.settings;

  // Use shared assignRoles utility to assign roles and initialize players
  const newPlayers = assignRoles(players, settings);

  // Init Vigilante Ammo
  const vigAmmo = {};
  newPlayers.forEach((p) => {
    if (p.role === 'vigilante') vigAmmo[p.id] = 1;
  });

  await gameState.update({
    players: newPlayers,
    vigilanteAmmo: vigAmmo,
    lovers: [],
    phase: PHASES.ROLE_REVEAL,
  });
  await gameState.addDayLog('Night is approaching...');
};

export const markPlayerReady = async (players, user, gameState) => {
  const newPlayers = players.map((p) => (p.id === user.uid ? { ...p, ready: true } : p));

  const allReady = newPlayers.every((p) => p.ready || !p.isAlive);

  await gameState.update({
    players: newPlayers,
    phase: allReady ? PHASES.NIGHT_INTRO : gameState.phase,
  });
};

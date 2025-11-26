import { ROLES, PHASES } from '../constants';
import { assignRoles } from '../utils/gameLogic';

export const assignRolesAndStartGame = async (
  gameState,
  updateGame,
  players,
  isHost
) => {
  if (!isHost) return;
  const settings = gameState.settings;

  // Use shared assignRoles utility to assign roles and initialize players
  const newPlayers = assignRoles(players, settings);

  // Init Vigilante Ammo
  const vigAmmo = {};
  newPlayers.forEach((p) => {
    if (p.role === ROLES.VIGILANTE.id) vigAmmo[p.id] = 1;
  });

  await updateGame({
    players: newPlayers,
    vigilanteAmmo: vigAmmo,
    lovers: [],
    phase: PHASES.ROLE_REVEAL,
    dayLog: 'Night is approaching...',
  });
};

export const markPlayerReady = async (players, user, gameState, updateGame) => {
  const newPlayers = players.map((p) =>
    p.id === user.uid ? { ...p, ready: true } : p
  );

  const allReady = newPlayers.every((p) => p.ready || !p.isAlive);

  await updateGame({
    players: newPlayers,
    phase: allReady ? PHASES.NIGHT_INTRO : gameState.phase,
  });
};
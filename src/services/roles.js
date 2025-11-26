import { ROLES, PHASES } from '../constants';

export const assignRolesAndStartGame = async (
  gameState,
  updateGame,
  players,
  isHost
) => {
  if (!isHost) return;
  const settings = gameState.settings;

  const activePlayers = [...players];

  let deck = [];
  for (let i = 0; i < settings.wolfCount; i++) deck.push(ROLES.WEREWOLF.id);

  // Add selected special roles
  if (settings.activeRoles[ROLES.DOCTOR.id]) deck.push(ROLES.DOCTOR.id);
  if (settings.activeRoles[ROLES.SEER.id]) deck.push(ROLES.SEER.id);
  if (settings.activeRoles[ROLES.HUNTER.id]) deck.push(ROLES.HUNTER.id);
  if (settings.activeRoles[ROLES.JESTER.id]) deck.push(ROLES.JESTER.id);
  if (settings.activeRoles[ROLES.VIGILANTE.id]) deck.push(ROLES.VIGILANTE.id);
  if (settings.activeRoles[ROLES.SORCERER.id]) deck.push(ROLES.SORCERER.id);
  if (settings.activeRoles[ROLES.MINION.id]) deck.push(ROLES.MINION.id);
  if (settings.activeRoles[ROLES.LYCAN.id]) deck.push(ROLES.LYCAN.id);
  if (settings.activeRoles[ROLES.CUPID.id]) deck.push(ROLES.CUPID.id);
  if (settings.activeRoles[ROLES.DOPPELGANGER.id])
    deck.push(ROLES.DOPPELGANGER.id);
  if (settings.activeRoles[ROLES.TANNER.id]) deck.push(ROLES.TANNER.id);
  if (settings.activeRoles[ROLES.MAYOR.id]) deck.push(ROLES.MAYOR.id);
  if (settings.activeRoles[ROLES.MASON.id]) {
    deck.push(ROLES.MASON.id);
    deck.push(ROLES.MASON.id);
  }

  // Fill rest with Villagers
  while (deck.length < activePlayers.length) deck.push(ROLES.VILLAGER.id);

  // Shuffle
  deck = deck.sort(() => Math.random() - 0.5);

  // Assign to players
  const newPlayers = players.map((p) => {
    const role = deck.pop() || ROLES.VILLAGER.id;
    return {
      ...p,
      role,
      isAlive: true,
      ready: false,
    };
  });

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
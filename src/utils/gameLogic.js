import { PHASES } from '../constants';

/**
 * Assigns roles to players at the start of the game
 */
export function assignRoles(players, settings) {
  let deck = [];

  // Add werewolves
  for (let i = 0; i < settings.wolfCount; i++) {
    deck.push('werewolf');
  }

  // Add selected special roles
  if (settings.activeRoles['doctor']) deck.push('doctor');
  if (settings.activeRoles['seer']) deck.push('seer');
  if (settings.activeRoles['hunter']) deck.push('hunter');
  if (settings.activeRoles['vigilante']) deck.push('vigilante');
  if (settings.activeRoles['sorcerer']) deck.push('sorcerer');
  if (settings.activeRoles['minion']) deck.push('minion');
  if (settings.activeRoles['lycan']) deck.push('lycan');
  if (settings.activeRoles['cupid']) deck.push('cupid');
  if (settings.activeRoles['doppelganger']) deck.push('doppelganger');
  if (settings.activeRoles['tanner']) deck.push('tanner');
  if (settings.activeRoles['mayor']) deck.push('mayor');
  if (settings.activeRoles['mason']) {
    deck.push('mason');
    deck.push('mason');
  }

  // Fill remaining slots with Villagers
  while (deck.length < players.length) {
    deck.push('villager');
  }

  // Shuffle
  deck = deck.sort(() => Math.random() - 0.5);

  // Assign
  return players.map((p) => ({
    ...p,
    role: deck.pop() || 'villager',
    isAlive: true,
    ready: false,
  }));
}

export function determineFirstNightPhase(players, gameState) {
  if (
    players.some((p) => p.role === 'doppelganger' && p.isAlive) &&
    !gameState.doppelgangerPlayerId
  ) {
    return PHASES.NIGHT_DOPPELGANGER;
  } else if (
    players.some((p) => p.role === 'cupid' && p.isAlive) &&
    (!gameState.lovers || gameState.lovers.length === 0)
  ) {
    return PHASES.NIGHT_CUPID;
  } else {
    return PHASES.NIGHT_WEREWOLF;
  }
}

export function handleDoppelgangerTransformation(
  players,
  doppelgangerPlayerId,
  doppelgangerTargetId,
  victimId
) {
  // If the chosen target is not the victim, or no target/victim, or doppelganger has no target, no transformation
  if (
    !doppelgangerPlayerId ||
    !doppelgangerTargetId ||
    !victimId ||
    doppelgangerTargetId !== victimId
  ) {
    return players;
  }

  const doppelganger = players.find((p) => p.id === doppelgangerPlayerId && p.isAlive);
  const chosenTarget = players.find((p) => p.id === doppelgangerTargetId);

  if (doppelganger && chosenTarget) {
    // Return a new players array with the doppelganger's role updated
    return players.map((p) => {
      if (p.id === doppelganger.id) {
        return { ...p, role: chosenTarget.role };
      }
      return p;
    });
  }
  return players; // No transformation or player not found, return original players
}

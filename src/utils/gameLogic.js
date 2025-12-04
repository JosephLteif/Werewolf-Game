import { PHASES } from '../constants';
import { roleRegistry } from '../roles/RoleRegistry';
import { ROLE_IDS } from '../constants/roleIds';

/**
 * Assigns roles to players at the start of the game by building a deck
 * from the active roles in settings and dealing them out.
 */
export function assignRoles(players, settings) {
  let deck = [];

  // Use wolfCount for werewolves
  for (let i = 0; i < settings.wolfCount; i++) {
    deck.push(ROLE_IDS.WEREWOLF);
  }

  // Iterate through all registered roles to add active ones to the deck
  roleRegistry.getAllRoles().forEach((role) => {
    // Werewolves are handled above, and Villagers are used as filler.
    if (role.id === ROLE_IDS.WEREWOLF || role.id === ROLE_IDS.VILLAGER) {
      return;
    }

    if (settings.activeRoles[role.id]) {
      if (role.id === ROLE_IDS.MASON) {
        // Masons always come in pairs.
        deck.push(ROLE_IDS.MASON);
        deck.push(ROLE_IDS.MASON);
      } else {
        deck.push(role.id);
      }
    }
  });

  // Fill the rest of the deck with Villagers to match the player count.
  while (deck.length < players.length) {
    deck.push(ROLE_IDS.VILLAGER);
  }

  // Shuffle the deck to randomize role assignment.
  deck = deck.sort(() => Math.random() - 0.5);

  // Assign the shuffled roles to players.
  return players.map((p) => ({
    ...p,
    role: deck.pop() || ROLE_IDS.VILLAGER, // Fallback to Villager
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

import { PHASES } from '../constants';
import { roleRegistry } from '../roles/RoleRegistry';
import { ROLE_IDS } from '../constants/roleIds';

/**
 * Shuffles an array in place using the Fisher-Yates (Knuth) algorithm.
 * @param {Array} array The array to shuffle.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Builds the initial deck of roles based on game settings and player count.
 * Assumes settings have been validated by GameValidator.
 * @param {number} playerCount
 * @param {object} activeRolesSettings
 * @param {number} wolfCount
 * @returns {Array<string>} An array of role IDs representing the game deck.
 */
function buildRoleDeck(playerCount, activeRolesSettings, wolfCount) {
  let deck = [];

  // Add Werewolves
  for (let i = 0; i < wolfCount; i++) {
    deck.push(ROLE_IDS.WEREWOLF);
  }

  // Add active special roles
  roleRegistry.getAllRoles().forEach((role) => {
    // Werewolves and Villagers are handled separately
    if (role.id === ROLE_IDS.WEREWOLF || role.id === ROLE_IDS.VILLAGER) {
      return;
    }

    if (activeRolesSettings[role.id]) {
      if (role.id === ROLE_IDS.MASON) {
        deck.push(ROLE_IDS.MASON, ROLE_IDS.MASON); // Masons come in pairs
      } else {
        deck.push(role.id);
      }
    }
  });

  // Fill remaining slots with Villagers
  const remainingSlots = playerCount - deck.length;
  for (let i = 0; i < remainingSlots; i++) {
    deck.push(ROLE_IDS.VILLAGER);
  }

  // Ensure deck size matches player count (should be true if GameValidator worked)
  if (deck.length !== playerCount) {
    console.warn(
      `Role deck size mismatch! Expected ${playerCount}, got ${deck.length}. This indicates a potential GameValidator issue.`,
    );
    // Attempt to recover by trimming or padding if necessary, though this shouldn't happen.
    while (deck.length > playerCount) {
      deck.pop(); // Remove extra roles (likely villagers if validation failed)
    }
    while (deck.length < playerCount) {
      deck.push(ROLE_IDS.VILLAGER); // Add villagers if short
    }
  }

  return deck;
}

/**
 * Assigns roles to players at the start of the game by building a deck
 * from the active roles in settings and dealing them out.
 * Assumes settings have been validated by GameValidator prior to calling.
 * @param {Array<object>} players - The list of player objects.
 * @param {object} settings - The game settings.
 * @returns {Array<object>} The updated list of players with assigned roles.
 */
export function assignRoles(players, settings) {
  // Build the deck of roles based on current settings and player count
  let deck = buildRoleDeck(players.length, settings.activeRoles, settings.wolfCount);

  // Shuffle the deck to randomize role assignment.
  shuffleArray(deck);

  // Assign the shuffled roles to players.
  return players.map((p) => ({
    ...p,
    role: deck.pop(), // Pop from shuffled deck, guaranteed to exist if deck was built correctly
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
    // Get the role info to copy team and alignment
    const newRole = roleRegistry.getRole(chosenTarget.role);

    // Return a new players array with the doppelganger's role, team, and alignment updated
    return players.map((p) => {
      if (p.id === doppelganger.id) {
        return {
          ...p,
          role: chosenTarget.role,
          alignment: newRole?.alignment ?? p.alignment,
          team: newRole?.team ?? p.team,
        };
      }
      return p;
    });
  }
  return players; // No transformation or player not found, return original players
}

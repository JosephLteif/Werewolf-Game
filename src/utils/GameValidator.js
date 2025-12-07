import { ROLE_IDS } from '../constants/roleIds';

export class GameValidator {
  /**
   * Validates if the game can start with the current players and settings.
   * @param {Array} players - List of players in the lobby
   * @param {Object} settings - Game settings (wolfCount, specialRoles)
   * @returns {Object} result - { isValid: boolean, errors: string[] }
   */
  static validate(players, settings) {
    const errors = [];

    // 1. Check minimum player count
    if (!players || players.length < 3) {
      errors.push('Game requires at least 3 players to start.');
    }

    // 2. Validate settings existence
    if (!settings) {
      errors.push('Game settings are missing.');
      return { isValid: false, errors };
    }

    const { wolfCount = 0, activeRoles = {} } = settings;

    // 3. Check wolf count
    if (wolfCount < 1) {
      errors.push('There must be at least 1 Werewolf.');
    }

    // 4. Calculate required slots
    let requiredSlots = parseInt(wolfCount);

    // Sum up active roles
    Object.entries(activeRoles).forEach(([roleId, isSelected]) => {
      if (isSelected) {
        if (roleId === ROLE_IDS.MASON) {
          requiredSlots += 2; // Masons always come in pairs
        } else {
          requiredSlots += 1;
        }
      }
    });

    // 5. Check if we have enough players for the roles
    if (players && requiredSlots > players.length) {
      errors.push(
        `Not enough players for selected roles. Required: ${requiredSlots}, Available: ${players.length}`
      );
    }

    // 6. Check if there are too many wolves
    if (players && wolfCount >= players.length / 2) {
      errors.push(`Too many wolves! (Must be less than ${Math.ceil(players.length / 2)})`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

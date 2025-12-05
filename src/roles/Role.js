/**
 * Base class for all ROLE_IDS.
 */
export class Role {
  constructor() {
    this.id = 'unknown';
    this.name = 'Unknown';
    this.icon = null;
    this.description = '';
    this.alignment = null;
    this.team = null; // Should be a Team instance
    this.weight = 0;
    this.nightPriority = 100;
  }

  /**
   * Process a night action for this role.
   * @param {Object} _gameState - The current game state.
   * @param {Object} _player - The player performing the action.
   * @param {any} _action - The action payload.
   * @returns {Object} - Updates to the night actions state.
   */
  processNightAction() {
    // Default implementation does nothing
    return {};
  }

  /**
   * Checks if this role wakes up during the specified phase.
   * @param {string} phase - The current night phase.
   * @returns {boolean}
   */
  isWakeUpPhase() {
    return false;
  }

  /**
   * Returns the night phase associated with this role, if any.
   * @returns {string|null}
   */
  getNightPhase() {
    return null;
  }

  /**
   * Returns the UI configuration for this role's night action screen.
   * @param {object} context - The context for applying the outcome.
   * @param {object} context.gameState - The current game state.
   * @param {object[]} context.players - The list of all players.
   * @returns {object} - Props for NightActionScreen.
   */
  getNightScreenConfig(_context) {
    return {
      title: 'Perform Your Action',
      subtitle: 'Select a player to target.',
      color: 'purple',
      multiSelect: false,
      maxSelect: 1,
      canSkip: true,
    };
  }

  /**
   * Applies the outcome of the night action for this role.
   * This is where effects like kills, saves, and checks are applied.
   * @param {object} context - The context for applying the outcome.
   * @param {object} context.gameState - The current game state.
   * @param {object} context.nightActions - The resolved night actions.
   * @param {object[]} context.players - The list of all players.
   * @param {object[]} context.deaths - An array to accumulate deaths during the night.
   */
  applyNightOutcome(/*{ gameState, nightActions, players, deaths }*/) {
    // Default: do nothing
  }

  /**
   * Gets the voting weight of a player with this role.
   * @param {object} _gameState - The current game state.
   * @returns {number} - The vote weight.
   */
  getVoteWeight(_gameState) {
    return 1;
  }

  /**
   * A hook that is called when a player with this role dies.
   * @param {object} context - The context for the death event.
   * @param {string} context.gameId - The ID of the game.
   * @param {object} context.player - The player who died.
   * @param {object} context.gameState - The current game state.
   * @returns {Promise<void>}
   */
  async onDeath(_context) {
    // Default: do nothing
  }

  /**
   * A hook that is called when any player dies. Roles that need to react to other players' deaths
   * (e.g., Doppelganger) can override this.
   * @param {object} context - The context for the death event.
   * @param {object} context.deadPlayer - The player who just died.
   * @param {object[]} context.players - The current list of players (including the dead one).
   * @param {object} context.gameState - The current game state.
   * @returns {object[]|null} - An updated players array if a change occurred, otherwise null.
   */
  onAnyPlayerDeath(_context) {
    return null;
  }

  /**
   * Checks if a player with this role is a winner based on the winning teams.
   * Can be overridden by specific roles for more complex win conditions.
   * @param {object} _player - The player instance.
   * @param {string[]} _winningTeams - An array of winning team IDs (e.g., ['VILLAGERS', 'WEREWOLVES']).
   * @param {object} _context - Additional game context (e.g., { lovers, settings }).
   * @returns {boolean}
   */
  checkWin(_player, _winningTeams, _context) {
    // Default: no special win conditions for the base role.
    // Specific roles should override this for complex win conditions.
    return false;
  }
}


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
}

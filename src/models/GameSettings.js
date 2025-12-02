import { CUPID_FATES } from '../constants/teams.js';
import { TANNER_WIN_STRATEGIES } from '../constants/tannerWinStrategies.js';
import { roleRegistry } from '../roles/RoleRegistry.js';

export class GameSettings {
  constructor(settings = {}) {
    this.wolfCount = settings.wolfCount || 1;
    this.actionWaitTime = settings.actionWaitTime || 30;
    this.cupidFateOption = settings.cupidFateOption || CUPID_FATES.SELFLESS;
    this.tannerWinStrategy = settings.tannerWinStrategy || TANNER_WIN_STRATEGIES.CONTINUE_GAME;
    this.activeRoles = settings.activeRoles || {};

    // Ensure defaults for activeRoles
    roleRegistry.getAllRoles().forEach((role) => {
      if (this.activeRoles[role.id] === undefined) {
        this.activeRoles[role.id] = false;
      }
    });
  }

  isRoleActive(roleId) {
    return !!this.activeRoles[roleId];
  }

  getSettings() {
    return {
      wolfCount: this.wolfCount,
      actionWaitTime: this.actionWaitTime,
      cupidFateOption: this.cupidFateOption,
      tannerWinStrategy: this.tannerWinStrategy,
      activeRoles: this.activeRoles,
    };
  }
}

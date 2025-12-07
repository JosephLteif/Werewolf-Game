import { Role } from '../Role';
import { PHASES } from '../../constants/phases';
import { Heart } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';
import { CUPID_FATES } from '../../constants/index.js';

export class Cupid extends Role {
  constructor() {
    super();
    this.id = 'cupid';
    this.name = 'Cupid';
    this.icon = Heart;
    this.description = 'Link two players. If one dies, both die.';
    this.alignment = ALIGNMENTS.NEUTRAL;
    this.team = Teams.VILLAGER; // Neutral, but starts as villager alignment
    this.weight = -2;
    this.nightPriority = 2;
  }

  getNightScreenConfig() {
    return {
      title: "Cupid's Arrow",
      subtitle: 'Choose two players to link with love for the entire game.',
      color: 'purple',
      multiSelect: true,
      maxSelect: 2,
      canSkip: false,
    };
  }

  isWakeUpPhase(phase) {
    return phase === PHASES.NIGHT_CUPID;
  }

  getNightPhase() {
    return PHASES.NIGHT_CUPID;
  }

  processNightAction(_gameState, _player, action) {
    if (action.type === 'cupidLinks') {
      return {
        cupidLinks: action.targetIds, // Expecting array of 2 IDs
      };
    }
    return {};
  }

  /**
   * Cupid's win condition depends on the Lovers and game settings.
   * If the 'Third Wheel' rule is in play, Cupid wins with the Lovers.
   * Otherwise, Cupid wins with their original team (Villagers).
   * @param {object} player - The player instance.
   * @param {string[]} winningTeams - An array of winning team IDs.
   * @param {object} context - Additional game context.
   * @returns {boolean}
   */
  checkWin(player, winningTeams, context) {
    // If Lovers win and the "Third Wheel" fate is active, Cupid also wins.
    if (
      (winningTeams.includes('LOVERS') || winningTeams.includes('CUPID')) &&
      context.settings?.cupidFateOption === CUPID_FATES.THIRD_WHEEL
    ) {
      return true;
    }

    // Otherwise, Cupid wins with their original team (default behavior).
    return super.checkWin(player, winningTeams, context);
  }
}

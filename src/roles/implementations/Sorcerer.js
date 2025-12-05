import { Role } from '../Role';
import { PHASES } from '../../constants/phases';
import { Sparkles } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';

export class Sorcerer extends Role {
  constructor() {
    super();
    this.id = 'sorcerer';
    this.name = 'Sorcerer';
    this.icon = Sparkles;
    this.description = 'Find the Seer. You win with the Werewolves.';
    this.alignment = ALIGNMENTS.EVIL;
    this.team = Teams.WEREWOLF;
    this.weight = -3;
    this.nightPriority = 25;
  }

  isWakeUpPhase(phase) {
    return phase === PHASES.NIGHT_SORCERER;
  }

  getNightPhase() {
    return PHASES.NIGHT_SORCERER;
  }

  processNightAction(_gameState, _player, action) {
    if (action.type === 'sorcererCheck') {
      return {
        sorcererCheck: action.targetId,
      };
    }
    return {};
  }

  /**
   * The Sorcerer wins with the Werewolves, but only if they have successfully identified a Seer.
   * @param {object} player - The player instance.
   * @param {string[]} winningTeams - An array of winning team IDs.
   * @returns {boolean}
   */
  checkWin(player, winningTeams) {
    return winningTeams.includes(this.team.id) && !!player.foundSeer;
  }
}

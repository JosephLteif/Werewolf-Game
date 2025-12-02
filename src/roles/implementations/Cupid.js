import { Role } from '../Role';
import { PHASES } from '../../constants/phases';
import { Heart } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';

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
}

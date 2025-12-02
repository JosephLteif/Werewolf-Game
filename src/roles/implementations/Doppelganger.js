import { Role } from '../Role';
import { PHASES } from '../../constants/phases';
import { Users } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';

export class Doppelganger extends Role {
  constructor() {
    super();
    this.id = 'doppelganger';
    this.name = 'Doppelgänger';
    this.icon = Users;
    this.description = 'Choose a player night 1. If they die, you become their role.';
    this.alignment = ALIGNMENTS.NEUTRAL;
    this.team = Teams.VILLAGER; // Neutral, starts as villager alignment
    this.weight = 0;
  }

  isWakeUpPhase(phase) {
    return phase === PHASES.NIGHT_DOPPELGANGER;
  }

  getNightPhase() {
    return PHASES.NIGHT_DOPPELGANGER;
  }

  processNightAction(_gameState, player, action) {
    if (action.type === 'doppelgangerCopy') {
      return {
        doppelgangerCopy: action.targetId,
        doppelgangerPlayerId: player.id,
      };
    }
    return {};
  }
}

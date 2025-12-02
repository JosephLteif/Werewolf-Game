import { Role } from '../Role';
import { PHASES } from '../../constants/phases';
import { Ghost } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';

export class Minion extends Role {
  constructor() {
    super();
    this.id = 'minion';
    this.name = 'Minion';
    this.icon = Ghost;
    this.description = "You know the wolves. They don't know you.";
    this.alignment = ALIGNMENTS.EVIL;
    this.team = Teams.WEREWOLF;
    this.weight = -3;
  }

  isWakeUpPhase(phase) {
    return phase === PHASES.NIGHT_MINION;
  }

  getNightPhase() {
    return PHASES.NIGHT_MINION;
  }

  // Minion just observes, no action to process
}

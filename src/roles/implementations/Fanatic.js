import { Role } from '../Role';
import { PHASES } from '../../constants/phases';
import { Ghost } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';

export class Fanatic extends Role {
  constructor() {
    super();
    this.id = 'fanatic';
    this.name = 'Fanatic';
    this.icon = Ghost;
    this.description = "You know the wolves. They don't know you.";
    this.alignment = ALIGNMENTS.EVIL;
    this.team = Teams.WEREWOLF;
    this.weight = -3;
    this.nightPriority = 27;
  }

  getVisibleTeammates(_currentPlayer, allPlayers, _gameState) {
    // Fanatics see Werewolves
    return allPlayers.filter((p) => p.role === 'werewolf');
  }

  isWakeUpPhase(phase) {
    return phase === PHASES.NIGHT_FANATIC;
  }

  getNightPhase() {
    return PHASES.NIGHT_FANATIC;
  }

  // Fanatic just observes, no action to process
}
